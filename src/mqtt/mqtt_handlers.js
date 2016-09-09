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


        var array1, array2, serverName, directoryName, userName;
        var activeUsers = [], activeUsersJSON;
        var activeUsersPerServer = [], activeUsersPerServerJSON;

        if ( (topic == globals.config.get('Butler.mqttConfig.sessionStartTopic')) || 
            (topic == globals.config.get('Butler.mqttConfig.connectionOpenTopic')) ) {

            // Handle dict of currently active users
            // Message arrives as "serverName: directoryName/userName
            array1 = message.toString().split(': ');
            array2 = array1[1].split('/');

            serverName = array1[0];
            directoryName = array2[0];
            userName = array2[1];

            console.info('Adding active user');
            globals.currentUsers.set(userName, serverName);     // Add user as active

            // Build JSON of all active users
            globals.currentUsers.forEach(function (value, key) {
                activeUsers.push(key);      // Push to overall list of active users
            });

            activeUsersJSON = JSON.stringify(activeUsers);


            // Handle dict of currently active users, split on proxy they are connected through
            var serverObj;
            if (globals.currentUsersPerServer.has(serverName)) {
                // Server already exists in dict - get it
                serverObj = globals.currentUsersPerServer.get(serverName);
            } else {
                serverObj = dict();
            }

            serverObj.set(userName, '');
            globals.currentUsersPerServer.set(serverName, serverObj);

            // Debug output
            globals.currentUsersPerServer.forEach(function (value, key) {
                console.log('server:' + key + ', users:' + JSON.stringify(value))
            });


            // Send MQTT messages relating to active users
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.activeUserCountTopic').toString(), globals.currentUsers.size.toString());
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.activeUsersTopic').toString(), activeUsersJSON);

            console.info('# of active users: ' + globals.currentUsers.size );
        }

        if (topic == globals.config.get('Butler.mqttConfig.sessionStopTopic')) {
            // Handle dict of currently active users
            // Message arrives as "serverName: directoryName/userName
            array1 = message.toString().split(': ');
            array2 = array1[1].split('/');

            serverName = array1[0];
            directoryName = array2[0];
            userName = array2[1];

            console.info('Removing active user');
            globals.currentUsers.delete(userName);              // Remove user from list of active users

            // Build JSON of all active users
            globals.currentUsers.forEach(function (value, key) {
                activeUsers.push(key);
            });

            activeUsersJSON = JSON.stringify(activeUsers);

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
