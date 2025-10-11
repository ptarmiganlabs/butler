// Load global variables and functions
import globals from '../../../globals.js';
import getPreloadTaskExecutionResults from '../../../qrs_util/preload_task_execution_results.js';
import getTaskTags from '../../../qrs_util/task_tag_util.js';
import { postPreloadTaskSuccessNotificationInfluxDb } from '../../../lib/influxdb/task_success.js';
import { sendPreloadTaskSuccessNotificationEmail } from '../../../lib/qseow/smtp/index.js';

/**
 * Handler for successful preload tasks.
 *
 * Processes successful preload task completions by:
 * - Determining if task should be stored in InfluxDB (based on config)
 * - Getting task execution results and duration (if storing to InfluxDB)
 * - Posting metrics to InfluxDB (if enabled)
 *
 * Note: Preload tasks do not have associated apps in the same way as reload tasks,
 * so app-related metadata is not collected.
 * Script logs are NOT retrieved for successful preload tasks as they are only
 * needed for failure analysis and troubleshooting.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with preload success details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for preload tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for preload tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS containing:
 *   - taskType: Type of task (4=Preload)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<boolean>} Returns true if processing was successful, false otherwise
 */
export const handleSuccessPreloadTask = async (msg, taskMetadata) => {
    try {
        const preloadTaskId = msg[5];

        globals.logger.verbose(
            `[QSEOW] PRELOAD TASK SUCCESS: Preload task succeeded: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${preloadTaskId}`,
        );

        globals.logger.info(`[QSEOW] PRELOAD TASK SUCCESS: Preload task ${msg[2]} (${preloadTaskId}) completed successfully.`);

        // Determine if this task should be stored in InfluxDB
        let storeInInfluxDb = false;
        if (
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.preloadTaskSuccess.enable') === true
        ) {
            storeInInfluxDb = true;
        }

        // Note: Script log is NOT retrieved for successful preload tasks as per design
        // Script logs should only be retrieved when needed (failures, aborts)

        // Get tags for the task that completed successfully
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${preloadTaskId}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get preload task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        if (storeInInfluxDb) {
            // Get results from last preload task execution
            const taskInfo = await getPreloadTaskExecutionResults(preloadTaskId);

            if (!taskInfo) {
                globals.logger.warn(
                    `[QSEOW] PRELOAD TASK SUCCESS: Unable to get task info for preload task ${preloadTaskId}. Not storing task info in InfluxDB`,
                );
                return false;
            }

            globals.logger.verbose(
                `[QSEOW] PRELOAD TASK SUCCESS: Task info for preload task ${preloadTaskId}: ${JSON.stringify(taskInfo, null, 2)}`,
            );

            // Get task tags so they can be included in data sent to InfluxDB
            let taskTagsForInflux = [];

            // Get tags for the task that finished successfully
            taskTagsForInflux = await getTaskTags(preloadTaskId);
            globals.logger.verbose(`[QSEOW] Tags for task ${preloadTaskId}: ${JSON.stringify(taskTagsForInflux, null, 2)}`);

            // Post to InfluxDB when a preload task has finished successfully
            if (
                globals.config.has('Butler.influxDb.enable') &&
                globals.config.has('Butler.influxDb.preloadTaskSuccess.enable') &&
                globals.config.get('Butler.influxDb.enable') === true &&
                globals.config.get('Butler.influxDb.preloadTaskSuccess.enable') === true
            ) {
                postPreloadTaskSuccessNotificationInfluxDb({
                    host: msg[1],
                    user: msg[4].replace(/\\/g, '/'),
                    taskName: msg[2],
                    taskId: preloadTaskId,
                    logTimeStamp: msg[7],
                    logLevel: msg[8],
                    executionId: msg[9],
                    logMessage: msg[10],
                    qs_taskTags: taskTagsForInflux,
                    qs_taskCustomProperties: taskCustomProperties,
                    taskInfo,
                    qs_taskMetadata: taskMetadata,
                });

                globals.logger.info(
                    `[QSEOW] PRELOAD TASK SUCCESS: Preload info for preload task ${preloadTaskId}, "${msg[2]}" stored in InfluxDB`,
                );
            }
        } else {
            globals.logger.verbose(`[QSEOW] PRELOAD TASK SUCCESS: Not storing task info in InfluxDB`);
        }

        // Send email notification for successful preload task
        if (
            globals.config.has('Butler.emailNotification.preloadTaskSuccess.enable') &&
            globals.config.get('Butler.emailNotification.preloadTaskSuccess.enable') === true
        ) {
            // Get task execution results if not already retrieved for InfluxDB
            let taskInfo = null;
            if (storeInInfluxDb) {
                // Task info was already retrieved above for InfluxDB
                taskInfo = await getPreloadTaskExecutionResults(preloadTaskId);
            } else {
                // Need to get task info specifically for email
                taskInfo = await getPreloadTaskExecutionResults(preloadTaskId);
            }

            if (taskInfo) {
                sendPreloadTaskSuccessNotificationEmail({
                    host: msg[1],
                    user: msg[4].replace(/\\/g, '/'),
                    taskName: msg[2],
                    taskId: preloadTaskId,
                    logTimeStamp: msg[7],
                    logLevel: msg[8],
                    executionId: msg[9],
                    logMessage: msg[10],
                    qs_taskTags: taskTags,
                    qs_taskCustomProperties: taskCustomProperties,
                    taskInfo,
                    qs_taskMetadata: taskMetadata,
                });
            } else {
                globals.logger.warn(
                    `[QSEOW] PRELOAD TASK SUCCESS: Unable to get task info for preload task ${preloadTaskId}. Not sending email notification`,
                );
            }
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] PRELOAD TASK SUCCESS: Error handling successful preload task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] PRELOAD TASK SUCCESS: Stack trace: ${err.stack}`);
        return false;
    }
};
