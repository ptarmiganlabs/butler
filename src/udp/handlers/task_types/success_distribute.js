// Load global variables and functions
import globals from '../../../globals.js';
import getDistributeTaskExecutionResults from '../../../qrs_util/distribute_task_execution_results.js';
import getTaskTags from '../../../qrs_util/task_tag_util.js';
import { postDistributeTaskSuccessNotificationInfluxDb } from '../../../lib/influxdb/task_success.js';

/**
 * Handler for successful distribute tasks.
 *
 * Processes successful distribute task completions by:
 * - Determining if task should be stored in InfluxDB (based on config)
 * - Getting task execution results and duration (if storing to InfluxDB)
 * - Posting metrics to InfluxDB (if enabled)
 *
 * Note: Distribute tasks do not have associated apps, so app-related metadata is not collected.
 * Script logs are NOT retrieved for successful distribute tasks as they are only
 * needed for failure analysis and troubleshooting.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with distribution success details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for distribute tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for distribute tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS containing:
 *   - taskType: Type of task (3=Distribute)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<boolean>} Returns true if processing was successful, false otherwise
 */
export const handleSuccessDistributeTask = async (msg, taskMetadata) => {
    try {
        const distributeTaskId = msg[5];

        globals.logger.verbose(
            `[QSEOW] DISTRIBUTE TASK SUCCESS: Distribute task succeeded: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${distributeTaskId}`,
        );

        globals.logger.info(`[QSEOW] DISTRIBUTE TASK SUCCESS: Distribute task ${msg[2]} (${distributeTaskId}) completed successfully.`);

        // Determine if this task should be stored in InfluxDB
        let storeInInfluxDb = false;
        if (
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.distributeTaskSuccess.enable') === true
        ) {
            storeInInfluxDb = true;
        }

        // Note: Script log is NOT retrieved for successful distribute tasks as per design
        // Script logs should only be retrieved when needed (failures, aborts)

        // Get tags for the task that completed successfully
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${distributeTaskId}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get distribute task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        if (storeInInfluxDb) {
            // Get results from last distribute task execution
            let taskInfo;
            taskInfo = await getDistributeTaskExecutionResults(distributeTaskId);

            if (!taskInfo) {
                globals.logger.warn(
                    `[QSEOW] DISTRIBUTE TASK SUCCESS: Unable to get task info for distribute task ${distributeTaskId}. Not storing task info in InfluxDB`,
                );
                return false;
            }
            globals.logger.verbose(
                `[QSEOW] DISTRIBUTE TASK SUCCESS: Task info for distribute task ${distributeTaskId}: ${JSON.stringify(taskInfo, null, 2)}`,
            );

            // Get task tags so they can be included in data sent to InfluxDB
            let taskTagsForInflux = [];

            // Get tags for the task that finished successfully
            taskTagsForInflux = await getTaskTags(distributeTaskId);
            globals.logger.verbose(`[QSEOW] Tags for task ${distributeTaskId}: ${JSON.stringify(taskTagsForInflux, null, 2)}`);

            // Post to InfluxDB when a distribute task has finished successfully
            if (
                globals.config.has('Butler.influxDb.enable') &&
                globals.config.get('Butler.influxDb.enable') === true &&
                globals.config.has('Butler.influxDb.distributeTaskSuccess.enable') &&
                globals.config.get('Butler.influxDb.distributeTaskSuccess.enable') === true
            ) {
                globals.logger.verbose(
                    `[QSEOW] DISTRIBUTE TASK SUCCESS: Storing distribute task success info in InfluxDB for task ID ${distributeTaskId}`,
                );

                postDistributeTaskSuccessNotificationInfluxDb({
                    host: msg[1],
                    user: msg[4].replace(/\\/g, '/'),
                    taskName: msg[2],
                    taskId: distributeTaskId,
                    logTimeStamp: msg[7],
                    logLevel: msg[8],
                    executionId: msg[9],
                    logMessage: msg[10],
                    taskTags: taskTagsForInflux,
                    qs_taskTags: taskTags,
                    qs_taskCustomProperties: taskCustomProperties,
                    qs_taskMetadata: taskMetadata,
                    taskInfo: taskInfo,
                });
            } else {
                globals.logger.verbose(`[QSEOW] DISTRIBUTE TASK SUCCESS: Not storing task info in InfluxDB`);
            }
        } else {
            globals.logger.verbose(`[QSEOW] DISTRIBUTE TASK SUCCESS: Not storing task info in InfluxDB`);
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] DISTRIBUTE TASK SUCCESS: Error handling successful distribute task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] DISTRIBUTE TASK SUCCESS: Stack trace: ${err.stack}`);
        return false;
    }
};
