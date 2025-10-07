// Load global variables and functions
import globals from '../../globals.js';
import { sendReloadTaskAbortedNotificationEmail } from '../../lib/qseow/smtp.js';
import { sendReloadTaskAbortedNotificationSlack } from '../../lib/qseow/slack_notification.js';
import { sendReloadTaskAbortedNotificationWebhook } from '../../lib/qseow/webhook_notification.js';
import { sendReloadTaskAbortedNotificationTeams } from '../../lib/qseow/msteams_notification.js';
import { sendReloadTaskAbortedNotification } from '../../lib/incident_mgmt/signl4.js';
import { sendReloadTaskAbortedLog, sendReloadTaskAbortedEvent } from '../../lib/incident_mgmt/new_relic.js';
import { getScriptLog } from '../../lib/qseow/scriptlog.js';
import getAppMetadata from '../../qrs_util/app_metadata.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';

/**
 * Handler for aborted scheduler initiated reloads.
 * @param {Array} msg - The message array containing details about the aborted reload.
 */
const schedulerAborted = async (msg) => {
    try {
        globals.logger.verbose(
            `[QSEOW] TASKABORTED: Received reload aborted UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`,
        );

        // Get script log for failed reloads.
        // Only done if Slack, Teams, email or New Relic alerts are enabled
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

        // TOOD: Add check if task exists in QRS
        // Get task metadata to determine task type
        const taskMetadata = await getTaskMetadata(msg[5]);
        if (taskMetadata === false) {
            globals.logger.error(`[QSEOW] TASKABORTED: Could not get task metadata for task ${msg[5]}. Aborting further processing`);
            return;
        }

        // Determine task type based on taskMetadata
        // Task types: 0=Reload, 1=ExternalProgram, 2=UserSync, 3=Distribute, 4=Preload
        const taskType = taskMetadata?.taskType || 0;
        const isReloadTask = taskType === 0;

        globals.logger.debug(`[QSEOW] TASKABORTED: Task type=${taskType}, isReloadTask=${isReloadTask}`);

        // For non-reload tasks, we can't process app metadata
        if (!isReloadTask) {
            globals.logger.info(
                `[QSEOW] TASKABORTED: Task ${msg[2]} (${msg[5]}) is not a reload task (type=${taskType}). Limited processing will be performed.`,
            );
            // TODO: Add placeholder handling for other task types (ExternalProgram, UserSync, Distribute, Preload)
            globals.logger.verbose(
                `[QSEOW] TASKABORTED: Task ${msg[2]} was aborted. No further processing configured for task type ${taskType}.`,
            );
            return;
        }

        // Get app metadata from QRS
        // Returns false if app metadata retrieval fails, JSON object if successful
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

        // Post to Slack when a reload task has been aborted (typically from the QMC, or via APIs), if Slack is enabled
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

        // Post to MS Teams when a reload task been aborted (typically from the QMC, or via APIs), if Teams is enabled
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

        // Send notification email when task has been aborted (typically from the QMC, or via APIs), if this notification type is enabled
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
        // Note that there is no enable/disable flag for failed reloads.
        // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
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
        globals.logger.error(`[QSEOW] TASKABORTED: Error processing reload task aborted event: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] TASKABORTED: Stack trace: ${err.stack}`);
    }
};

export default schedulerAborted;
