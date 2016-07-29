var dict = require("dict");


// Load global variables and functions
var globals = require('../globals');

module.exports.mqttInitHandlers = function () {
    // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
    globals.mqttClient.on('connect', function () {
        console.info('Connected to MQTT broker');

        // Let the world know that Butler is connected to MQTT
        globals.mqttClient.publish('qliksense/butler/mqtt/status', 'Connected to MQTT broker');

        // Have Butler listen to all messages in the qliksense/ subtree
        globals.mqttClient.subscribe('qliksense/#');
    });


    // Handler for MQTT messages matching the previously set up subscription
    globals.mqttClient.on('message', function (topic, message) {
        console.info('MQTT message received');
        console.info(topic.toString());
        console.info(message.toString());

        // **MQTT message dispatch**
        // Start Sense task
        if (topic == 'qliksense/start_task') {
            globals.qrsUtil.senseStartTask.senseStartTask(message.toString());
        }

        // Handle dict of currently active users
        // Message arrives as "serverName: directoryName/userName
        var strMessage = new String(message);
        var array1 = strMessage.split(': ');
        var array2 = array1[1].split('/');

        var serverName = array1[0];
        var directoryName = array2[0];
        var userName = array2[1];

        if (topic == 'qliksense/session/start') {
            console.info('Adding active user');
            globals.currentUsers.set(userName, serverName);
        }

        if (topic == 'qliksense/session/stop') {
            console.info('Removing active user');
            globals.currentUsers.delete(userName);
        }

        console.info('# of active users: ' + globals.currentUsers.size );
    });


    // Handler for MQTT errors
    globals.mqttClient.on('error', function (topic, message) {
        // Error occured
        console.error('MQTT error: ' + message);
    });
};
