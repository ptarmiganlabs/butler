/* eslint-disable no-unused-vars */

// Load global variables and functions
var globals = require('../globals');
var smtp = require('../lib/smtp');

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
    globals.udpServerTaskFailureSocket.on('message', async function (message, remote) {
        // Message from Scheduler reload failed log appender:
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

        // Message from Scheduler reload aborted log appender:
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

        // Message from Engine log appender:
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

        try {
            var msg = message.toString().split(';');

            if (msg[0].toLowerCase() == '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users
                globals.logger.verbose(
                    `TASKFAILURE: Received reload failed UDP message from engine: Host=${msg[0]}, AppID=${msg[2]}, User directory=${msg[4]}, User=${msg[5]}`,
                );
            } else if (msg[0].toLowerCase() == '/scheduler-reload-aborted/') {
                // Engine log appender detecting aborted reload, also ones initiated interactively by users
                globals.logger.verbose(
                    `TASKFAILURE: Received reload aborted UDP message from scheduler: Host=${msg[1]}, App name=${msg[3]}, User=${msg[4]}, Log level=${msg[8]}`,
                );

                // Post to Slack when a reload task has been aborted (typically from the QMC, or via APIs), if Slack is enabled
                if (globals.config.has('Butler.slackConfig.enable') && globals.config.get('Butler.slackConfig.enable') == true && globals.config.has('Butler.slackConfig.taskAbortedChannel')) {
                    globals.slackObj.send({
                        text: 'User ' + msg[4] + ' stopped running task: "' + msg[2] + '", linked to app "' + msg[3] + '".',
                        channel: globals.config.get('Butler.slackConfig.taskAbortedChannel'),
                        username: msg[1],
                        icon_emoji: ':ghost:',
                    });
                }

                // Post to MS Teams when a reload task been aborted (typically from the QMC, or via APIs), if Teams is enabled
                if (globals.config.has('Butler.teamsConfig.enable') && globals.config.get('Butler.teamsConfig.enable') == true) {
                    await globals.teamsTaskFailureObj.send(
                        JSON.stringify({
                            '@type': 'MessageCard',
                            '@context': 'https://schema.org/extensions',
                            summary: 'A running reload task has been stopped in Qlik Sense',
                            themeColor: '0078D7',
                            title: `User ${msg[4]} stopped task: ${msg[2]}, app name "${msg[3]}"`,
                            sections: [
                                {
                                    // activityTitle: msg[2],
                                    // activitySubtitle: msg[1],

                                    text: 'Please refer to the QMC for further details',
                                },
                            ],
                        }),
                    );
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

                // Publish MQTT message when a task has failed, if MQTT enabled
                if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') == true && globals.config.has('Butler.mqttConfig.taskAbortedTopic')) {
                    globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskAbortedTopic'), msg[2]);
                }
            } else {
                // Scheduler load appender
                globals.logger.verbose(
                    `TASKFAILURE: Received reload failed UDP message from scheduler: Host=${msg[0]}, App name=${msg[2]}, Task name=${msg[1]}, Log level=${msg[7]}`,
                );

                // Post to Slack when a task has failed, if Slack is enabled
                if (globals.config.has('Butler.slackConfig.enable') && globals.config.get('Butler.slackConfig.enable') == true && globals.config.has('Butler.slackConfig.taskFailureChannel')) {
                    globals.slackObj.send({
                        text: 'Failed task: "' + msg[1] + '", linked to app "' + msg[2] + '".',
                        channel: globals.config.get('Butler.slackConfig.taskFailureChannel'),
                        username: msg[0],
                        icon_emoji: ':ghost:',
                    });
                }

                // Post to MS Teams when a task has failed, if Teams is enabled
                if (globals.config.has('Butler.teamsConfig.enable') && globals.config.get('Butler.teamsConfig.enable') == true) {
                    await globals.teamsTaskFailureObj.send(
                        JSON.stringify({
                            '@type': 'MessageCard',
                            '@context': 'https://schema.org/extensions',
                            summary: 'A reload task has failed in Qlik Sense',
                            themeColor: '0078D7',
                            title: `Failed task: ${msg[1]}, app name "${msg[2]}"`,
                            sections: [
                                {
                                    // activityTitle: msg[2],
                                    // activitySubtitle: msg[1],

                                    text: 'Please refer to the QMC for further details',
                                },
                            ],
                        }),
                    );
                }

                // Send notification email when task has failed, if this notification type is enabled
                if (
                    globals.config.has('Butler.emailNotification.reladTaskFailure.enable') &&
                    globals.config.get('Butler.emailNotification.reladTaskFailure.enable') == true
                ) {
                    smtp.sendReloadTaskFailureNotificationEmail({
                        hostName: msg[0],
                        user: msg[3],
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
                if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') == true && globals.config.has('Butler.mqttConfig.taskFailureTopic')) {
                    globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[1]);
                }
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
    //  globals.udpServerSessionConnectionSocket.on('listening', () => {
    globals.udpServerSessionConnectionSocket.on('listening', function (message, remote) {
        var address = globals.udpServerSessionConnectionSocket.address();

        globals.logger.info(`SESSIONS: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.sessionServerStatusTopic'), 'start');
    });

    // Handler for UDP error event
    //  globals.udpServerSessionConnectionSocket.on('error', () => {
    globals.udpServerSessionConnectionSocket.on('error', function (message, remote) {
        var address = globals.udpServerSessionConnectionSocket.address();
        globals.logger.error(`SESSIONS: UDP server error on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has reported an error
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.sessionServerStatusTopic'), 'error');
    });

    // Main handler for UDP messages relating to session and connection events
    globals.udpServerSessionConnectionSocket.on('message', function (message, remote) {
        var msg = message.toString().split(';');
        globals.logger.info(`SESSIONS: ${msg[0]}: ${msg[1]} for user ${msg[2]}/${msg[3]}`);

        // Send Slack message when session starts/stops, or a connection open/close
        globals.slackObj.send({
            text: msg[1] + ' for user ' + msg[2] + '/' + msg[3],
            channel: globals.config.get('Butler.slackConfig.loginNotificationChannel'),
            username: msg[0],
            icon_emoji: '',
        });

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
    });
};
