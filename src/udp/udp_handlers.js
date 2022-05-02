// Load global variables and functions
const globals = require('../globals');
const smtp = require('../lib/smtp');
const slack = require('../lib/slack_notification');
const webhookOut = require('../lib/webhook_notification');
const msteams = require('../lib/msteams_notification');
const signl4 = require('../lib/incident_mgmt/signl4');
const newRelic = require('../lib/incident_mgmt/new_relic');
const { failedTaskStoreLogOnDisk } = require('../lib/scriptlog');

// Handler for failed scheduler initiated reloads
const schedulerAborted = (msg) => {
    globals.logger.verbose(
        `TASKFABORTED: Received reload aborted UDP message from scheduler: Host=${msg[1]}, App name=${msg[3]}, User=${msg[4]}, Log level=${msg[8]}`
    );

    // First field in message (msg[0]) is message category (this is the modern/recent message format)

    // Post to Signl4 when a task has failed, if enabled
    if (
        globals.config.has('Butler.incidentTool.signl4.enable') &&
        globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.enable') &&
        globals.config.get('Butler.incidentTool.signl4.enable') === true &&
        globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.enable') === true
    ) {
        signl4.sendReloadTaskAbortedNotification({
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
        });
    }

    // Post to Slack when a reload task has been aborted (typically from the QMC, or via APIs), if Slack is enabled
    if (
        globals.config.has('Butler.slackNotification.enable') &&
        globals.config.has('Butler.slackNotification.reloadTaskAborted.enable') &&
        globals.config.get('Butler.slackNotification.enable') === true &&
        globals.config.get('Butler.slackNotification.reloadTaskAborted.enable') === true
    ) {
        slack.sendReloadTaskAbortedNotificationSlack({
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
        });
    }

    // Post to MS Teams when a reload task been aborted (typically from the QMC, or via APIs), if Teams is enabled
    if (
        globals.config.has('Butler.teamsNotification.enable') &&
        globals.config.has('Butler.teamsNotification.reloadTaskAborted.enable') &&
        globals.config.get('Butler.teamsNotification.enable') === true &&
        globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable') === true
    ) {
        msteams.sendReloadTaskAbortedNotificationTeams({
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
        });
    }

    // Send notification email when task has been aborted (typically from the QMC, or via APIs), if this notification type is enabled
    if (
        globals.config.has('Butler.emailNotification.enable') &&
        globals.config.has('Butler.emailNotification.reloadTaskAborted.enable') &&
        globals.config.get('Butler.emailNotification.enable') === true &&
        globals.config.get('Butler.emailNotification.reloadTaskAborted.enable') === true
    ) {
        smtp.sendReloadTaskAbortedNotificationEmail({
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
        });
    }

    // Call outgoing webhooks when task has been aborted
    // Note that there is no enable/disable flag for failed reloads.
    // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
    if (
        globals.config.has('Butler.webhookNotification.enable') &&
        globals.config.get('Butler.webhookNotification.enable') === true
    ) {
        webhookOut.sendReloadTaskAbortedNotificationWebhook({
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
        });
    }

    // Publish basic MQTT message containing task name when a task has been aborted, if MQTT is enabled
    if (
        globals.config.has('Butler.mqttConfig.enable') &&
        globals.config.get('Butler.mqttConfig.enable') === true &&
        globals.config.has('Butler.mqttConfig.taskAbortedTopic')
    ) {
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskAbortedTopic'), msg[2]);
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
            })
        );
    }
};

// Handler for failed scheduler initiated reloads
const schedulerFailed = (msg, legacyFlag) => {
    globals.logger.verbose(
        `TASKFAILURE: Received reload failed UDP message from scheduler: Host=${msg[0]}, App name=${msg[2]}, Task name=${msg[1]}, Log level=${msg[7]}`
    );

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

        // Post to Signl4 when a task has failed, if enabled
        if (
            globals.config.has('Butler.incidentTool.signl4.enable') &&
            globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable') &&
            globals.config.get('Butler.incidentTool.signl4.enable') === true &&
            globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable') === true
        ) {
            signl4.sendReloadTaskFailureNotification({
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

        // Post to New Relic when a task has failed, if enabled
        if (
            globals.config.has('Butler.incidentTool.newRelic.enable') &&
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.enable') &&
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.enable') === true
        ) {
            newRelic.sendReloadTaskFailureNotification({
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

        // Post to Slack when a task has failed, if Slack is enabled
        if (
            globals.config.has('Butler.slackNotification.enable') &&
            globals.config.has('Butler.slackNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.slackNotification.enable') === true &&
            globals.config.get('Butler.slackNotification.reloadTaskFailure.enable') === true
        ) {
            slack.sendReloadTaskFailureNotificationSlack({
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

        // Post to MS Teams when a task has failed, if Teams is enabled
        if (
            globals.config.has('Butler.teamsNotification.enable') &&
            globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.teamsNotification.enable') === true &&
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
        ) {
            msteams.sendReloadTaskFailureNotificationTeams({
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

        // Send notification email when task has failed, if this notification type is enabled
        if (
            globals.config.has('Butler.emailNotification.enable') &&
            globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.emailNotification.enable') === true &&
            globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') === true
        ) {
            smtp.sendReloadTaskFailureNotificationEmail({
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

        // Call outgoing webhooks when task has failed
        // Note that there is no enable/disable flag for failed reloads.
        // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
        if (
            globals.config.has('Butler.webhookNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.webhookNotification.reloadTaskFailure.enable') === true
        ) {
            webhookOut.sendReloadTaskFailureNotificationWebhook({
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
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[1]);
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
        // First field in message (msg[0]) is message category (this is the modern/recent message format)

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
            });
        }

        // Post to Signl4 when a task has failed, if enabled
        if (
            globals.config.has('Butler.incidentTool.signl4.enable') &&
            globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable') &&
            globals.config.get('Butler.incidentTool.signl4.enable') === true &&
            globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable') === true
        ) {
            signl4.sendReloadTaskFailureNotification({
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
            });
        }

        // Post to New Relic when a task has failed, if enabled
        if (
            globals.config.has('Butler.incidentTool.newRelic.enable') &&
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.enable') &&
            globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.enable') === true
        ) {
            newRelic.sendReloadTaskFailureNotification({
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
            });
        }

        // Post to Slack when a task has failed, if Slack is enabled
        if (
            globals.config.has('Butler.slackNotification.enable') &&
            globals.config.has('Butler.slackNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.slackNotification.enable') === true &&
            globals.config.get('Butler.slackNotification.reloadTaskFailure.enable') === true
        ) {
            slack.sendReloadTaskFailureNotificationSlack({
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
            });
        }

        // Post to MS Teams when a task has failed, if Teams is enabled
        if (
            globals.config.has('Butler.teamsNotification.enable') &&
            globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.teamsNotification.enable') === true &&
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
        ) {
            msteams.sendReloadTaskFailureNotificationTeams({
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
            });
        }

        // Send notification email when task has failed, if this notification type is enabled
        if (
            globals.config.has('Butler.emailNotification.enable') &&
            globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') &&
            globals.config.get('Butler.emailNotification.enable') === true &&
            globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') === true
        ) {
            smtp.sendReloadTaskFailureNotificationEmail({
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
            });
        }

        // Call outgoing webhooks when task has failed
        // Note that there is no enable/disable flag for failed reloads.
        // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
        if (
            globals.config.has('Butler.webhookNotification.enable') &&
            globals.config.get('Butler.webhookNotification.enable') === true
        ) {
            webhookOut.sendReloadTaskFailureNotificationWebhook({
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
            });
        }

        // Publish basic MQTT message containing task name when a task has failed, if MQTT is enabled
        if (
            globals.config.has('Butler.mqttConfig.enable') &&
            globals.config.get('Butler.mqttConfig.enable') === true &&
            globals.config.has('Butler.mqttConfig.taskFailureTopic')
        ) {
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[2]);
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
                })
            );
        }
    }
};

// --------------------------------------------------------
// Set up UDP server handlers for acting on Sense failed task events
// --------------------------------------------------------
module.exports.udpInitTaskErrorServer = () => {
    // Handler for UDP server startup event
    // eslint-disable-next-line no-unused-vars
    globals.udpServerTaskFailureSocket.on('listening', (message, remote) => {
        const address = globals.udpServerTaskFailureSocket.address();

        globals.logger.info(`TASKFAILURE: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
        }
    });

    // Handler for UDP error event
    // eslint-disable-next-line no-unused-vars
    globals.udpServerTaskFailureSocket.on('error', (message, remote) => {
        const address = globals.udpServerTaskFailureSocket.address();
        globals.logger.error(`TASKFAILURE: UDP server error on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has reported an error
        if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
        }
    });

    // Main handler for UDP messages relating to failed tasks
    // eslint-disable-next-line no-unused-vars
    globals.udpServerTaskFailureSocket.on('message', async (message, remote) => {
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
