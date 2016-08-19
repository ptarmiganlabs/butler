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

        if ( (topic == globals.config.get('Butler.mqttConfig.sessionStartTopic')) || 
        	(topic == globals.config.get('Butler.mqttConfig.connectionOpenTopic')) ) {
            // Handle dict of currently active users
            // Message arrives as "serverName: directoryName/userName
            var array1 = message.toString().split(': ');
            var array2 = array1[1].split('/');

            var serverName = array1[0];
            var directoryName = array2[0];
            var userName = array2[1];

            console.info('Adding active user');
            globals.currentUsers.set(userName, serverName);     // Add user as active

            // Build JSON of all active users
            var activeUsers = [];
            globals.currentUsers.forEach(function (value, key) {
                activeUsers.push(key);
            });

            var activeUsersJSON = JSON.stringify(activeUsers);

            // Send MQTT messages relating to active users
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.activeUserCountTopic').toString(), globals.currentUsers.size.toString());
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.activeUsersTopic').toString(), activeUsersJSON);

            console.info('# of active users: ' + globals.currentUsers.size );
        }

        if (topic == globals.config.get('Butler.mqttConfig.sessionStopTopic')) {
            // Handle dict of currently active users
            // Message arrives as "serverName: directoryName/userName
            var array1 = message.toString().split(': ');
            var array2 = array1[1].split('/');

            var serverName = array1[0];
            var directoryName = array2[0];
            var userName = array2[1];

            console.info('Removing active user');
            globals.currentUsers.delete(userName);              // Remove user from list of active users

            // Build JSON of all active users
            var activeUsers = [];
            globals.currentUsers.forEach(function (value, key) {
                activeUsers.push(key);
            });

            var activeUsersJSON = JSON.stringify(activeUsers);

            // Send MQTT messages relating to active users
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.activeUserCountTopic').toString(), globals.currentUsers.size.toString());
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.activeUsersTopic').toString(), activeUsersJSON);

            console.info('# of active users: ' + globals.currentUsers.size );
        }

    });


    // Handler for MQTT errors
    globals.mqttClient.on('error', function (topic, message) {
        // Error occured
        console.error('MQTT error: ' + message);
    });
};
