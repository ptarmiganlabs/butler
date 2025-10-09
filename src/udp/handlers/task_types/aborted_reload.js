// Load global variables and functions
import globals from '../../../globals.js';
import { sendReloadTaskAbortedNotificationEmail } from '../../../lib/qseow/smtp.js';
import { sendReloadTaskAbortedNotificationSlack } from '../../../lib/qseow/slack_notification.js';
import { sendReloadTaskAbortedNotificationWebhook } from '../../../lib/qseow/webhook_notification.js';
import { sendReloadTaskAbortedNotificationTeams } from '../../../lib/qseow/msteams_notification.js';
import { sendReloadTaskAbortedNotification } from '../../../lib/incident_mgmt/signl4.js';
import { sendReloadTaskAbortedLog, sendReloadTaskAbortedEvent } from '../../../lib/incident_mgmt/new_relic.js';
import { getScriptLog } from '../../../lib/qseow/scriptlog.js';
import getAppMetadata from '../../../qrs_util/app_metadata.js';

/**
 * Handler for aborted reload tasks.
 *
 * Processes reload task aborts (typically from QMC or via APIs) by:
 * - Retrieving script logs (if enabled for notifications)
 * - Extracting app and task metadata from QRS
 * - Sending notifications via configured channels:
 *   - Signl4 incident management
 *   - New Relic (events and logs)
 *   - Slack messages
 *   - MS Teams messages
 *   - Email notifications
 *   - Webhook calls
 *   - MQTT messages (basic and full payload)
 *
 * @async
 * @param {Array<string>} msg - UDP message array with reload abort details:
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
 * @returns {Promise<void>}
 */
export const handleAbortedReloadTask = async (msg, taskMetadata) => {
    try {
        globals.logger.debug(
            `[QSEOW] TASKABORTED: Reload task aborted: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Task ID=${msg[5]}`,
        );

        // Get script log for aborted app reload tasks.
        // Only done if it's actually needed based on enabled notification types
        let scriptLog;
        if (
            globals.config.get('Butler.incidentTool.newRelic.enable') === true ||
            globals.config.get('Butler.slackNotification.enable') === true ||
            globals.config.get('Butler.teamsNotification.enable') === true ||
            globals.config.get('Butler.emailNotification.enable') === true
        ) {
            scriptLog = await getScriptLog(msg[5], 1, 1);

            // Check if script log retrieval failed
            if (scriptLog === false) {
                globals.logger.warn(
                    `[QSEOW] TASKABORTED: Failed to retrieve script log for task ${msg[5]}. Continuing with other notifications without script log data.`,
                );
                // Set scriptLog to null so downstream functions can check for its availability
                scriptLog = null;
            } else {
                globals.logger.verbose(`[QSEOW] Script log for aborted reload retrieved`);
            }
        }

        // Get app metadata from QRS
        const appMetadata = await getAppMetadata(msg[6]);

        // If we could not get app metadata from QRS, that is a problem. Log it and return
        // Note: appMetadata can be false (error), {} (empty/not found), or an object with data
        if (appMetadata === false) {
            globals.logger.error(`[QSEOW] TASKABORTED: Could not get app metadata for app ${msg[6]}. Aborting further processing`);
            return;
        }

        // Check if appMetadata is empty (no app found)
        if (!appMetadata || Object.keys(appMetadata).length === 0) {
            globals.logger.warn(
                `[QSEOW] TASKABORTED: App metadata not found or empty for app ${msg[6]}. This may be an external program task or invalid app ID. Aborting further processing.`,
            );
            return;
        }

        // Get tags for the app that failed reloading
        const appTags = appMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

        // Get app custom properties
        const appCustomProperties =
            appMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Get tags for the task that aborted
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get reload task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Post to Signl4 when a task has been aborted
        if (
            globals.config.get('Butler.incidentTool.signl4.enable') === true &&
            globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.enable') === true
        ) {
            sendReloadTaskAbortedNotification({
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

        // Post event to New Relic when a task has been aborted
        if (
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable') === true
        ) {
            sendReloadTaskAbortedEvent({
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

        // Post log to New Relic when a task has been aborted
        if (
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable') === true
        ) {
            sendReloadTaskAbortedLog({
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

        // Post to Slack when a reload task has been aborted, if Slack is enabled
        if (
            globals.config.get('Butler.slackNotification.enable') === true &&
            globals.config.get('Butler.slackNotification.reloadTaskAborted.enable') === true
        ) {
            sendReloadTaskAbortedNotificationSlack({
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

        // Post to MS Teams when a reload task been aborted, if Teams is enabled
        if (
            globals.config.get('Butler.teamsNotification.enable') === true &&
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable') === true
        ) {
            sendReloadTaskAbortedNotificationTeams({
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

        // Send notification email when task has been aborted, if this notification type is enabled
        if (
            globals.config.get('Butler.emailNotification.enable') === true &&
            globals.config.get('Butler.emailNotification.reloadTaskAborted.enable') === true
        ) {
            sendReloadTaskAbortedNotificationEmail({
                hostName: msg[1],
                user: msg[4],
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

        // Call outgoing webhooks when task has been aborted
        if (globals.config.get('Butler.webhookNotification.enable') === true) {
            sendReloadTaskAbortedNotificationWebhook({
                hostName: msg[1],
                user: msg[4],
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

        // Publish basic MQTT message containing task name when a task has been aborted, if MQTT is enabled
        if (globals.config.get('Butler.mqttConfig.enable') === true) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskAbortedTopic'), msg[2]);
            } else {
                globals.logger.warn(
                    `[QSEOW] MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskAbortedTopic',
                    )}`,
                );
            }
        }

        // Publish stringified MQTT message containing full, stringified JSON when a task has been aborted, if MQTT is enabled
        if (
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.get('Butler.mqttConfig.taskAbortedSendFull') === true
        ) {
            globals.mqttClient.publish(
                globals.config.get('Butler.mqttConfig.taskAbortedFullTopic'),
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
                    qs_appMetadata: appMetadata,
                    qs_taskMetadata: taskMetadata,
                }),
            );
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] TASKABORTED: Error handling aborted reload task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] TASKABORTED: Stack trace: ${err.stack}`);
    }
};
