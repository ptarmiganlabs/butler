/* eslint-disable no-unused-vars */
/* eslint strict: ["error", "global"] */

'use strict';

// Load global variables and functions
var globals = require('../globals');
var smtp = require('../lib/smtp');
var slack = require('../lib/slack_notification');
var slackApi = require('../lib/slack_api.js');
var msteams = require('../lib/msteams_notification');


// Handler for failed scheduler initiated reloads
var schedulerFailed = function (msg) {
    globals.logger.verbose(
        `TASKFAILURE: Received reload failed UDP message from scheduler: Host=${msg[0]}, App name=${msg[2]}, Task name=${msg[1]}, Log level=${msg[7]}`,
    );

    // Post to Slack when a task has failed, if Slack is enabled
    if (globals.config.has('Butler.slackNotification.enable') && globals.config.get('Butler.slackNotification.enable') == true) {
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
        globals.config.get('Butler.teamsNotification.enable') == true &&
        globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') == true
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
        globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') &&
        globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') == true
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

    // Publish MQTT message when a task has failed, if MQTT enabled
    if (
        globals.config.has('Butler.mqttConfig.enable') &&
        globals.config.get('Butler.mqttConfig.enable') == true &&
        globals.config.has('Butler.mqttConfig.taskFailureTopic')
    ) {
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[1]);
    }    
};


// --------------------------------------------------------
// Set up UDP server handlers for acting on Sense failed task events
// --------------------------------------------------------
module.exports.udpInitTaskErrorServer = function () {
    // Handler for UDP server startup event
    globals.udpServerTaskFailureSocket.on('listening', function (message, remote) {
        var address = globals.udpServerTaskFailureSocket.address();

        globals.logger.info(`TASKFAILURE: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
    });

    // Handler for UDP error event
    globals.udpServerTaskFailureSocket.on('error', function (message, remote) {
        var address = globals.udpServerTaskFailureSocket.address();
        globals.logger.error(`TASKFAILURE: UDP server error on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has reported an error
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
    });

    // Main handler for UDP messages relating to failed tasks
    // TODO verify that new scheduler-reload-failed message commmand works as intended
    globals.udpServerTaskFailureSocket.on('message', async function (message, remote) {
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
        // /engine/;%hostname;%property{AppId};%property{SessionId};%property{ActiveUserId};%date;%level;%message
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
            let msg = message.toString().split(';');

            if (msg[0].toLowerCase() == '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users
                globals.logger.verbose(
                    `TASKFAILURE: Received reload failed UDP message from engine: Host=${msg[0]}, AppID=${msg[2]}, User directory=${msg[4]}, User=${msg[5]}`,
                );
            } else if (msg[0].toLowerCase() == '/scheduler-reload-failed/') {
                // Scheduler log appender detecting failed scheduler-started reload
                schedulerFailed(msg);
            } else if (msg[0].toLowerCase() == '/scheduler-reload-aborted/') {
                // Scheduler log appender detecting aborted scheduler-started reload
                globals.logger.verbose(
                    `TASKFAILURE: Received reload aborted UDP message from scheduler: Host=${msg[1]}, App name=${msg[3]}, User=${msg[4]}, Log level=${msg[8]}`,
                );

                // Post to Slack when a reload task has been aborted (typically from the QMC, or via APIs), if Slack is enabled
                if (globals.config.has('Butler.slackNotification.enable') && globals.config.get('Butler.slackNotification.enable') == true) {
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
                    globals.config.has('Butler.teamsNotification.reladTaskAborted.enable') &&
                    globals.config.get('Butler.teamsNotification.enable') == true &&
                    globals.config.get('Butler.teamsNotification.reladTaskAborted.enable') == true
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
                    globals.config.has('Butler.emailNotification.reladTaskAborted.enable') &&
                    globals.config.get('Butler.emailNotification.reladTaskAborted.enable') == true
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

                // Publish MQTT message when a task has been aborted, if MQTT enabled
                if (
                    globals.config.has('Butler.mqttConfig.enable') &&
                    globals.config.get('Butler.mqttConfig.enable') == true &&
                    globals.config.has('Butler.mqttConfig.taskAbortedTopic')
                ) {
                    globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskAbortedTopic'), msg[2]);
                }
            } else {
                // Scheduler log appender detecting failed scheduler-started reload.
                // This is default to better support legacy Butler installations. See above.
                schedulerFailed(msg);
            }
        } catch (err) {
            globals.logger.error(`TASKFAILURE: Failed processing log event: ${err}`);
        }
    });
};

// --------------------------------------------------------
// Set up UDP server for acting on Sense session and connection events
// --------------------------------------------------------
module.exports.udpInitSessionConnectionServer = function () {
    // Handler for UDP server startup event
    globals.udpServerSessionConnectionSocket.on('listening', function (message, remote) {
        var address = globals.udpServerSessionConnectionSocket.address();

        globals.logger.info(`SESSIONS: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.sessionServerStatusTopic'), 'start');
    });

    // Handler for UDP error event
    globals.udpServerSessionConnectionSocket.on('error', function (message, remote) {
        var address = globals.udpServerSessionConnectionSocket.address();
        globals.logger.error(`SESSIONS: UDP server error on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has reported an error
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.sessionServerStatusTopic'), 'error');
    });

    // Main handler for UDP messages relating to session and connection events
    globals.udpServerSessionConnectionSocket.on('message', async function (message, remote) {
        try {
            var msg = message.toString().split(';');
            globals.logger.info(`SESSIONS: ${msg[0]}: ${msg[1]} for user ${msg[2]}/${msg[3]}`);

            // Send notification to MS Teams, if enabled
            if (
                globals.config.has('Butler.slackNotification.enable') &&
                globals.config.has('Butler.slackNotification.userSessionEvents.enable') &&
                globals.config.get('Butler.slackNotification.enable') == true &&
                globals.config.get('Butler.slackNotification.userSessionEvents.enable') == true
            ) {
                let slackConfig = {
                    text: {
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'plain_text',
                                    text: msg[1] + ',  user: ' + msg[2] + '/' + msg[3] + ' on server ' + msg[0],
                                },
                            },
                        ],
                    },
                    fromUser: globals.config.get('Butler.slackNotification.userSessionEvents.fromUser'),
                    channel: globals.config.get('Butler.slackNotification.userSessionEvents.channel'),
                    iconEmoji: globals.config.get('Butler.slackNotification.userSessionEvents.iconEmoji'),
                    messageType: 'useractivity',
                    webhookUrl: globals.config.get('Butler.slackNotification.userSessionEvents.webhookURL'),
                };

                let res = slackApi.slackSend(slackConfig, globals.logger);
            }

            // Send notification to MS Teams, if enabled
            if (
                globals.config.has('Butler.teamsNotification.enable') &&
                globals.config.has('Butler.teamsNotification.userSessionEvents.enable') &&
                globals.config.get('Butler.teamsNotification.enable') == true &&
                globals.config.get('Butler.teamsNotification.userSessionEvents.enable') == true
            ) {
                await globals.teamsUserSessionObj.send(
                    JSON.stringify({
                        '@type': 'MessageCard',
                        '@context': 'https://schema.org/extensions',
                        summary: msg[1] + ' for user ' + msg[2] + '/' + msg[3],
                        themeColor: '0078D7',
                        title: msg[1] + ' for user ' + msg[2] + '/' + msg[3] + ' on server ' + msg[0],
                    }),
                );
            }

            // Handle session events
            if (msg[1] == 'Start session') {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.sessionStartTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
            }

            if (msg[1] == 'Stop session') {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.sessionStopTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
            }

            // Handle connection events
            if (msg[1] == 'Open connection') {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.connectionOpenTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
            }

            if (msg[1] == 'Close connection') {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.connectionCloseTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
            }
        } catch (err) {
            globals.logger.error(`SESSIONS: Error processing user session event: ${err}`);
        }
    });
};
