const mqtt = require('mqtt');
const { validate } = require('uuid');
const fs = require('fs');
const path = require('path');

// Load global variables and functions
const { config, logger, execPath } = require('../globals');
const globals = require('../globals');
const qrsUtil = require('../qrs_util');

function mqttInitHandlers() {
    try {
        let mqttClient;
        let mqttOptions;

        // MQTT is enabled in config file
        if (config.get('Butler.mqttConfig.enable')) {
            // Are we connectin to a stanard MQTT broker?
            if (config.get('Butler.mqttConfig.azureEventGrid.enable') === false) {
                mqttOptions = {
                    host: config.get('Butler.mqttConfig.brokerHost'),
                    port: config.get('Butler.mqttConfig.brokerPort'),
                };

                mqttClient = mqtt.connect(mqttOptions);

                globals.mqttClient = mqttClient;

                /*
            Following might be needed for conecting to older Mosquitto versions
            var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
                protocolId: 'MQIsdp',
                protocolVersion: 3
            });
            */
            } else if (config.get('Butler.mqttConfig.azureEventGrid.enable')) {
                // Connecting to Azure Event Grid?

                // Load certificate and key files used to authenticate with Azure Event Grid
                // FIle names are store din the config file, Butler.mqttConfig.azureEventGrid.clientCertFile and Butler.mqttConfig.azureEventGrid.clientKeyFile
                const certFile = path.join(execPath, config.get('Butler.mqttConfig.azureEventGrid.clientCertFile'));
                const keyFile = path.join(execPath, config.get('Butler.mqttConfig.azureEventGrid.clientKeyFile'));

                mqttOptions = {
                    clientId: config.get('Butler.mqttConfig.azureEventGrid.clientId'),
                    username: config.get('Butler.mqttConfig.azureEventGrid.clientId'),
                    // protocolVersion: 4,
                    // protocol: 'mqtts',
                    // host: config.get('Butler.mqttConfig.brokerHost'),
                    // port: config.get('Butler.mqttConfig.brokerPort'),
                    key: fs.readFileSync(keyFile),
                    cert: fs.readFileSync(certFile),
                    rejectUnauthorized: false,
                };

                // Connect to MQTT broker
                mqttClient = mqtt.connect(
                    `mqtts://${config.get('Butler.mqttConfig.brokerHost')}:${config.get('Butler.mqttConfig.brokerPort')}`,
                    mqttOptions
                );

                globals.mqttClient = mqttClient;
            } else {
                logger.error('MQTT INIT HANDLERS: MQTT configuration error');
            }

            if (!mqttClient.connected) {
                logger.verbose(
                    `MQTT INIT HANDLERS: Created (but not yet connected) MQTT object for ${mqttOptions.host}:${mqttOptions.port}, protocol version ${mqttOptions.protocolVersion}`
                );
            }

            if (mqttClient) {
                // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
                mqttClient.on('connect', () => {
                    try {
                        logger.info(
                            `Connected to MQTT server ${config.get('Butler.mqttConfig.brokerHost')}:${config.get(
                                'Butler.mqttConfig.brokerPort'
                            )}, with client ID ${mqttClient.options.clientId}`
                        );

                        // Let the world know that Butler is connected to MQTT
                        // console.info('Connected to MQTT broker');
                        mqttClient.publish(
                            'qliksense/butler/mqtt/status',
                            `Connected to MQTT broker ${config.get('Butler.mqttConfig.brokerHost')}:${config.get(
                                'Butler.mqttConfig.brokerPort'
                            )} with client ID ${mqttClient.options.clientId}`
                        );

                        // Have Butler listen to all messages in the topic subtree specified in the config file
                        mqttClient.subscribe(config.get('Butler.mqttConfig.subscriptionRootTopic'));
                    } catch (err) {
                        logger.error(`MQTT CONNECT: Error=${JSON.stringify(err, null, 2)}`);
                    }
                });

                // Handler for MQTT messages matching the previously set up subscription
                mqttClient.on('message', async (topic, message) => {
                    try {
                        logger.verbose(`MQTT MESSAGE: Message received. Topic=${topic.toString()},  Message=${message.toString()}`);

                        // **MQTT message dispatch**
                        // Start Sense task
                        if (topic === config.get('Butler.mqttConfig.taskStartTopic')) {
                            logger.verbose(`MQTT IN: Starting task ID ${message.toString()}.`);

                            // Is the message a valid UUID?
                            if (!validate(message.toString())) {
                                logger.error(`MQTT IN: Invalid task ID ${message.toString()}.`);
                                return;
                            }

                            logger.verbose(`MQTT IN: Valid task ID ${message.toString()}.`);
                            const res = await qrsUtil.senseStartTask.senseStartTask(message.toString());

                            if (res) {
                                logger.info(`MQTT IN: Started task ID ${message.toString()}.`);
                            } else {
                                logger.error(`MQTT IN: Error while starting task ID ${message.toString()}.`);
                            }
                        }
                    } catch (err) {
                        logger.error(`MQTT MESSAGE: Error=${JSON.stringify(err, null, 2)}`);
                    }
                });

                // Handler for MQTT errors
                mqttClient.on('error', (topic, message) => {
                    // Error occured
                    logger.error(`MQTT ERROR: Topic: ${topic}`);
                    logger.error(`MQTT ERROR: Message: ${message}`);
                });
            } else {
                logger.info('MQTT INIT HANDLERS : MQTT disabled, not connecting to MQTT broker');
            }
        }
    } catch (err) {
        logger.error(`MQTT INIT HANDLERS: Could not set up MQTT: ${err}`);
    }
}

module.exports = {
    mqttInitHandlers,
};
