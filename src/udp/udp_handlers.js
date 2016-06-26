// Load global variables and functions
var globals = require('../globals');


// --------------------------------------------------------
// Set up UDP server handlers for acting on Sense failed task events
// --------------------------------------------------------
module.exports.udpInitTaskErrorServer = function () {
    // Handler for UDP server startup event
    globals.udpServerTaskFailureSocket.on('listening', function(message, remote) {
        var address = globals.udpServerTaskFailureSocket.address();
        console.info('UDP server listening on %s:%s', address.address, address.port);
        // Publish MQTT message that UDP server has started
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
    });

    // Handler for UDP error event
    globals.udpServerTaskFailureSocket.on('error', function(message, remote) {
        var address = globals.udpServerTaskFailureSocket.address();
        console.error('UDP server error on %s:%s', address.address, address.port);
        // Publish MQTT message that UDP server has reported an error
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
    });

    // Main handler for UDP messages relating to failed tasks
    globals.udpServerTaskFailureSocket.on('message', function(message, remote) {
        var msg = message.toString().split(';');
        console.info('%s: Task "%s" failed, associated with app "%s', msg[0], msg[1], msg[2], msg[3]);

        // Post to Slack when a task has failed
        globals.slack.send({
            text: 'Failed task: "' + msg[1] + '", linked to app "' + msg[2] + '".',
            channel: globals.slackTaskFailureChannel,
            username: msg[0],
            icon_emoji: ':ghost:'
        });

        // Publish MQTT message when a task has failed
        globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[1]);
    });

};


// --------------------------------------------------------
// Set up UDP server for acting on Sense session and connection events
// --------------------------------------------------------
module.exports.udpInitSessionConnectionServer = function () {

    // Handler for UDP server startup event
    globals.udpServerSessionConnectionSocket.on('listening', function(message, remote) {
        var address = globals.udpServerSessionConnectionSocket.address();
        console.info('UDP server listening on %s:%s', address.address, address.port);

        // Publish MQTT message that UDP server has started
        globals.mqttClient.publish('qliksense/butler/session_server', 'start');
    });

    // Handler for UDP error event
    globals.udpServerSessionConnectionSocket.on('error', function(message, remote) {
        var address = globals.udpServerSessionConnectionSocket.address();
        console.error('UDP server error on %s:%s', address.address, address.port);
        // Publish MQTT message that UDP server has reported an error
        globals.mqttClient.publish('qliksense/butler/session_server', 'error');
    });

    // Main handler for UDP messages relating to session and connection events
    globals.udpServerSessionConnectionSocket.on('message', function(message, remote) {
        var msg = message.toString().split(';');
        console.info('%s: %s for user %s/%s', msg[0], msg[1], msg[2], msg[3]);

        // Send Slack message when session starts/stops, or a connection open/close
        globals.slack.send({
            text: msg[1] + ' for user ' + msg[2] + '/' + msg[3],
            channel: globals.slackLoginNotificationChannel,
            username: msg[0],
            icon_emoji: ''
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
