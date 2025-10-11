import mqtt from 'mqtt';
import { validate } from 'uuid';
import fs from 'fs';
import upath from 'upath';
import { fileURLToPath } from 'url';

// Load global variables and functions
import globals from '../globals.js';
import { HTTP_TIMEOUT_MS } from '../constants.js';
import { handleQlikSenseCloudAppReloadFinished } from './qscloud/mqtt_event_app_reload_finished.js';
import senseStartTask from '../qrs_util/sense_start_task.js';

const { config, logger } = globals;

/**
 * Initialize MQTT handlers for Qlik Sense Enterprise on Windows and Qlik Sense Cloud events.
 */
function mqttInitHandlers() {
    // Set up MQTT handlers related to QSEoW
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
                // File names are stored in the config file:
                // - Butler.mqttConfig.azureEventGrid.clientCertFile
                // - Butler.mqttConfig.azureEventGrid.clientKeyFile

                // Helper function to read the contents of the certificate files:
                const readCert = (filename) => fs.readFileSync(filename);

                const filename = fileURLToPath(import.meta.url);
                const dirname = upath.dirname(filename);
                const certFile = upath.resolve(dirname, config.get('Butler.mqttConfig.azureEventGrid.clientCertFile'));
                const keyFile = upath.resolve(dirname, config.get('Butler.mqttConfig.azureEventGrid.clientKeyFile'));

                // const certFile = path.join(execPath, config.get('Butler.mqttConfig.azureEventGrid.clientCertFile'));
                // const keyFile = path.join(execPath, config.get('Butler.mqttConfig.azureEventGrid.clientKeyFile'));

                // Check that the certificate and key files exist
                if (!fs.existsSync(certFile)) {
                    logger.error(`MQTT INIT HANDLERS: Certificate file ${certFile} does not exist`);
                    process.exit(1);
                } else {
                    logger.verbose(`MQTT INIT HANDLERS: Certificate file ${certFile} exists`);
                }

                if (!fs.existsSync(keyFile)) {
                    logger.error(`MQTT INIT HANDLERS: Key file ${keyFile} does not exist`);
                    process.exit(1);
                } else {
                    logger.verbose(`MQTT INIT HANDLERS: Key file ${keyFile} exists`);
                }

                mqttOptions = {
                    clientId: config.get('Butler.mqttConfig.azureEventGrid.clientId'),
                    username: config.get('Butler.mqttConfig.azureEventGrid.clientId'),
                    key: readCert(keyFile),
                    cert: readCert(certFile),
                    rejectUnauthorized: true,
                };

                // Connect to MQTT broker
                mqttClient = mqtt.connect(
                    `mqtts://${config.get('Butler.mqttConfig.brokerHost')}:${config.get('Butler.mqttConfig.brokerPort')}`,
                    mqttOptions,
                );

                globals.mqttClient = mqttClient;
            } else {
                logger.error('MQTT INIT HANDLERS: MQTT configuration error');
            }

            if (!mqttClient.connected) {
                logger.verbose(
                    `MQTT INIT HANDLERS: Created (but not yet connected) MQTT object for ${config.get(
                        'Butler.mqttConfig.brokerHost',
                    )}:${config.get('Butler.mqttConfig.brokerPort')}`,
                );
            }

            if (mqttClient) {
                // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
                mqttClient.on('connect', () => {
                    try {
                        logger.info(
                            `Connected to MQTT server ${config.get('Butler.mqttConfig.brokerHost')}:${config.get(
                                'Butler.mqttConfig.brokerPort',
                            )}, with client ID ${mqttClient.options.clientId}`,
                        );

                        // Let the world know that Butler is connected to MQTT
                        // console.info('Connected to MQTT broker');
                        mqttClient.publish(
                            'qliksense/butler/mqtt/status',
                            `Connected to MQTT broker ${config.get('Butler.mqttConfig.brokerHost')}:${config.get(
                                'Butler.mqttConfig.brokerPort',
                            )} with client ID ${mqttClient.options.clientId}`,
                        );

                        // Have Butler listen to all messages in the topic subtree specified in the config file
                        mqttClient.subscribe(config.get('Butler.mqttConfig.subscriptionRootTopic'));
                    } catch (err) {
                        logger.error(`MQTT CONNECT: Error=${globals.getErrorMessage(err)}`);
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
                            const res = await senseStartTask(message.toString());

                            if (res) {
                                logger.info(`MQTT IN: Started task ID ${message.toString()}.`);
                            } else {
                                logger.error(`MQTT IN: Error while starting task ID ${message.toString()}.`);
                            }
                        }
                    } catch (err) {
                        logger.error(`MQTT MESSAGE: Error=${globals.getErrorMessage(err)}`);
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
        logger.error(`MQTT INIT HANDLERS: Could not set up MQTT for QSEoW: ${globals.getErrorMessage(err)}`);
    }

    // ----------------------------
    // Set up MQTT handlers related to Qlik Sense Cloud events
    try {
        let mqttClient;
        let mqttOptions;

        // MQTT is enabled in config file and specifically for Qlik Sense Cloud events
        if (config.get('Butler.mqttConfig.enable') && config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable')) {
            mqttOptions = {
                host: config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host'),
                port: config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port'),
                username: config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username'),
                password: config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password'),
                connectTimeout: HTTP_TIMEOUT_MS,
            };

            const brokerUrl = `mqtts://${mqttOptions.host}:${mqttOptions.port}`;
            logger.verbose(`MQTT INIT HANDLERS: Connecting to MQTT broker for Qlik Sense Cloud events. URL is "${brokerUrl}"`);

            mqttClient = mqtt.connect(brokerUrl, mqttOptions);
            globals.mqttClientQlikSenseCloudEvent = mqttClient;

            if (!globals.mqttClientQlikSenseCloudEvent.connected) {
                logger.verbose(
                    `MQTT INIT HANDLERS: Created (but not yet connected) MQTT client for Qlik Sense Cloud events. Host is "${brokerUrl}"`,
                );
            }

            if (globals.mqttClientQlikSenseCloudEvent) {
                // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
                globals.mqttClientQlikSenseCloudEvent.on('connect', () => {
                    try {
                        logger.info(
                            `MQTT QS CLOUD EVENT CONNECT: Connected to MQTT broker "${brokerUrl}", with client ID ${globals.mqttClientQlikSenseCloudEvent.options.clientId}`,
                        );

                        // Let the world know that Butler is connected to MQTT, ready to receive Qlik Sense Cloud events
                        globals.mqttClientQlikSenseCloudEvent.publish(
                            'butler/qscloud/event/mqttforward/status',
                            `Connected to MQTT broker "${brokerUrl}" with client ID ${globals.mqttClientQlikSenseCloudEvent.options.clientId}`,
                        );

                        // Have Butler listen to all messages in the topic subtree specified in the config file
                        globals.mqttClientQlikSenseCloudEvent.subscribe(
                            config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.subscriptionRoot'),
                        );
                    } catch (err) {
                        logger.error(`MQTT QS CLOUD EVENT CONNECT: Error=${globals.getErrorMessage(err)}`);
                    }
                });

                // Handler for MQTT messages matching the previously set up subscription
                globals.mqttClientQlikSenseCloudEvent.on('message', async (topic, message) => {
                    try {
                        const topicStr = topic.toString();
                        // message is a JSON string. Convert to object and formatted JSON string
                        const messageObj = JSON.parse(message.toString());
                        const messageStr = JSON.stringify(messageObj, null, 2);
                        logger.verbose(`MQTT QS CLOUD MESSAGE: Message received. Topic=${topicStr},  Message=${messageStr}`);

                        // **MQTT message dispatch**
                        // Compare the first part of the topic to the configured topic for app reload events
                        // Event: App reload
                        // messageObj.eventType should be "com.qlik.v1.app.reload.finished"
                        if (
                            topicStr.startsWith(config.get('Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.appReload')) &&
                            messageObj.eventType === 'com.qlik.v1.app.reload.finished'
                        ) {
                            logger.debug(`MQTT QS CLOUD EVENT IN: ${messageStr}`);

                            // Handle app reload finished event
                            const appReloadResult = await handleQlikSenseCloudAppReloadFinished(messageObj);
                        }
                    } catch (err) {
                        logger.error(`MQTT QS CLOUD MESSAGE: Error=${globals.getErrorMessage(err)}`);
                    }
                });
            }
        }
    } catch (err) {
        logger.error(`MQTT INIT HANDLERS: Could not set up MQTT for Qlik Sense Cloud: ${globals.getErrorMessage(err)}`);
    }
}

export default mqttInitHandlers;
