// Load global variables and functions
import globals from '../globals.js';
import { sendReloadTaskAbortedNotificationEmail, sendReloadTaskFailureNotificationEmail } from '../lib/smtp.js';
import { sendReloadTaskFailureNotificationSlack, sendReloadTaskAbortedNotificationSlack } from '../lib/slack_notification.js';
import { sendReloadTaskAbortedNotificationWebhook, sendReloadTaskFailureNotificationWebhook } from '../lib/webhook_notification.js';
import { sendReloadTaskFailureNotificationTeams, sendReloadTaskAbortedNotificationTeams } from '../lib/msteams_notification.js';
import { sendReloadTaskFailureNotification, sendReloadTaskAbortedNotification } from '../lib/incident_mgmt/signl4.js';
import {
    sendReloadTaskFailureLog,
    sendReloadTaskFailureEvent,
    sendReloadTaskAbortedLog,
    sendReloadTaskAbortedEvent,
} from '../lib/incident_mgmt/new_relic.js';
import { failedTaskStoreLogOnDisk, getScriptLog, getReloadTaskExecutionResults } from '../lib/scriptlog.js';
import getTaskTags from '../qrs_util/task_tag_util.js';
import getAppTags from '../qrs_util/app_tag_util.js';
import doesTaskExist from '../qrs_util/does_task_exist.js';
import { isCustomPropertyValueSet } from '../qrs_util/task_cp_util.js';

import { postReloadTaskFailureNotificationInfluxDb, postReloadTaskSuccessNotificationInfluxDb } from '../lib/post_to_influxdb.js';

// Handler for failed scheduler initiated reloads
const schedulerAborted = async (msg) => {
    globals.logger.verbose(
        `TASKABORTED: Received reload aborted UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`
    );

    // Get script log for failed reloads.
    // Only done if Slack, Teams, email or New Relic alerts are enabled
    let scriptLog;
    if (
        (globals.config.has('Butler.incidentTool.newRelic.enable') && globals.config.get('Butler.incidentTool.newRelic.enable') === true) ||
        (globals.config.has('Butler.slackNotification.enable') && globals.config.get('Butler.slackNotification.enable') === true) ||
        (globals.config.has('Butler.teamsNotification.enable') && globals.config.get('Butler.teamsNotification.enable') === true) ||
        (globals.config.has('Butler.emailNotification.enable') && globals.config.get('Butler.emailNotification.enable') === true)
    ) {
        scriptLog = await getScriptLog(msg[5], 1, 1);

        globals.logger.verbose(`Script log for aborted reload retrieved`);
    }

    // First field in message (msg[0]) is message category (this is the modern/recent message format)

    // Check if app/task tags are used by any of the alert destinations.
    // If so, get those tags once so they can be re-used where needed.
    let appTags = [];
    let taskTags = [];

    // Get tags for the app that failed reloading
    appTags = await getAppTags(msg[6]);
    globals.logger.verbose(`Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

    // Get tags for the task that failed reloading
    taskTags = await getTaskTags(msg[5]);
    globals.logger.verbose(`Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

    // Post to Signl4 when a task has been aborted
    if (
        globals.config.has('Butler.incidentTool.signl4.enable') &&
        globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.enable') &&
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
            qs_taskTags: taskTags,
        });
    }

    // Post event to New Relic when a task has been aborted
    if (
        globals.config.has('Butler.incidentTool.newRelic.enable') &&
        globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable') &&
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
            qs_taskTags: taskTags,
        });
    }

    // Post log to New Relic when a task has been aborted
    if (
        globals.config.has('Butler.incidentTool.newRelic.enable') &&
        globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable') &&
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
            qs_taskTags: taskTags,
            scriptLog,
        });
    }

    // Post to Slack when a reload task has been aborted (typically from the QMC, or via APIs), if Slack is enabled
    if (
        globals.config.has('Butler.slackNotification.enable') &&
        globals.config.has('Butler.slackNotification.reloadTaskAborted.enable') &&
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
            qs_taskTags: taskTags,
            scriptLog,
        });
    }

    // Post to MS Teams when a reload task been aborted (typically from the QMC, or via APIs), if Teams is enabled
    if (
        globals.config.has('Butler.teamsNotification.enable') &&
        globals.config.has('Butler.teamsNotification.reloadTaskAborted.enable') &&
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
            qs_taskTags: taskTags,
            scriptLog,
        });
    }

    // Send notification email when task has been aborted (typically from the QMC, or via APIs), if this notification type is enabled
    if (
        globals.config.has('Butler.emailNotification.enable') &&
        globals.config.has('Butler.emailNotification.reloadTaskAborted.enable') &&
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
            qs_taskTags: taskTags,
            scriptLog,
        });
    }

    // Call outgoing webhooks when task has been aborted
    // Note that there is no enable/disable flag for failed reloads.
    // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
    if (globals.config.has('Butler.webhookNotification.enable') && globals.config.get('Butler.webhookNotification.enable') === true) {
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
            qs_taskTags: taskTags,
        });
    }

    // Publish basic MQTT message containing task name when a task has been aborted, if MQTT is enabled
    if (
        globals.config.has('Butler.mqttConfig.enable') &&
        globals.config.get('Butler.mqttConfig.enable') === true &&
        globals.config.has('Butler.mqttConfig.taskAbortedTopic')
    ) {
        if (globals?.mqttClient?.connected) {
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskAbortedTopic'), msg[2]);
        } else {
            globals.logger.warn(
                `MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                    'Butler.mqttConfig.taskAbortedTopic'
                )}`
            );
        }
    }

    // Publish stringified MQTT message containing full, stringified JSON when a task has been aborted, if MQTT is enabled
    if (
        globals.config.has('Butler.mqttConfig.enable') &&
        globals.config.get('Butler.mqttConfig.enable') === true &&
        globals.config.has('Butler.mqttConfig.taskAbortedSendFull') &&
        globals.config.get('Butler.mqttConfig.taskAbortedSendFull') === true &&
        globals.config.has('Butler.mqttConfig.taskAbortedFullTopic')
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
                qs_taskTags: taskTags,
            })
        );
    }
};

// Handler for failed scheduler initiated reloads
const schedulerFailed = async (msg, legacyFlag) => {
    // Get script log for failed reloads.
    // Only done if Slack, Teams, email or New Relic alerts are enabled
    let scriptLog;
    if (
        (globals.config.has('Butler.incidentTool.newRelic.enable') && globals.config.get('Butler.incidentTool.newRelic.enable') === true) ||
        (globals.config.has('Butler.slackNotification.enable') && globals.config.get('Butler.slackNotification.enable') === true) ||
        (globals.config.has('Butler.teamsNotification.enable') && globals.config.get('Butler.teamsNotification.enable') === true) ||
        (globals.config.has('Butler.influxDb.reloadTaskFailure.enable') &&
            globals.config.get('Butler.influxDb.reloadTaskFailure.enable') === true) ||
        (globals.config.has('Butler.emailNotification.enable') && globals.config.get('Butler.emailNotification.enable') === true)
    ) {
        if (legacyFlag) {
            scriptLog = await getScriptLog(msg[4], 0, 0);
            globals.logger.verbose(`Script log for failed reload retrieved (legacy)`);
        } else {
            scriptLog = await getScriptLog(msg[5], 0, 0);
            globals.logger.verbose(`Script log for failed reload retrieved (new)`);
        }
    }

    if (legacyFlag) {
        // First field in message (msg[0]) is host name

        // Store script log to disk
        if (
            globals.config.has('Butler.scriptLog.storeOnDisk.reloadTaskFailure.enable') &&
            globals.config.get('Butler.scriptLog.storeOnDisk.reloadTaskFailure.enable') === true
        ) {
            failedTaskStoreLogOnDisk({
                hostName: msg[0],
                user: msg[3].replace(/\\/g, '/'),
                taskName: msg[1],
                taskId: msg[4],
                appName: msg[2],
                appId: msg[5],
                logTimeStamp: msg[6],
                logLevel: msg[7],
                executionId: msg[8],
                logMessage: msg[9],
            });
        }

        // Post to Signl4 when a task has failed
        if (
            globals.config.has('Butler.incidentTool.signl4.enable') &&
            globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable') &&
            globals.config.get('Butler.incidentTool.signl4.enable') === true &&
            globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotification({
                hostName: msg[0],
                user: msg[3].replace(/\\/g, '/'),
                taskName: msg[1],
                taskId: msg[4],
                appName: msg[2],
                appId: msg[5],
                logTimeStamp: msg[6],
                logLevel: msg[7],
                executionId: msg[8],
                logMessage: msg[9],
            });
        }

        // Post event to New Relic when a task has failed
        if (
            globals.config.has('Butler.incidentTool.newRelic.enable') &&
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') &&
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') === true
        ) {
            sendReloadTaskFailureEvent({
                qs_hostName: msg[0],
                qs_user: msg[3].replace(/\\/g, '/'),
                qs_taskName: msg[1],
                qs_taskId: msg[4],
                qs_appName: msg[2],
                qs_appId: msg[5],
                qs_logTimeStamp: msg[6],
                qs_logLevel: msg[7],
                qs_executionId: msg[8],
                qs_logMessage: msg[9],
            });
        }

        // Post log to New Relic when a task has failed
        if (
            globals.config.has('Butler.incidentTool.newRelic.enable') &&
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') &&
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') === true
        ) {
            sendReloadTaskFailureLog({
                qs_hostName: msg[0],
                qs_user: msg[3].replace(/\\/g, '/'),
                qs_taskName: msg[1],
                qs_taskId: msg[4],
                qs_appName: msg[2],
                qs_appId: msg[5],
                qs_logTimeStamp: msg[6],
                qs_logLevel: msg[7],
                qs_executionId: msg[8],
                qs_logMessage: msg[9],
                scriptLog,
            });
        }

        // Post to Slack when a task has failed, if Slack is enabled
        if (
            globals.config.has('Butler.slackNotification.enable') &&
            globals.config.has('Butler.slackNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.slackNotification.enable') === true &&
            globals.config.get('Butler.slackNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationSlack({
                hostName: msg[0],
                user: msg[3].replace(/\\/g, '/'),
                taskName: msg[1],
                taskId: msg[4],
                appName: msg[2],
                appId: msg[5],
                logTimeStamp: msg[6],
                logLevel: msg[7],
                executionId: msg[8],
                logMessage: msg[9],
                scriptLog,
            });
        }

        // Post to MS Teams when a task has failed, if Teams is enabled
        if (
            globals.config.has('Butler.teamsNotification.enable') &&
            globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.teamsNotification.enable') === true &&
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationTeams({
                hostName: msg[0],
                user: msg[3].replace(/\\/g, '/'),
                taskName: msg[1],
                taskId: msg[4],
                appName: msg[2],
                appId: msg[5],
                logTimeStamp: msg[6],
                logLevel: msg[7],
                executionId: msg[8],
                logMessage: msg[9],
                scriptLog,
            });
        }

        // Send notification email when task has failed, if this notification type is enabled
        if (
            globals.config.has('Butler.emailNotification.enable') &&
            globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.emailNotification.enable') === true &&
            globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationEmail({
                hostName: msg[0],
                user: msg[3].replace(/\\\\/g, '\\'),
                taskName: msg[1],
                taskId: msg[4],
                appName: msg[2],
                appId: msg[5],
                logTimeStamp: msg[6],
                logLevel: msg[7],
                executionId: msg[8],
                logMessage: msg[9],
                scriptLog,
            });
        }

        // Call outgoing webhooks when task has failed
        // Note that there is no enable/disable flag for failed reloads.
        // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
        if (
            globals.config.has('Butler.webhookNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.webhookNotification.reloadTaskFailure.enable') === true
        ) {
            sendReloadTaskFailureNotificationWebhook({
                hostName: msg[0],
                user: msg[3].replace(/\\\\/g, '\\'),
                taskName: msg[1],
                taskId: msg[4],
                appName: msg[2],
                appId: msg[5],
                logTimeStamp: msg[6],
                logLevel: msg[7],
                executionId: msg[8],
                logMessage: msg[9],
            });
        }

        // Publish MQTT message when a task has failed, if MQTT enabled
        if (
            globals.config.has('Butler.mqttConfig.enable') &&
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureTopic')
        ) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[1]);
            } else {
                globals.logger.warn(
                    `MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskFailureTopic'
                    )}`
                );
            }
        }

        // Publish stringified MQTT message containing full, stringified JSON when a task has failed, if MQTT is enabled
        if (
            globals.config.has('Butler.mqttConfig.enable') &&
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureSendFull') &&
            globals.config.get('Butler.mqttConfig.taskFailureSendFull') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureFullTopic')
        ) {
            globals.mqttClient.publish(
                globals.config.get('Butler.mqttConfig.taskFailureFullTopic'),
                JSON.stringify({
                    hostName: msg[0],
                    user: msg[3].replace(/\\\\/g, '\\'),
                    taskName: msg[1],
                    taskId: msg[4],
                    appName: msg[2],
                    appId: msg[5],
                    logTimeStamp: msg[6],
                    logLevel: msg[7],
                    executionId: msg[8],
                    logMessage: msg[9],
                })
            );
        }
    } else {
        globals.logger.verbose(
            `TASKFAILURE: Received reload failed UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`
        );

        // First field in message (msg[0]) is message category (this is the modern/recent message format)

        // Check if app/task tags are used by any of the alert destinations.
        // If so, get those tags once so they can be re-used where needed.
        let appTags = [];
        let taskTags = [];

        // Get tags for the app that failed reloading
        appTags = await getAppTags(msg[6]);
        globals.logger.verbose(`Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

        // Get tags for the task that failed reloading
        taskTags = await getTaskTags(msg[5]);
        globals.logger.verbose(`Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

        // Store script log to disk
        if (
            globals.config.has('Butler.scriptLog.storeOnDisk.reloadTaskFailure.enable') &&
            globals.config.get('Butler.scriptLog.storeOnDisk.reloadTaskFailure.enable') === true
        ) {
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
                qs_taskTags: taskTags,
                scriptLog,
            });
        }

        // Post to Signl4 when a task has failed
        if (
            globals.config.has('Butler.incidentTool.signl4.enable') &&
            globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable') &&
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
                qs_taskTags: taskTags,
            });
        }

        // Post event to New Relic when a task has failed
        if (
            globals.config.has('Butler.incidentTool.newRelic.enable') &&
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') &&
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
                qs_taskTags: taskTags,
            });
        }

        // Post log to New Relic when a task has failed
        if (
            globals.config.has('Butler.incidentTool.newRelic.enable') &&
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') &&
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
                qs_taskTags: taskTags,
                scriptLog,
            });
        }

        // Post to InfluxDB when a task has failed
        if (
            globals.config.has('Butler.influxDb.enable') &&
            globals.config.has('Butler.influxDb.reloadTaskFailure.enable') &&
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
                appTags,
                taskTags,
                scriptLog,
            });
        }

        // Post to Slack when a task has failed, if Slack is enabled
        if (
            globals.config.has('Butler.slackNotification.enable') &&
            globals.config.has('Butler.slackNotification.reloadTaskFailure.enable') &&
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
                qs_taskTags: taskTags,
                scriptLog,
            });
        }

        // Post to MS Teams when a task has failed, if Teams is enabled
        if (
            globals.config.has('Butler.teamsNotification.enable') &&
            globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
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
                qs_taskTags: taskTags,
                scriptLog,
            });
        }

        // Send notification email when task has failed, if this notification type is enabled
        if (
            globals.config.has('Butler.emailNotification.enable') &&
            globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') &&
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
                qs_taskTags: taskTags,
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
                qs_taskTags: taskTags,
            });
        }

        // Publish basic MQTT message containing task name when a task has failed, if MQTT is enabled
        if (
            globals.config.has('Butler.mqttConfig.enable') &&
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureTopic')
        ) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[2]);
            } else {
                globals.logger.warn(
                    `MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskFailureTopic'
                    )}`
                );
            }
        }

        // Publish stringified MQTT message containing full, stringified JSON when a task has failed, if MQTT is enabled
        if (
            globals.config.has('Butler.mqttConfig.enable') &&
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureSendFull') &&
            globals.config.get('Butler.mqttConfig.taskFailureSendFull') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureFullTopic')
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
                    qs_taskTags: taskTags,
                })
            );
        }
    }
};

// --------------------------------------------------------
// Handler for successful scheduler initiated reloads
// --------------------------------------------------------
const schedulerReloadTaskSuccess = async (msg) => {
    globals.logger.verbose(
        `RELOAD TASK SUCCESS: Received reload task success UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`
    );

    const reloadTaskId = msg[5];

    // Does task ID exist in Sense?
    const taskExists = await doesTaskExist(reloadTaskId);
    if (taskExists.exists !== true) {
        globals.logger.warn(`RELOAD TASK SUCCESS: Task ID ${reloadTaskId} does not exist in Sense`);
        return false;
    }

    // Determine if this task should be stored in InflixDB
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
            globals.logger
        );

        if (customPropertyValueForTask) {
            storeInInfluxDb = true;
        }
    }

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
            // eslint-disable-next-line no-await-in-loop
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
                        `RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId} retrieved successfully after ${retryCount} attempts, but duration is 0 seconds. This is likely caused by the QRS not having updated the execution details yet.`
                    );
                }

                globals.logger.debug(
                    `RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId} retrieved successfully after ${retryCount} attempts`
                );
                break;
            }

            retryCount += 1;

            globals.logger.verbose(
                `RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Attempt ${retryCount} of 5. Waiting 1 second before trying again`
            );

            // eslint-disable-next-line no-await-in-loop
            await globals.sleep(1000);
        }

        if (!taskInfo) {
            globals.logger.warn(
                `RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Not storing task info in InfluxDB`
            );
            return false;
        }
        globals.logger.verbose(`RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId}: ${JSON.stringify(taskInfo, null, 2)}`);

        // Get app/task tags so they can be included in data sent to alert destinations
        let appTags = [];
        let taskTags = [];

        // Get tags for the app that was reloaded
        appTags = await getAppTags(msg[6]);
        globals.logger.verbose(`Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

        // Get tags for the task that finished reloading successfully
        taskTags = await getTaskTags(msg[5]);
        globals.logger.verbose(`Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

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
                appTags,
                taskTags,
                taskInfo,
            });

            globals.logger.info(`RELOAD TASK SUCCESS: Reload info for reload task ${reloadTaskId}, "${msg[2]}" stored in InfluxDB`);
        }

        return true;
    }

    globals.logger.verbose(`RELOAD TASK SUCCESS: Not storing task info in InfluxDB`);
    return false;
};

// --------------------------------------------------------
// Set up UDP server handlers for acting on Sense failed task events
// --------------------------------------------------------
const udpInitTaskErrorServer = () => {
    // Handler for UDP server startup event
    // eslint-disable-next-line no-unused-vars
    globals.udpServerReloadTaskSocket.on('listening', (message, remote) => {
        const address = globals.udpServerReloadTaskSocket.address();

        globals.logger.info(`TASKFAILURE: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
            } else {
                globals.logger.warn(
                    `UDP SERVER INIT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskFailureServerStatusTopic'
                    )}`
                );
            }
        }
    });

    // Handler for UDP error event
    // eslint-disable-next-line no-unused-vars
    globals.udpServerReloadTaskSocket.on('error', (message, remote) => {
        try {
            const address = globals.udpServerReloadTaskSocket.address();
            globals.logger.error(`TASKFAILURE: UDP server error on ${address.address}:${address.port}`);

            // Publish MQTT message that UDP server has reported an error
            if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
                if (globals?.mqttClient?.connected) {
                    globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
                } else {
                    globals.logger.warn(
                        `UDP SERVER ERROR: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                            'Butler.mqttConfig.taskFailureServerStatusTopic'
                        )}`
                    );
                }
            }
        } catch (err) {
            globals.logger.error(`TASKFAILURE: Error in UDP error handler: ${err}`);
        }
    });

    // Main handler for UDP messages relating to failed tasks
    // eslint-disable-next-line no-unused-vars
    globals.udpServerReloadTaskSocket.on('message', async (message, remote) => {
        // ---------------------------------------------------------
        // === Message from Scheduler reload failed log appender ===
        //
        // /scheduler-reload-failed/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level%property{ExecutionId};%message
        // msg[0]  : Identifies the message as coming from scheduler reload failed appender
        // msg[1]  : Host name
        // msg[2]  : Task name
        // msg[3]  : App name
        // msg[4]  : User
        // msg[5]  : Task ID
        // msg[6]  : App ID
        // msg[7]  : Log timestamp
        // msg[8]  : Level of log event
        // msg[9]  : Execution ID
        // msg[10]  : Message

        // ----------------------------------------------------------
        // === Message from Scheduler reload aborted log appender ===
        //
        // /scheduler-reload-aborted/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level%property{ExecutionId};%message
        // msg[0]  : Identifies the message as coming from scheduler reload aborted appender
        // msg[1]  : Host name
        // msg[2]  : Task name
        // msg[3]  : App name
        // msg[4]  : User
        // msg[5]  : Task ID
        // msg[6]  : App ID
        // msg[7]  : Log timestamp
        // msg[8]  : Level of log event
        // msg[9]  : Execution ID
        // msg[10] : Message

        // ----------------------------------------
        // === Message from Engine log appender ===
        //
        // /engine-reload-failed/;%hostname;%property{AppId};%property{SessionId};%property{ActiveUserDirectory};%property{ActiveUserId};%date;%level;%message
        // mag[0]  : Identifies the message as coming from engine reload failedlog appender
        // mag[1]  : Host name
        // mag[2]  : App ID
        // mag[3]  : Session ID
        // mag[4]  : Active user directory
        // mag[5]  : Active user ID
        // mag[6]  : Log timestamp
        // mag[7]  : Level of log event
        // mag[8]  : Message

        // ----------------------------------------
        // === Default handler ===
        // This is kept for legacy reasons, to support those systems that still use the (much) older,
        // original log appender file that was included with early Butler versions.
        // It's strongly recommended to update the log appender XML to the format used in the most recent Butler version,
        // as this gives much more flexibility to implement log initiated events in Butler.
        //
        // %hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level%property{ExecutionId};%message
        // msg[0]  : Host name
        // msg[1]  : Task name
        // msg[2]  : App name
        // msg[3]  : User
        // msg[4]  : Task ID
        // msg[5]  : App ID
        // msg[6]  : Log timestamp
        // msg[7]  : Level of log event
        // msg[8]  : Execution ID
        // msg[9]  : Message

        try {
            const msg = message.toString().split(';');

            if (msg[0].toLowerCase() === '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users
                globals.logger.verbose(
                    `TASKFAILURE: Received reload failed UDP message from engine: Host=${msg[1]}, AppID=${msg[2]}, User directory=${msg[4]}, User=${msg[5]}`
                );
            } else if (msg[0].toLowerCase() === '/scheduler-reload-failed/') {
                // Scheduler log appender detecting failed scheduler-started reload
                // 2nd parameter is used to detemine if the msg parameter is "legacy" (true) or not (false).
                // Legacy format was the format used before the first field was changed to be used for command passing, i.e. /..../
                schedulerFailed(msg, false);
            } else if (msg[0].toLowerCase() === '/scheduler-reload-aborted/') {
                // Scheduler log appender detecting aborted scheduler-started reload
                schedulerAborted(msg);
            } else if (msg[0].toLowerCase() === '/scheduler-reloadtask-success/') {
                // Scheduler log appender detecting successful scheduler-started reload task
                schedulerReloadTaskSuccess(msg);
            } else {
                // Scheduler log appender detecting failed scheduler-started reload.
                // This is default to better support legacy Butler installations. See above.

                // This is the "legacy mode" event.
                // In the early Butler version there was only a single event sent from log4net to Butler.
                // It was sent when scheduled tasks failed and did not include any message type in the first field.
                // Instead the first field contained the host name on which the event originated.
                schedulerFailed(msg, true);
            }
        } catch (err) {
            globals.logger.error(`TASKFAILURE: Failed processing log event: ${err}`);
        }
    });
};

export default udpInitTaskErrorServer;
