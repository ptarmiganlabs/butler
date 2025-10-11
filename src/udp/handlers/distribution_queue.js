// Load global variables and functions
import globals from '../../globals.js';
import { DISTRIBUTION_QUEUE_POLL_INTERVAL_MS, DISTRIBUTION_QUEUE_MAX_AGE_MS } from '../../constants.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';
import { handleSuccessDistributeTask } from './task_types/success_distribute.js';
import { handleFailedDistributeTask } from './task_types/failed_distribute.js';

/**
 * Queue for managing distribution tasks that are not yet in a final state.
 *
 * When a distribution task UDP event arrives, the task may still be in an intermediate state
 * (e.g., DistributionQueue=13, DistributionRunning=14) because the distribution to cloud
 * hasn't completed yet. This queue tracks such tasks and periodically checks their status
 * until they reach a final state.
 *
 * Final states: 6 (Aborted), 7 (FinishedSuccess), 8 (FinishedFail), 11 (Error)
 * Intermediate states: 1 (Triggered), 2 (Started), 3 (Queued), 4 (AbortInitiated),
 *                      5 (Aborting), 10 (Retry), 13 (DistributionQueue), 14 (DistributionRunning)
 */
class DistributionTaskQueue {
    /**
     * Initialize the distribution task queue.
     * @param {number} pollIntervalMs - Interval in milliseconds to check queued tasks (default from constants)
     * @param {number} maxAgeMs - Maximum time in milliseconds a task can remain in queue (default from constants)
     */
    constructor(pollIntervalMs = DISTRIBUTION_QUEUE_POLL_INTERVAL_MS, maxAgeMs = DISTRIBUTION_QUEUE_MAX_AGE_MS) {
        this.queue = new Map(); // taskId -> { msg, taskMetadata, queuedAt, lastCheckedAt, checkCount }
        this.pollIntervalMs = pollIntervalMs;
        this.maxAgeMs = maxAgeMs;
        this.pollingTimer = null;
        this.isPolling = false;
    }

    /**
     * Add a distribution task to the queue for periodic status checking.
     * @param {string} taskId - The task ID
     * @param {Array<string>} msg - The UDP message array
     * @param {Object} taskMetadata - The task metadata from QRS
     */
    add(taskId, msg, taskMetadata) {
        const now = Date.now();

        if (this.queue.has(taskId)) {
            globals.logger.debug(`[QSEOW] DISTRIBUTION QUEUE: Task ${taskId} is already in queue, updating with latest data`);
        }

        this.queue.set(taskId, {
            msg,
            taskMetadata,
            queuedAt: now,
            lastCheckedAt: now,
            checkCount: 0,
        });

        globals.logger.info(`[QSEOW] DISTRIBUTION QUEUE: Added task ${msg[2]} (${taskId}) to queue. Queue size: ${this.queue.size}`);

        // Start polling if not already running
        if (!this.isPolling) {
            this.startPolling();
        }
    }

    /**
     * Start the periodic polling timer to check queued tasks.
     */
    startPolling() {
        if (this.isPolling) {
            globals.logger.debug('[QSEOW] DISTRIBUTION QUEUE: Polling already started');
            return;
        }

        this.isPolling = true;
        globals.logger.info(
            `[QSEOW] DISTRIBUTION QUEUE: Starting periodic polling (interval: ${this.pollIntervalMs}ms, max age: ${this.maxAgeMs}ms)`,
        );

        this.pollingTimer = setInterval(async () => {
            await this.checkQueue();
        }, this.pollIntervalMs);
    }

    /**
     * Stop the periodic polling timer.
     */
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
            this.isPolling = false;
            globals.logger.info('[QSEOW] DISTRIBUTION QUEUE: Stopped periodic polling');
        }
    }

    /**
     * Check all queued tasks and process those that have reached a final state or exceeded max age.
     */
    async checkQueue() {
        if (this.queue.size === 0) {
            // No tasks in queue, stop polling
            this.stopPolling();
            return;
        }

        globals.logger.debug(`[QSEOW] DISTRIBUTION QUEUE: Checking ${this.queue.size} queued task(s)`);

        const now = Date.now();
        const tasksToRemove = [];

        for (const [taskId, queuedTask] of this.queue.entries()) {
            try {
                const age = now - queuedTask.queuedAt;

                // Check if task has exceeded max age
                if (age > this.maxAgeMs) {
                    globals.logger.warn(
                        `[QSEOW] DISTRIBUTION QUEUE: Task ${queuedTask.msg[2]} (${taskId}) has been in queue for ${Math.round(age / 1000 / 60)} minutes (max: ${Math.round(this.maxAgeMs / 1000 / 60)} minutes). Removing from queue.`,
                    );
                    tasksToRemove.push(taskId);
                    continue;
                }

                // Get fresh task metadata to check current status
                const taskMetadata = await getTaskMetadata(taskId);
                if (taskMetadata === false) {
                    globals.logger.warn(
                        `[QSEOW] DISTRIBUTION QUEUE: Could not get task metadata for task ${taskId}. Will retry on next check.`,
                    );
                    queuedTask.lastCheckedAt = now;
                    queuedTask.checkCount += 1;
                    continue;
                }

                const executionStatus = taskMetadata?.operational?.lastExecutionResult?.status;
                queuedTask.lastCheckedAt = now;
                queuedTask.checkCount += 1;

                globals.logger.debug(
                    `[QSEOW] DISTRIBUTION QUEUE: Task ${queuedTask.msg[2]} (${taskId}) status: ${executionStatus} (check #${queuedTask.checkCount})`,
                );

                // Check if task has reached a final state
                if (this.isFinalState(executionStatus)) {
                    globals.logger.info(
                        `[QSEOW] DISTRIBUTION QUEUE: Task ${queuedTask.msg[2]} (${taskId}) reached final state ${executionStatus}. Processing and removing from queue.`,
                    );

                    // Process the task based on its final state
                    await this.processCompletedTask(queuedTask.msg, taskMetadata, executionStatus);

                    tasksToRemove.push(taskId);
                } else {
                    globals.logger.debug(
                        `[QSEOW] DISTRIBUTION QUEUE: Task ${queuedTask.msg[2]} (${taskId}) still in intermediate state ${executionStatus}. Keeping in queue.`,
                    );
                }
            } catch (err) {
                globals.logger.error(`[QSEOW] DISTRIBUTION QUEUE: Error checking task ${taskId}: ${globals.getErrorMessage(err)}`);
                queuedTask.lastCheckedAt = now;
                queuedTask.checkCount += 1;
            }
        }

        // Remove completed tasks from queue
        for (const taskId of tasksToRemove) {
            this.queue.delete(taskId);
        }

        if (tasksToRemove.length > 0) {
            globals.logger.info(
                `[QSEOW] DISTRIBUTION QUEUE: Removed ${tasksToRemove.length} task(s) from queue. Remaining: ${this.queue.size}`,
            );
        }
    }

    /**
     * Check if an execution status represents a final state.
     * @param {number} status - The execution status code
     * @returns {boolean} True if the status is a final state
     */
    isFinalState(status) {
        // Final states: 6 (Aborted), 7 (FinishedSuccess), 8 (FinishedFail), 11 (Error)
        return status === 6 || status === 7 || status === 8 || status === 11;
    }

    /**
     * Check if an execution status represents an intermediate state that should be queued.
     * @param {number} status - The execution status code
     * @returns {boolean} True if the status is an intermediate state
     */
    isIntermediateState(status) {
        // Intermediate states: 1 (Triggered), 2 (Started), 3 (Queued), 4 (AbortInitiated),
        //                      5 (Aborting), 10 (Retry), 13 (DistributionQueue), 14 (DistributionRunning)
        return (
            status === 1 || status === 2 || status === 3 || status === 4 || status === 5 || status === 10 || status === 13 || status === 14
        );
    }

    /**
     * Process a task that has reached a final state.
     * @param {Array<string>} msg - The UDP message array
     * @param {Object} taskMetadata - The task metadata from QRS
     * @param {number} executionStatus - The final execution status
     */
    async processCompletedTask(msg, taskMetadata, executionStatus) {
        try {
            if (executionStatus === 7) {
                // Status 7: FinishedSuccess - Distribution completed successfully
                await handleSuccessDistributeTask(msg, taskMetadata);
            } else if (executionStatus === 6 || executionStatus === 8 || executionStatus === 11) {
                // Status 6: Aborted, 8: FinishedFail, 11: Error - Distribution failed
                await handleFailedDistributeTask(msg, taskMetadata);
            }
        } catch (err) {
            globals.logger.error(`[QSEOW] DISTRIBUTION QUEUE: Error processing completed task ${msg[5]}: ${globals.getErrorMessage(err)}`);
        }
    }

    /**
     * Get the current queue size.
     * @returns {number} Number of tasks currently in the queue
     */
    getQueueSize() {
        return this.queue.size;
    }

    /**
     * Get queue statistics.
     * @returns {Object} Queue statistics including size, oldest task age, etc.
     */
    getQueueStats() {
        const now = Date.now();
        const tasks = Array.from(this.queue.values());

        if (tasks.length === 0) {
            return {
                size: 0,
                oldestTaskAge: 0,
                averageCheckCount: 0,
            };
        }

        const oldestTaskAge = Math.max(...tasks.map((task) => now - task.queuedAt));
        const averageCheckCount = tasks.reduce((sum, task) => sum + task.checkCount, 0) / tasks.length;

        return {
            size: tasks.length,
            oldestTaskAgeMs: oldestTaskAge,
            oldestTaskAgeMinutes: Math.round(oldestTaskAge / 1000 / 60),
            averageCheckCount: Math.round(averageCheckCount * 10) / 10,
        };
    }

    /**
     * Clear all tasks from the queue and stop polling.
     */
    clear() {
        this.queue.clear();
        this.stopPolling();
        globals.logger.info('[QSEOW] DISTRIBUTION QUEUE: Queue cleared');
    }
}

// Create and export a singleton instance
const distributionQueue = new DistributionTaskQueue();

export default distributionQueue;
