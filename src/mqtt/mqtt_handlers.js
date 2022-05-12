// Load global variables and functions
const globals = require('../globals');
const qrsUtil = require('../qrs_util');

module.exports.mqttInitHandlers = () => {
    if (globals.mqttClient) {
        // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
        globals.mqttClient.on('connect', () => {
            globals.logger.info(
                `Connected to MQTT server ${globals.config.get('Butler.mqttConfig.brokerHost')}:${globals.config.get(
                    'Butler.mqttConfig.brokerPort'
                )}, with client ID ${globals.mqttClient.options.clientId}`
            );

            // Let the world know that Butler is connected to MQTT
            // console.info('Connected to MQTT broker');
            globals.mqttClient.publish(
                'qliksense/butler/mqtt/status',
                `Connected to MQTT broker ${globals.config.get('Butler.mqttConfig.brokerHost')}:${globals.config.get(
                    'Butler.mqttConfig.brokerPort'
                )} with client ID ${globals.mqttClient.options.clientId}`
            );

            // Have Butler listen to all messages in the topic subtree specified in the config file
            globals.mqttClient.subscribe(globals.config.get('Butler.mqttConfig.subscriptionRootTopic'));
        });

        // Handler for MQTT messages matching the previously set up subscription
        globals.mqttClient.on('message', (topic, message) => {
            try {
                globals.logger.verbose(`MQTT message received. Topic=${topic.toString()},  Message=${message.toString()}`);

                // **MQTT message dispatch**
                // Start Sense task
                if (topic === globals.config.get('Butler.mqttConfig.taskStartTopic')) {
                    globals.logger.info(`MQTT: Starting task ID ${message.toString()}.`);
                    qrsUtil.senseStartTask.senseStartTask(message.toString());
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
