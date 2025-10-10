// Load global variables and functions
import globals from '../../globals.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';
import doesTaskExist from '../../qrs_util/does_task_exist.js';
import distributionQueue from './distribution_queue.js';
import { handleSuccessDistributeTask } from './task_types/success_distribute.js';
import { handleFailedDistributeTask } from './task_types/failed_distribute.js';
import { handleAbortedDistributeTask } from './task_types/aborted_distribute.js';

/**
 * Handler for distribution task completion events.
 *
 * This function processes UDP messages for completed distribution tasks from the Qlik Sense scheduler.
 * It validates that the task is actually a distribute task, retrieves task metadata,
 * and routes to the appropriate outcome-specific handler (success, failure, or abort).
 *
 * Distribution tasks copy Qlik Sense apps to target streams or spaces and do not have
 * associated app IDs or script logs like reload tasks do.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with distribution completion details:
 *   - msg[0]: Message type identifier (e.g., '/scheduler-distribute/')
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for distribute tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for distribute tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message containing outcome information
 * @returns {Promise<void|boolean>} Returns false if task doesn't exist or is not a distribute task, void otherwise
 */
const distributionEnded = async (msg) => {
    try {
        const taskId = msg[5];

        // Does task ID exist in Sense?
        const taskExists = await doesTaskExist(taskId);
        if (taskExists.exists !== true) {
            globals.logger.warn(`[QSEOW] DISTRIBUTION ENDED: Task ID ${taskId} does not exist in Sense`);
            return false;
        }

        // Get task metadata to determine task type
        const taskMetadata = await getTaskMetadata(taskId);
        if (taskMetadata === false) {
            globals.logger.error(`[QSEOW] DISTRIBUTION ENDED: Could not get task metadata for task ${taskId}. Aborting further processing`);
            return;
        }

        // Verify this is actually a distribute task
        // Task types: 0=Reload, 1=ExternalProgram, 2=UserSync, 3=Distribute, 4=Preload
        const taskType = taskMetadata?.taskType;

        if (taskType !== 3) {
            const taskTypeStr =
                taskType === 0
                    ? 'reload'
                    : taskType === 1
                      ? 'externalprogram'
                      : taskType === 2
                        ? 'usersync'
                        : taskType === 4
                          ? 'preload'
                          : 'unknown';

            globals.logger.warn(
                `[QSEOW] DISTRIBUTION ENDED: Task ${msg[2]} (${taskId}) is not a distribute task (type=${taskType}, typeStr=${taskTypeStr}). This handler only processes distribute tasks.`,
            );
            return false;
        }

        globals.logger.debug(`[QSEOW] DISTRIBUTION ENDED: Processing distribute task ${msg[2]} (${taskId})`);

        // Determine the outcome of the distribution task from taskMetadata.operational.lastExecutionResult.status
        // Possible status values:
        // 0: NeverStarted, 1: Triggered, 2: Started, 3: Queued, 4: AbortInitiated, 5: Aborting
        // 6: Aborted, 7: FinishedSuccess, 8: FinishedFail, 9: Skipped, 10: Retry
        // 11: Error, 12: Reset, 13: DistributionQueue, 14: DistributionRunning
        const executionStatus = taskMetadata?.operational?.lastExecutionResult?.status;

        globals.logger.debug(`[QSEOW] DISTRIBUTION ENDED: Task ${msg[2]} (${taskId}) execution status: ${executionStatus}`);

        // Route to appropriate handler based on task's execution status
        if (executionStatus === 7) {
            // Status 7: FinishedSuccess - Distribution completed successfully
            await handleSuccessDistributeTask(msg, taskMetadata);
        } else if (executionStatus === 6 || executionStatus === 8 || executionStatus === 11) {
            // Status 6: Aborted, 8: FinishedFail, 11: Error - Distribution failed
            await handleFailedDistributeTask(msg, taskMetadata);
        } else if (distributionQueue.isIntermediateState(executionStatus)) {
            // Intermediate states: 1, 2, 3, 4, 5, 10, 13, 14
            // Task is not yet in final state - add to queue for periodic checking
            globals.logger.info(
                `[QSEOW] DISTRIBUTION ENDED: Task ${msg[2]} (${taskId}) is in intermediate state ${executionStatus}. Adding to queue for periodic status checking.`,
            );
            distributionQueue.add(taskId, msg, taskMetadata);
        } else {
            // Unknown or unexpected status - log for investigation
            globals.logger.warn(
                `[QSEOW] DISTRIBUTION ENDED: Unexpected execution status ${executionStatus} for distribute task ${msg[2]} (${taskId}). Log message: ${msg[10]}`,
            );
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] DISTRIBUTION ENDED: Error processing distribution completion event: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] DISTRIBUTION ENDED: Stack trace: ${err.stack}`);
    }
};

export default distributionEnded;
