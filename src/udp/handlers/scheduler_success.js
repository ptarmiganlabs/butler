// Load global variables and functions
import globals from '../../globals.js';
import { sendReloadTaskSuccessNotificationEmail } from '../../lib/qseow/smtp.js';
import { getScriptLog, getReloadTaskExecutionResults } from '../../lib/qseow/scriptlog.js';
import getTaskTags from '../../qrs_util/task_tag_util.js';
import getAppTags from '../../qrs_util/app_tag_util.js';
import getAppMetadata from '../../qrs_util/app_metadata.js';
import doesTaskExist from '../../qrs_util/does_task_exist.js';
import { isCustomPropertyValueSet } from '../../qrs_util/task_cp_util.js';
import { postReloadTaskSuccessNotificationInfluxDb } from '../../lib/post_to_influxdb.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';

/**
 * Handler for successful scheduler initiated reloads.
 * @param {Array} msg - The message array containing details about the successful reload.
 * @returns {boolean} - Returns true if processing was successful, false otherwise.
 */
const schedulerReloadTaskSuccess = async (msg) => {
    try {
        globals.logger.verbose(
            `[QSEOW] RELOAD TASK SUCCESS: Received reload task success UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`,
        );

        const reloadTaskId = msg[5];

        // Does task ID exist in Sense?
        const taskExists = await doesTaskExist(reloadTaskId);
        if (taskExists.exists !== true) {
            globals.logger.warn(`[QSEOW] RELOAD TASK SUCCESS: Task ID ${reloadTaskId} does not exist in Sense`);
            return false;
        }

        // Get task metadata to determine task type
        const taskMetadata = await getTaskMetadata(msg[5]);
        if (taskMetadata === false) {
            globals.logger.error(
                `[QSEOW] RELOAD TASK SUCCESS: Could not get task metadata for task ${msg[5]}. Aborting further processing`,
            );
            return false;
        }

        // Determine task type based on taskMetadata
        // Task types: 0=Reload, 1=ExternalProgram, 2=UserSync, 3=Distribute, 4=Preload
        const taskType = taskMetadata?.taskType || 0;
        const isReloadTask = taskType === 0;

        globals.logger.debug(`[QSEOW] RELOAD TASK SUCCESS: Task type=${taskType}, isReloadTask=${isReloadTask}`);

        // For non-reload tasks, we can't process app metadata
        if (!isReloadTask) {
            globals.logger.info(
                `[QSEOW] RELOAD TASK SUCCESS: Task ${msg[2]} (${reloadTaskId}) is not a reload task (type=${taskType}). Limited processing will be performed.`,
            );
            // TODO: Add placeholder handling for other task types (ExternalProgram, UserSync, Distribute, Preload)
            globals.logger.verbose(
                `[QSEOW] RELOAD TASK SUCCESS: Task ${msg[2]} completed successfully. No further processing configured for task type ${taskType}.`,
            );
            return true;
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

        // Get script log for successful reloads.
        // Only done if Slack, Teams or email alerts are enabled
        let scriptLog;
        if (
            globals.config.get('Butler.slackNotification.enable') === true ||
            globals.config.get('Butler.teamsNotification.enable') === true ||
            (globals.config.get('Butler.emailNotification.enable') === true &&
                globals.config.get('Butler.emailNotification.reloadTaskSuccess.enable') === true)
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
        // Tags are found in appMetadata.tags, which is an array of objects with the following properties:
        // - id
        // - name
        //
        // Create an array of tag names only
        const appTags = appMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

        // Get app custom properties
        // They are found in appMetadata.customProperties, which is an array of objects with the following properties:
        // - id
        // - definition
        //   - name
        // - value
        //
        // Create an array of objects, each with "name" and "value" properties
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
            // Specifically, it may take a while for the last "FinishedSuccess" meesage to appear in the executionDetails array.
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
                    `[QSEOW] RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Attempt ${retryCount} of 5. Waiting 1 second before trying again`,
                );

                await globals.sleep(1000);
            }

            if (!taskInfo) {
                globals.logger.warn(
                    `[QSEOW] RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Not storing task info in InfluxDB`,
                );
                return false;
            }
            globals.logger.verbose(
                `[QSEOW] RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId}: ${JSON.stringify(taskInfo, null, 2)}`,
            );

            // Get app/task tags so they can be included in data sent to alert destinations
            let appTags = [];
            let taskTags = [];

            // Get tags for the app that was reloaded
            appTags = await getAppTags(msg[6]);
            globals.logger.verbose(`[QSEOW] Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

            // Get tags for the task that finished reloading successfully
            taskTags = await getTaskTags(msg[5]);
            globals.logger.verbose(`[QSEOW] Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

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
                    qs_appTags: appTags,
                    qs_appCustomProperties: appCustomProperties,
                    qs_taskTags: taskTags,
                    qs_taskCustomProperties: taskCustomProperties,
                    taskInfo,
                    qs_appMetadata: appMetadata,
                    qs_taskMetadata: taskMetadata,
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
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Error processing reload task success event: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Stack trace: ${err.stack}`);
        return false;
    }
};

/**
 * Set up UDP server handlers for acting on Sense failed task events.
 */

export default schedulerReloadTaskSuccess;
