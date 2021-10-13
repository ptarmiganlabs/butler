const dict = require('dict');

// Load global variables and functions
const globals = require('../globals');
const qrsUtil = require('../qrs_util');

module.exports.mqttInitHandlers = () => {
    if (globals.mqttClient) {
        // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
        globals.mqttClient.on('connect', () => {
            globals.logger.info(
                `Connected to MQTT server ${globals.config.get(
                    'Butler.mqttConfig.brokerHost'
                )}:${globals.config.get('Butler.mqttConfig.brokerPort')}, with client ID ${
                    globals.mqttClient.options.clientId
                }`
            );

            // Let the world know that Butler is connected to MQTT
            // console.info('Connected to MQTT broker');
            globals.mqttClient.publish(
                'qliksense/butler/mqtt/status',
                `Connected to MQTT broker ${globals.config.get(
                    'Butler.mqttConfig.brokerHost'
                )}:${globals.config.get('Butler.mqttConfig.brokerPort')} with client ID ${
                    globals.mqttClient.options.clientId
                }`
            );

            // Have Butler listen to all messages in the topic subtree specified in the config file
            globals.mqttClient.subscribe(
                globals.config.get('Butler.mqttConfig.subscriptionRootTopic')
            );
        });

        // Handler for MQTT messages matching the previously set up subscription
        globals.mqttClient.on('message', (topic, message) => {
            try {
                globals.logger.verbose(
                    `MQTT message received. Topic=${topic.toString()},  Message=${message.toString()}`
                );

                // **MQTT message dispatch**
                // Start Sense task
                if (topic === globals.config.get('Butler.mqttConfig.taskStartTopic')) {
                    globals.logger.info(`MQTT: Starting task ID ${message.toString()}.`);
                    qrsUtil.senseStartTask.senseStartTask(message.toString());
                }

                let array1;
                let array2;
                let serverName;
                let userName;
                // var directoryName;
                const activeUsers = [];
                let activeUsersJSON;
                // var activeUsersPerServer = [],
                //     activeUsersPerServerJSON;
                let serverObj;

                if (
                    topic === globals.config.get('Butler.mqttConfig.sessionStartTopic') ||
                    topic === globals.config.get('Butler.mqttConfig.connectionOpenTopic')
                ) {
                    // Handle dict of currently active users
                    // Message arrives as "serverName: directoryName/userName
                    array1 = message.toString().split(': ');
                    array2 = array1[1].split('/');

                    serverName = array1[0];
                    // directoryName = array2[0];
                    userName = array2[1];

                    globals.logger.verbose(
                        `MQTT: Adding active user: ${userName} on server ${serverName}`
                    );
                    globals.currentUsers.set(userName, serverName); // Add user as active

                    // Build JSON of all active users
                    globals.currentUsers.forEach((value, key) => {
                        activeUsers.push(key); // Push to overall list of active users
                    });

                    activeUsersJSON = JSON.stringify(activeUsers);

                    // Handle dict of currently active users, split on proxy they are connected through
                    if (globals.currentUsersPerServer.has(serverName)) {
                        // Server already exists in dict - get it
                        serverObj = globals.currentUsersPerServer.get(serverName);
                    } else {
                        serverObj = dict();
                    }

                    serverObj.set(userName, 'active');
                    globals.currentUsersPerServer.set(serverName, serverObj);

                    // Send active user count messages to MQTT, one for each proxy node
                    globals.currentUsersPerServer.forEach((value, key) => {
                        globals.logger.verbose(
                            `MQTT: server:${key}, users:${JSON.stringify(value)}`
                        );
                        // console.info('server:' + key + ', users:' + JSON.stringify(value));
                        //                console.log('=========');
                        //                console.log('server:' + key + ', # of users=' + globals.currentUsersPerServer.size);
                        //                value.forEach(function(value2, key2) {
                        //                    console.log('key2:' + key2);
                        //                    console.log('value2:' + value2);
                        //                });
                        // Send MQTT message with info on # of active users per proxy
                        //                console.log('--------');
                        //                console.log(globals.currentUsersPerServer.get(key).size);
                        globals.mqttClient.publish(
                            `qliksense/users/activeperserver/${key}/count`,
                            globals.currentUsersPerServer.get(key).size.toString()
                        );
                        //                console.log('--------');
                    });

                    // Send MQTT messages relating to active users
                    globals.mqttClient.publish(
                        globals.config.get('Butler.mqttConfig.activeUserCountTopic').toString(),
                        globals.currentUsers.size.toString()
                    );
                    globals.mqttClient.publish(
                        globals.config.get('Butler.mqttConfig.activeUsersTopic').toString(),
                        activeUsersJSON
                    );

                    globals.logger.info(`MQTT: # of active users: ${globals.currentUsers.size}`);
                }

                if (topic === globals.config.get('Butler.mqttConfig.sessionStopTopic')) {
                    // Handle dict of currently active users
                    // Message arrives as "serverName: directoryName/userName
                    array1 = message.toString().split(': ');
                    array2 = array1[1].split('/');

                    serverName = array1[0];
                    // directoryName = array2[0];
                    userName = array2[1];

                    globals.logger.verbose(`MQTT: Removing active user: ${userName}`);
                    globals.currentUsers.delete(userName); // Remove user from list of active users

                    // Build JSON of all active users
                    globals.currentUsers.forEach((value, key) => {
                        activeUsers.push(key);
                    });

                    activeUsersJSON = JSON.stringify(activeUsers);

                    // Handle dict of currently active users, split on proxy they are connected through
                    if (globals.currentUsersPerServer.has(serverName)) {
                        // Server already exists in dict - get it.
                        // If the server does not exist in dict there is no reason to proceed
                        serverObj = globals.currentUsersPerServer.get(serverName);

                        serverObj.delete(userName);
                        globals.currentUsersPerServer.set(serverName, serverObj); // Update the main users-per-server dict
                        globals.logger.verbose(
                            `MQTT: ---- Removed user ${userName} from server ${serverName}`
                        );

                        // Send active user count messages to MQTT, one for each proxy node
                        globals.currentUsersPerServer.forEach((value, key) => {
                            //                    console.log('=========');
                            //                    console.log('server:' + key + ', # of users=' + globals.currentUsersPerServer.size);
                            //                    value.forEach(function(value2, key2) {
                            //                        console.log('key2:' + key2);
                            //                        console.log('value2:' + value2);
                            //                    });
                            // Send MQTT message with info on # of active users per proxy
                            globals.mqttClient.publish(
                                `qliksense/users/activeperserver/${key}/count`,
                                globals.currentUsersPerServer.get(key).size.toString()
                            );
                        });
                    }

                    // Send MQTT messages relating to active users
                    globals.mqttClient.publish(
                        globals.config.get('Butler.mqttConfig.activeUserCountTopic').toString(),
                        globals.currentUsers.size.toString()
                    );
                    globals.mqttClient.publish(
                        globals.config.get('Butler.mqttConfig.activeUsersTopic').toString(),
                        activeUsersJSON
                    );

                    globals.logger.info(`MQTT: # of active users: ${globals.currentUsers.size}`);
                }
            } catch (err) {
                globals.logger.error(`MQTT: Error=${JSON.stringify(err, null, 2)}`);
            }
        });

        // Handler for MQTT errors
        globals.mqttClient.on('error', (topic, message) => {
            // Error occured
            globals.logger.error(`MQTT: MQTT error: ${message}`);
        });
    }
};
