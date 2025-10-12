// Load global variables and functions
import globals from '../../../globals.js';
import { GLOBALS_INIT_CHECK_INTERVAL_MS } from '../../../constants.js';
import getExternalProgramTaskExecutionResults from '../../../qrs_util/externalprogram_task_execution_results.js';
import getTaskTags from '../../../qrs_util/task_tag_util.js';
import { postExternalProgramTaskSuccessNotificationInfluxDb } from '../../../lib/influxdb/task_success.js';

/**
 * Handler for successful external program tasks.
 *
 * Processes successful external program task completions by:
 * - Determining if task should be stored in InfluxDB (based on config)
 * - Getting task execution results and duration (if storing to InfluxDB)
 * - Posting metrics to InfluxDB (if enabled)
 *
 * Note: External program tasks do not have associated apps, so app-related metadata is not collected.
 * Script logs are NOT retrieved for successful external programs as they are only
 * needed for failure analysis and troubleshooting.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with external program success details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for external program tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for external program tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS containing:
 *   - taskType: Type of task (1=ExternalProgram)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<boolean>} Returns true if processing was successful, false otherwise
 */
export const handleSuccessExternalProgramTask = async (msg, taskMetadata) => {
    try {
        const externalProgramTaskId = msg[5];

        globals.logger.verbose(
            `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: External program task succeeded: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${externalProgramTaskId}`,
        );

        globals.logger.info(
            `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: External program task ${msg[2]} (${externalProgramTaskId}) completed successfully.`,
        );

        // Determine if this task should be stored in InfluxDB
        let storeInInfluxDb = false;
        if (
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.externalProgramTaskSuccess.enable') === true
        ) {
            storeInInfluxDb = true;
        }

        // Note: Script log is NOT retrieved for successful external programs as per design
        // Script logs should only be retrieved when needed (failures, aborts)

        // Get tags for the task that completed successfully
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${externalProgramTaskId}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get external program task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        if (storeInInfluxDb) {
            // Get results from last external program task execution
            // It may take a seconds or two from the finished-successfully log message is written until the execution results are available via the QRS.
            // Specifically, it may take a while for the last "FinishedSuccess" message to appear in the executionDetails array.
            //
            // Try at most five times, with a 1 second delay between each attempt.
            // Check if the message property of the last entry in the taskInfo.executionDetailsSorted array is "Changing task state from Started to FinishedSuccess"
            // Then give up and don't store anything in InfluxDB, but show a log warning.
            let taskInfo;
            let retryCount = 0;
            while (retryCount < 5) {
                taskInfo = await getExternalProgramTaskExecutionResults(externalProgramTaskId);

                if (
                    taskInfo?.executionDetailsSorted[taskInfo.executionDetailsSorted.length - 1]?.message ===
                    'Changing task state from Started to FinishedSuccess'
                ) {
                    // Is duration longer than 0 seconds?
                    // I.e. is executionDuration.hours, executionDuration.minutes or executionDuration.seconds > 0?
                    // Warn if not, as this is likely caused by the QRS not having updated the execution details yet
                    if (
                        taskInfo.executionDuration.hours === 0 &&
                        taskInfo.executionDuration.minutes === 0 &&
                        taskInfo.executionDuration.seconds === 0
                    ) {
                        globals.logger.warn(
                            `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Task info for external program task ${externalProgramTaskId} retrieved successfully after ${retryCount} attempts, but duration is 0 seconds. This is likely caused by the QRS not having updated the execution details yet.`,
                        );
                    }

                    globals.logger.debug(
                        `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Task info for external program task ${externalProgramTaskId} retrieved successfully after ${retryCount} attempts`,
                    );
                    break;
                }

                retryCount += 1;

                globals.logger.verbose(
                    `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Unable to get task info for external program task ${externalProgramTaskId}. Attempt ${retryCount} of 5. Waiting ${GLOBALS_INIT_CHECK_INTERVAL_MS}ms before trying again`,
                );

                await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
            }

            if (
                !taskInfo ||
                taskInfo?.executionDetailsSorted[taskInfo.executionDetailsSorted.length - 1]?.message !==
                    'Changing task state from Started to FinishedSuccess'
            ) {
                globals.logger.warn(
                    `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Unable to get task info for external program task ${externalProgramTaskId}. Not storing task info in InfluxDB`,
                );
                return false;
            }
            globals.logger.verbose(
                `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Task info for external program task ${externalProgramTaskId}: ${JSON.stringify(taskInfo, null, 2)}`,
            );

            // Get task tags so they can be included in data sent to InfluxDB
            let taskTagsForInflux = [];

            // Get tags for the task that finished successfully
            taskTagsForInflux = await getTaskTags(externalProgramTaskId);
            globals.logger.verbose(`[QSEOW] Tags for task ${externalProgramTaskId}: ${JSON.stringify(taskTagsForInflux, null, 2)}`);

            // Post to InfluxDB when an external program task has finished successfully
            if (
                globals.config.has('Butler.influxDb.enable') &&
                globals.config.has('Butler.influxDb.externalProgramTaskSuccess.enable') &&
                globals.config.get('Butler.influxDb.enable') === true &&
                globals.config.get('Butler.influxDb.externalProgramTaskSuccess.enable') === true
            ) {
                postExternalProgramTaskSuccessNotificationInfluxDb({
                    host: msg[1],
                    user: msg[4].replace(/\\/g, '/'),
                    taskName: msg[2],
                    taskId: externalProgramTaskId,
                    logTimeStamp: msg[7],
                    logLevel: msg[8],
                    executionId: msg[9],
                    logMessage: msg[10],
                    taskTags: taskTagsForInflux,
                    qs_taskCustomProperties: taskCustomProperties,
                    taskInfo,
                    qs_taskMetadata: taskMetadata,
                });

                globals.logger.info(
                    `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: External program info for task ${externalProgramTaskId}, "${msg[2]}" stored in InfluxDB`,
                );
            }
        } else {
            globals.logger.verbose(`[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Not storing task info in InfluxDB`);
        }

        return true;
    } catch (err) {
        globals.logger.error(
            `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Error handling successful external program task: ${globals.getErrorMessage(err)}`,
        );
        globals.logger.error(`[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Stack trace: ${err.stack}`);
        return false;
    }
};
