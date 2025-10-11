// Load global variables and functions
import globals from '../../../globals.js';
import { GLOBALS_INIT_CHECK_INTERVAL_MS } from '../../../constants.js';
import { sendReloadTaskSuccessNotificationEmail } from '../../../lib/qseow/smtp/reload-task-success.js';
import { getReloadTaskExecutionResults } from '../../../qrs_util/reload_task_execution_results.js';
import getTaskTags from '../../../qrs_util/task_tag_util.js';
import getAppTags from '../../../qrs_util/app_tag_util.js';
import getAppMetadata from '../../../qrs_util/app_metadata.js';
import { isCustomPropertyValueSet } from '../../../qrs_util/task_cp_util.js';
import { postReloadTaskSuccessNotificationInfluxDb } from '../../../lib/influxdb/task_success.js';
import { getScriptLog } from '../../../lib/qseow/scriptlog.js';

/**
 * Handler for successful reload tasks.
 *
 * Processes successful reload task completions by:
 * - Retrieving script logs (if enabled for notifications)
 * - Determining if task should be stored in InfluxDB (based on config or custom properties)
 * - Retrieving app metadata from QRS
 * - Getting task execution results and duration (if storing to InfluxDB)
 * - Posting metrics to InfluxDB (if enabled)
 * - Sending email notifications with script logs (if enabled)
 *
 * @async
 * @param {Array<string>} msg - UDP message array with reload success details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: App name
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: App ID
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS containing:
 *   - taskType: Type of task (0=Reload)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<boolean>} Returns true if processing was successful, false otherwise
 */
export const handleSuccessReloadTask = async (msg, taskMetadata) => {
    try {
        const reloadTaskId = msg[5];

        globals.logger.verbose(
            `[QSEOW] RELOAD TASK SUCCESS: Reload task succeeded: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Task ID=${reloadTaskId}`,
        );

        // Get script log for successful app reloads tasks
        // Only done if it's actually needed based on enabled notification types
        let scriptLog;
        if (
            globals.config.get('Butler.emailNotification.enable') === true ||
            globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true
        ) {
            scriptLog = await getScriptLog(reloadTaskId, 0, 0);

            // Check if script log retrieval failed
            if (scriptLog === false) {
                globals.logger.warn(
                    `[QSEOW] RELOAD TASK SUCCESS: Failed to retrieve script log for task ${reloadTaskId}. Continuing with other notifications without script log data.`,
                );
                // Set scriptLog to null so downstream functions can check for its availability
                scriptLog = null;
            } else {
                globals.logger.verbose(`[QSEOW] Script log for successful reload retrieved`);
            }
        }

        // Determine if this task should be stored in InfluxDB
        let storeInInfluxDb = false;
        if (
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true &&
            globals.config.get('Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable') === true
        ) {
            storeInInfluxDb = true;
        } else if (
            // Is storing of data in InfluxDB enabled for this specific task, via custom property?
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true &&
            globals.config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable') === true
        ) {
            // Is the custom property set for this specific task?
            // Get custom property name and value from config
            const customPropertyName = globals.config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName');
            const customPropertyValue = globals.config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue');

            // Get custom property value for this task
            const customPropertyValueForTask = await isCustomPropertyValueSet(
                reloadTaskId,
                customPropertyName,
                customPropertyValue,
                globals.logger,
            );

            if (customPropertyValueForTask) {
                storeInInfluxDb = true;
            }
        }

        // Note: Script log is retrieved above if needed for notifications

        // Get app metadata from QRS
        const appMetadata = await getAppMetadata(msg[6]);

        // If we could not get app metadata from QRS, that is a problem. Log it and return
        // Note: appMetadata can be false (error), {} (empty/not found), or an object with data
        if (appMetadata === false) {
            globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Could not get app metadata for app ${msg[6]}. Aborting further processing`);
            return false;
        }

        // Check if appMetadata is empty (no app found)
        if (!appMetadata || Object.keys(appMetadata).length === 0) {
            globals.logger.warn(
                `[QSEOW] RELOAD TASK SUCCESS: App metadata not found or empty for app ${msg[6]}. This may be an external program task or invalid app ID. Aborting further processing.`,
            );
            return false;
        }

        // Get tags for the app that completed reloading
        const appTags = appMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

        // Get app custom properties
        const appCustomProperties =
            appMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Get tags for the task that completed successfully
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get reload task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        if (storeInInfluxDb) {
            // Get results from last reload task execution
            // It may take a seconds or two from the finished-successfully log message is written until the execution results are available via the QRS.
            // Specifically, it may take a while for the last "FinishedSuccess" message to appear in the executionDetails array.
            //
            // Try at most five times, with a 1 second delay between each attempt.
            // Check if the message property of the last entry in the taskInfo.executionDetailsSorted array is "Changing task state from Started to FinishedSuccess"
            // Then give up and don't store anything in InfluxDB, but show a log warning.
            let taskInfo;
            let retryCount = 0;
            while (retryCount < 5) {
                taskInfo = await getReloadTaskExecutionResults(reloadTaskId);

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
                            `[QSEOW] RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId} retrieved successfully after ${retryCount} attempts, but duration is 0 seconds. This is likely caused by the QRS not having updated the execution details yet.`,
                        );
                    }

                    globals.logger.debug(
                        `[QSEOW] RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId} retrieved successfully after ${retryCount} attempts`,
                    );
                    break;
                }

                retryCount += 1;

                globals.logger.verbose(
                    `[QSEOW] RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Attempt ${retryCount} of 5. Waiting ${GLOBALS_INIT_CHECK_INTERVAL_MS}ms before trying again`,
                );

                await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
            }

            // Check if we failed to get valid task info after all retries
            if (!taskInfo || retryCount >= 5) {
                globals.logger.warn(
                    `[QSEOW] RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Not storing task info in InfluxDB`,
                );
                return false;
            }
            globals.logger.verbose(
                `[QSEOW] RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId}: ${JSON.stringify(taskInfo, null, 2)}`,
            );

            // Get app/task tags so they can be included in data sent to alert destinations
            let appTagsForInflux = [];
            let taskTagsForInflux = [];

            // Get tags for the app that was reloaded
            appTagsForInflux = await getAppTags(msg[6]);
            globals.logger.verbose(`[QSEOW] Tags for app ${msg[6]}: ${JSON.stringify(appTagsForInflux, null, 2)}`);

            // Get tags for the task that finished reloading successfully
            taskTagsForInflux = await getTaskTags(msg[5]);
            globals.logger.verbose(`[QSEOW] Tags for task ${msg[5]}: ${JSON.stringify(taskTagsForInflux, null, 2)}`);

            // Post to InfluxDB when a reload task has finished successfully
            if (
                globals.config.has('Butler.influxDb.enable') &&
                globals.config.has('Butler.influxDb.reloadTaskSuccess.enable') &&
                globals.config.get('Butler.influxDb.enable') === true &&
                globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true
            ) {
                postReloadTaskSuccessNotificationInfluxDb({
                    host: msg[1],
                    user: msg[4].replace(/\\/g, '/'),
                    taskName: msg[2],
                    taskId: msg[5],
                    appName: msg[3],
                    appId: msg[6],
                    logTimeStamp: msg[7],
                    logLevel: msg[8],
                    executionId: msg[9],
                    logMessage: msg[10],
                    qs_appTags: appTagsForInflux,
                    qs_appCustomProperties: appCustomProperties,
                    qs_taskTags: taskTagsForInflux,
                    qs_taskCustomProperties: taskCustomProperties,
                    taskInfo,
                    qs_appMetadata: appMetadata,
                    qs_taskMetadata: taskMetadata,
                    scriptLog,
                });

                globals.logger.info(
                    `[QSEOW] RELOAD TASK SUCCESS: Reload info for reload task ${reloadTaskId}, "${msg[2]}" stored in InfluxDB`,
                );
            }
        } else {
            globals.logger.verbose(`[QSEOW] RELOAD TASK SUCCESS: Not storing task info in InfluxDB`);
        }

        // Should we send email notification?
        if (
            globals.config.get('Butler.emailNotification.enable') === true &&
            globals.config.get('Butler.emailNotification.reloadTaskSuccess.enable') === true
        ) {
            sendReloadTaskSuccessNotificationEmail({
                hostName: msg[1],
                user: msg[4].replace(/\\\\/g, '\\'),
                taskName: msg[2],
                taskId: msg[5],
                appName: msg[3],
                appId: msg[6],
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_appTags: appTags,
                qs_appCustomProperties: appCustomProperties,
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
                scriptLog,
            });
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Error handling successful reload task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Stack trace: ${err.stack}`);
        return false;
    }
};
