// Add dependencies
const mqtt = require('mqtt');
const dgram = require('dgram');

// Load code from sub modules
const globals = require('./globals');
const serviceMonitor = require('./lib/service_monitor');

// The build function creates a new instance of the App class and returns it.
const build = require('./app');
const udp = require('./udp');

const start = async () => {
    const apps = await build({});

    const { restServer } = apps;
    const { proxyRestServer } = apps;
    const { dockerHealthCheckServer } = apps;

    // ---------------------------------------------------
    // Start REST server on port 8080
    if (globals.config.get('Butler.restServerConfig.enable')) {
        globals.logger.debug(`REST server host: ${globals.config.get('Butler.restServerConfig.serverHost')}`);
        globals.logger.debug(`REST server port: ${globals.config.get('Butler.restServerConfig.serverPort')}`);

        // restServer.listen(globals.config.get('Butler.restServerConfig.backgroundServerPort'), 'localhost', (err, address) => {
        restServer.listen(
            {
                port: globals.config.get('Butler.restServerConfig.backgroundServerPort'),
                host: globals.config.get('Butler.restServerConfig.serverHost'),
            },

            (err, address) => {
                if (err) {
                    globals.logger.error(`MAIN: Background REST server could not listen on ${address}`);
                    globals.logger.error(`MAIN: ${err.stack}`);
                    restServer.log.error(err);
                    process.exit(1);
                }
                globals.logger.verbose(`MAIN: Background REST server listening on ${address}`);

                restServer.ready((err2) => {
                    if (err2) throw err;
                    restServer.swagger();
                });
            }
        );

        proxyRestServer.listen(
            {
                port: globals.config.get('Butler.restServerConfig.serverPort'),
                host: globals.config.get('Butler.restServerConfig.serverHost'),
            },
            (err, address) => {
                if (err) {
                    globals.logger.error(`MAIN: REST server could not listen on ${address}`);
                    globals.logger.error(`MAIN: ${err.stack}`);
                    proxyRestServer.log.error(err);
                    process.exit(1);
                }
                globals.logger.info(`MAIN: REST server listening on ${address}`);

                proxyRestServer.ready((err2) => {
                    if (err2) throw err;
                });
            }
        );
    }

    // Start Docker healthcheck REST server on port set in config file
    if (
        (globals.config.has('Butler.dockerHealthCheck.enabled') && globals.config.get('Butler.dockerHealthCheck.enabled') === true) ||
        (globals.config.has('Butler.dockerHealthCheck.enable') && globals.config.get('Butler.dockerHealthCheck.enable') === true)
    ) {
        try {
            globals.logger.verbose('MAIN: Starting Docker healthcheck server...');

            await dockerHealthCheckServer.listen({
                port: globals.config.get('Butler.dockerHealthCheck.port'),
            });

            globals.logger.info(`MAIN: Started Docker healthcheck server on port ${globals.config.get('Butler.dockerHealthCheck.port')}.`);
        } catch (err) {
            globals.logger.error(
                `MAIN: Error while starting Docker healthcheck server on port ${globals.config.get('Butler.dockerHealthCheck.port')}.`
            );
            dockerHealthCheckServer.log.error(err);
            process.exit(1);
        }
    }

    // ------------------------------------
    // Create MQTT client object and connect to MQTT broker, if MQTT is enabled
    try {
        if (
            globals.config.has('Butler.mqttConfig.enable') &&
            globals.config.has('Butler.mqttConfig.brokerHost') &&
            globals.config.has('Butler.mqttConfig.brokerPort') &&
            globals.config.get('Butler.mqttConfig.enable')
        ) {
            const mqttOptions = {
                host: globals.config.get('Butler.mqttConfig.brokerHost'),
                port: globals.config.get('Butler.mqttConfig.brokerPort'),
            };

            globals.mqttClient = mqtt.connect(mqttOptions);
            /*
                Following might be needed for conecting to older Mosquitto versions
                var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
                    protocolId: 'MQIsdp',
                    protocolVersion: 3
                });
                */
            if (!globals.mqttClient.connected) {
                globals.logger.verbose(
                    `CONFIG: Created (but not yet connected) MQTT object for ${mqttOptions.host}:${mqttOptions.port}, protocol version ${mqttOptions.protocolVersion}`
                );
            }
        } else {
            globals.logger.info('CONFIG: MQTT disabled, not connecting to MQTT broker');
        }
    } catch (err) {
        globals.logger.error(`CONFIG: Could not set up MQTT: ${JSON.stringify(err, null, 2)}`);
    }

    // Set up service monitoring, if enabled in the config file
    if (globals.config.has('Butler.serviceMonitor.enable') && globals.config.get('Butler.serviceMonitor.enable') === true) {
        serviceMonitor.setupServiceMonitorTimer(globals.config, globals.logger);
    }

    // Prepare to listen on port Y for incoming UDP connections regarding failed tasks
    globals.udpServerTaskFailureSocket = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });

    // ---------------------------------------------------
    // Set up UDP handlers
    if (globals.config.get('Butler.udpServerConfig.enable')) {
        udp.udp.udpInitTaskErrorServer();

        // Start UDP server for failed task events
        globals.udpServerTaskFailureSocket.bind(globals.udpPortTaskFailure, globals.udpHost);
        globals.logger.debug(`Server for UDP server: ${globals.udpHost}`);
    }
};

start();
