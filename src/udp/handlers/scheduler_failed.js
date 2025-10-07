// Load global variables and functions
import globals from '../../globals.js';
import { sendReloadTaskFailureNotificationEmail } from '../../lib/qseow/smtp.js';
import { sendReloadTaskFailureNotificationSlack } from '../../lib/qseow/slack_notification.js';
import { sendReloadTaskFailureNotificationWebhook } from '../../lib/qseow/webhook_notification.js';
import { sendReloadTaskFailureNotificationTeams } from '../../lib/qseow/msteams_notification.js';
import { sendReloadTaskFailureNotification } from '../../lib/incident_mgmt/signl4.js';
import { sendReloadTaskFailureLog, sendReloadTaskFailureEvent } from '../../lib/incident_mgmt/new_relic.js';
import { failedTaskStoreLogOnDisk, getScriptLog } from '../../lib/qseow/scriptlog.js';
import getAppMetadata from '../../qrs_util/app_metadata.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';
import { postReloadTaskFailureNotificationInfluxDb } from '../../lib/post_to_influxdb.js';

/**
 * Handler for failed scheduler initiated reloads.
 * @param {Array} msg - The message array containing details about the failed reload.
 */
const schedulerFailed = async (msg) => {
    try {
        // Get script log for failed reloads.
        // Only done if Slack, Teams, email or New Relic alerts are enabled
        let scriptLog;
        if (
            globals.config.get('Butler.incidentTool.newRelic.enable') === true ||
            globals.config.get('Butler.slackNotification.enable') === true ||
            globals.config.get('Butler.teamsNotification.enable') === true ||
            globals.config.get('Butler.influxDb.reloadTaskFailure.enable') === true ||
            globals.config.get('Butler.emailNotification.enable') === true
        ) {
            scriptLog = await getScriptLog(msg[5], 0, 0);

            // Check if script log retrieval failed
            if (scriptLog === false) {
                globals.logger.warn(
                    `[QSEOW] TASKFAILURE: Failed to retrieve script log for task ${msg[5]}. Continuing with other notifications without script log data.`,
                );
                // Set scriptLog to null so downstream functions can check for its availability
                scriptLog = null;
            } else {
                globals.logger.verbose(`[QSEOW] Script log for failed reload retrieved`);
            }
        }

        globals.logger.verbose(
            `[QSEOW] TASKFAILURE: Received reload failed UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`,
        );

        // First field in message (msg[0]) is message category (this is the modern/recent message format)

        // Get task metadata to determine task type
        const taskMetadata = await getTaskMetadata(msg[5]);
        if (taskMetadata === false) {
            globals.logger.error(`[QSEOW] TASKFAILURE: Could not get task metadata for task ${msg[5]}. Aborting further processing`);
            return;
        }

        // Determine task type based on taskMetadata
        // Task types: 0=Reload, 1=ExternalProgram, 2=UserSync, 3=Distribute, 4=Preload
        const taskType = taskMetadata?.taskType || 0;
        const isReloadTask = taskType === 0;

        globals.logger.debug(`[QSEOW] TASKFAILURE: Task type=${taskType}, isReloadTask=${isReloadTask}`);

        // For non-reload tasks, we can't process app metadata
        if (!isReloadTask) {
            globals.logger.info(
                `[QSEOW] TASKFAILURE: Task ${msg[2]} (${msg[5]}) is not a reload task (type=${taskType}). Limited processing will be performed.`,
            );
            // TODO: Add placeholder handling for other task types (ExternalProgram, UserSync, Distribute, Preload)
            globals.logger.verbose(
                `[QSEOW] TASKFAILURE: Task ${msg[2]} failed. No further processing configured for task type ${taskType}.`,
            );
            return;
        }

        // Get app metadata from QRS
        const appMetadata = await getAppMetadata(msg[6]);

        // If we could not get app metadata from QRS, that is a problem. Log it and return
        // Note: appMetadata can be false (error), {} (empty/not found), or an object with data
        if (appMetadata === false) {
            globals.logger.error(`[QSEOW] TASKFAILURE: Could not get app metadata for app ${msg[6]}. Aborting further processing`);
            return;
        }

        // Check if appMetadata is empty (no app found)
        if (!appMetadata || Object.keys(appMetadata).length === 0) {
            globals.logger.warn(
                `[QSEOW] TASKFAILURE: App metadata not found or empty for app ${msg[6]}. This may be an external program task or invalid app ID. Aborting further processing.`,
            );
            return;
        }

        // Get tags for the app that failed reloading
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

        // Get tags for the task that failed reloading
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get reload task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Store script log to disk
        if (globals.config.get('Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.enable') === true) {
            failedTaskStoreLogOnDisk({
                hostName: msg[1],
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
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
                scriptLog,
            });
        }

        // Post to Signl4 when a task has failed
        if (
            globals.config.get('Butler.incidentTool.signl4.enable') === true &&
            globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotification({
                hostName: msg[1],
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
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
            });
        }

        // Post event to New Relic when a task has failed
        if (
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') === true
        ) {
            sendReloadTaskFailureEvent({
                qs_hostName: msg[1],
                qs_user: msg[4].replace(/\\/g, '/'),
                qs_taskName: msg[2],
                qs_taskId: msg[5],
                qs_appName: msg[3],
                qs_appId: msg[6],
                qs_logTimeStamp: msg[7],
                qs_logLevel: msg[8],
                qs_executionId: msg[9],
                qs_logMessage: msg[10],
                qs_appTags: appTags,
                qs_appCustomProperties: appCustomProperties,
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
            });
        }

        // Post log to New Relic when a task has failed
        if (
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') === true
        ) {
            sendReloadTaskFailureLog({
                qs_hostName: msg[1],
                qs_user: msg[4].replace(/\\/g, '/'),
                qs_taskName: msg[2],
                qs_taskId: msg[5],
                qs_appName: msg[3],
                qs_appId: msg[6],
                qs_logTimeStamp: msg[7],
                qs_logLevel: msg[8],
                qs_executionId: msg[9],
                qs_logMessage: msg[10],
                qs_appTags: appTags,
                qs_appCustomProperties: appCustomProperties,
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
                scriptLog,
            });
        }

        // Post to InfluxDB when a task has failed
        if (
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.reloadTaskFailure.enable') === true
        ) {
            postReloadTaskFailureNotificationInfluxDb({
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
                scriptLog,
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
            });
        }

        // Post to Slack when a task has failed, if Slack is enabled
        if (
            globals.config.get('Butler.slackNotification.enable') === true &&
            globals.config.get('Butler.slackNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationSlack({
                hostName: msg[1],
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
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
                scriptLog,
            });
        }

        // Post to MS Teams when a task has failed, if Teams is enabled
        if (
            globals.config.get('Butler.teamsNotification.enable') === true &&
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationTeams({
                hostName: msg[1],
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
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
                scriptLog,
            });
        }

        // Send notification email when task has failed, if this notification type is enabled
        if (
            globals.config.get('Butler.emailNotification.enable') === true &&
            globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationEmail({
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

        // Call outgoing webhooks when task has failed
        // Note that there is no enable/disable flag for failed reloads.
        // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
        if (globals.config.has('Butler.webhookNotification.enable') && globals.config.get('Butler.webhookNotification.enable') === true) {
            sendReloadTaskFailureNotificationWebhook({
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
            });
        }

        // Publish basic MQTT message containing task name when a task has failed, if MQTT is enabled
        if (globals.config.get('Butler.mqttConfig.enable') === true) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[2]);
            } else {
                globals.logger.warn(
                    `[QSEOW] MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskFailureTopic',
                    )}`,
                );
            }
        }

        // Publish stringified MQTT message containing full, stringified JSON when a task has failed, if MQTT is enabled
        if (
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.get('Butler.mqttConfig.taskFailureSendFull') === true
        ) {
            globals.mqttClient.publish(
                globals.config.get('Butler.mqttConfig.taskFailureFullTopic'),
                JSON.stringify({
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
                    qs_taskMetadata: taskMetadata,
                }),
            );
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] TASKFAILURE: Error processing reload task failure event: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] TASKFAILURE: Stack trace: ${err.stack}`);
    }
};

/**
 * Handler for successful scheduler initiated reloads.
 * @param {Array} msg - The message array containing details about the successful reload.
 * @returns {boolean} - Returns true if processing was successful, false otherwise.
 */

export default schedulerFailed;
