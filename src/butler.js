// Add dependencies
const mqtt = require('mqtt');
const dgram = require('dgram');

// Load code from sub modules
const globals = require('./globals');
const serviceMonitor = require('./lib/service_monitor');

// The build function creates a new instance of the App class and returns it.
const build = require('./app');
const udp = require('./udp');
const { mqttInitHandlers } = require('./lib/mqtt_handlers');

const {
    configFileStructureAssert,
    configFileYamlAssert,
    configFileNewRelicAssert,
    configFileInfluxDbAssert,
} = require('./lib/assert/assert_config_file');

const start = async () => {
    // Verify correct structure of config file
    configFileStructureAssert(globals.config, globals.logger);

    // Verify that config file is valid YAML
    configFileStructureAssert(globals.config, globals.logger);

    // Verify that config file is valid YAML
    configFileYamlAssert(globals.configFileExpanded);

    // Verify select parts/values in config file
    if (globals.options.qsConnection) {
        // Verify that the config file contains the required data related to New Relic
        configFileNewRelicAssert(globals.config, globals.configQRS, globals.logger);

        // Verify that the config file contains the required data related to InfluxDb
        configFileInfluxDbAssert(globals.config, globals.configQRS, globals.logger);
    }

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
    if (globals.config.get('Butler.mqttConfig.enable')) {
        mqttInitHandlers();

        // Sleep 5 seconds to allow MQTT to connect
        globals.logger.info('MAIN: Sleeping 5 seconds to allow MQTT to connect.');
        globals.logger.info('5...');
        await globals.sleep(1000);
        globals.logger.info('4...');
        await globals.sleep(1000);
        globals.logger.info('3...');
        await globals.sleep(1000);
        globals.logger.info('2...');
        await globals.sleep(1000);
        globals.logger.info('1...');
        await globals.sleep(1000);
    }

    // Set up service monitoring, if enabled in the config file
    if (globals.config.has('Butler.serviceMonitor.enable') && globals.config.get('Butler.serviceMonitor.enable') === true) {
        serviceMonitor.setupServiceMonitorTimer(globals.config, globals.logger);
    }

    // Prepare to listen on port Y for incoming UDP connections regarding failed tasks
    globals.udpServerReloadTaskSocket = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });

    // ---------------------------------------------------
    // Set up UDP handlers
    if (globals.config.get('Butler.udpServerConfig.enable')) {
        udp.udp.udpInitTaskErrorServer();

        // Start UDP server for failed task events
        globals.udpServerReloadTaskSocket.bind(globals.udpPortTaskFailure, globals.udpHost);
        globals.logger.debug(`Server for UDP server: ${globals.udpHost}`);
    }
};

start();
