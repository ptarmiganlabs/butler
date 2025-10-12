// Add dependencies
import dgram from 'dgram';
import { GLOBALS_INIT_TIMEOUT_MS, GLOBALS_INIT_CHECK_INTERVAL_MS } from './constants.js';

// Suppress experimental warnings
// https://stackoverflow.com/questions/55778283/how-to-disable-warnings-when-node-is-launched-via-a-global-shell-script
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
    // console.log(`Got a Node.js event: ${name}`);
    // console.log(`Type of data: ${typeof data}`);
    // if (typeof data === `object`) {
    //     console.log(`Data: ${JSON.stringify(data)}`);
    //     console.log(`Data name: ${data.name}`);
    //     console.log(`Data message: ${data.message}`);
    // }
    // console.log(`Args: ${args}`);

    if (name === `warning` && typeof data === `object` && data.name === `ExperimentalWarning` && data.message.includes(`Fetch API`)) {
        return false;
    }
    return originalEmit.apply(process, arguments);
};

const start = async () => {
    // Load code from sub modules
    // Load globals dynamically/async to ensure singleton pattern works
    const settingsObj = (await import('./globals.js')).default;

    const globals = await settingsObj.init();
    globals.logger.verbose(`START: Globals init done: ${globals.initialised}`);

    const setupServiceMonitorTimer = (await import('./lib/qseow/service_monitor.js')).default;
    const { setupQlikSenseAccessLicenseMonitor, setupQlikSenseLicenseRelease, setupQlikSenseServerLicenseMonitor } = await import(
        './lib/qseow/qliksense_license.js'
    );
    const { setupQlikSenseVersionMonitor } = await import('./lib/qseow/qliksense_version.js');

    // The build function creates a new instance of the App class and returns it.
    const build = (await import('./app.js')).default;

    const udpInitTaskErrorServer = (await import('./udp/udp_handlers.js')).default;
    const mqttInitHandlers = (await import('./lib/mqtt_handlers.js')).default;

    const {
        configFileEmailAssert,
        configFileStructureAssert,
        configFileNewRelicAssert,
        configFileInfluxDbAssert,
        configFileQsAssert,
        configFileAppAssert,
        configFileConditionalAssert,
    } = await import('./lib/assert/assert_config_file.js');

    let resAssert;

    // Verify correct structure of config file
    if (!settingsObj.options.skipConfigVerification) {
        resAssert = await configFileStructureAssert();
        if (resAssert === false) {
            globals.logger.error('MAIN: Config file structure is incorrect. Exiting.');
            process.exit(1);
        } else {
            globals.logger.info('MAIN: Config file structure is correct - all good.');
        }

        // Verify application-specific settings and relationships
        resAssert = await configFileAppAssert(globals.config, globals.logger);
        if (resAssert === false) {
            globals.logger.error('MAIN: Application-specific config validation failed. Exiting.');
            process.exit(1);
        } else {
            globals.logger.info('MAIN: Application-specific config validation passed - all good.');
        }

        // Verify conditional field requirements based on enabled features
        resAssert = await configFileConditionalAssert(globals.config, globals.logger);
        if (resAssert === false) {
            globals.logger.error('MAIN: Conditional config validation failed. Exiting.');
            process.exit(1);
        } else {
            globals.logger.info('MAIN: Conditional config validation passed - all good.');
        }

        // Verify select parts/values in config file
        if (globals.options.qsConnection) {
            // Verify that the config file contains the required data related to email
            resAssert = await configFileEmailAssert(globals.config, globals.configQRS, globals.logger);
            if (resAssert === false) {
                globals.logger.error('MAIN: Config file does not contain required email data. Exiting.');
                process.exit(1);
            } else {
                globals.logger.info('MAIN: Config file contains required email data - all good.');
            }

            // Verify that the config file contains the required data related to New Relic
            resAssert = await configFileNewRelicAssert(globals.config, globals.configQRS, globals.logger);
            if (resAssert === false) {
                globals.logger.error('MAIN: Config file does not contain required New Relic data. Exiting.');
                process.exit(1);
            } else {
                globals.logger.info('MAIN: Config file contains required New Relic data - all good.');
            }

            // Verify that the config file contains the required data related to InfluxDb
            resAssert = await configFileInfluxDbAssert(globals.config, globals.configQRS, globals.logger);
            if (resAssert === false) {
                globals.logger.error('MAIN: Config file does not contain required InfluxDb data. Exiting.');
                process.exit(1);
            } else {
                globals.logger.info('MAIN: Config file contains required InfluxDb data - all good.');
            }

            // Verify that QS specific config settings are valid
            resAssert = await configFileQsAssert(globals.config, globals.logger);
            if (resAssert === false) {
                globals.logger.error('MAIN: Config file does not contain required Qlik Sense data. Exiting.');
                process.exit(1);
            } else {
                globals.logger.info('MAIN: Config file contains required Qlik Sense data - all good.');
            }
        }
    }

    // Ensure that initialisation of globals is complete
    // Sleep to allow globals to be initialised if needed

    function sleepLocal(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    if (!globals.initialised) {
        globals.logger.info(`START: Sleeping ${GLOBALS_INIT_TIMEOUT_MS}ms to allow globals to be initialised.`);
        await sleepLocal(GLOBALS_INIT_TIMEOUT_MS);
    } else {
        globals.logger.info('START: Globals initialised - all good.');
    }

    const apps = await build({});

    const { restServer } = apps;
    const { proxyRestServer } = apps;
    const { dockerHealthCheckServer } = apps;
    const { configVisServer } = apps;

    // ---------------------------------------------------
    // Start config visualization server, if enabled
    if (globals.config.get('Butler.configVisualisation.enable')) {
        configVisServer.listen(
            {
                host: globals.config.get('Butler.configVisualisation.host'),
                port: globals.config.get('Butler.configVisualisation.port'),
            },
            (err, address) => {
                if (err) {
                    globals.logger.error(`MAIN: Could not set up config visualisation server on ${address}`);
                    if (globals.isSea) {
                        globals.logger.error(`MAIN: ${globals.getErrorMessage(err)}`);
                    } else {
                        globals.logger.error(`MAIN: ${globals.getErrorMessage(err)}`);
                    }
                    configVisServer.log.error(err);
                    process.exit(1);
                }
                globals.logger.info(`MAIN: Config visualisation server listening on ${address}/`);

                configVisServer.ready((err2) => {
                    if (err2) throw err2;
                });
            },
        );
    }

    // ---------------------------------------------------
    // Start REST server on port 8080
    if (globals.config.get('Butler.restServerConfig.enable')) {
        globals.logger.debug(`REST server host: ${globals.config.get('Butler.restServerConfig.serverHost')}`);
        globals.logger.debug(`REST server port: ${globals.config.get('Butler.restServerConfig.serverPort')}`);

        restServer.listen(
            {
                port: globals.config.get('Butler.restServerConfig.backgroundServerPort'),
                host: globals.config.get('Butler.restServerConfig.serverHost'),
            },

            (err, address) => {
                if (err) {
                    globals.logger.error(`MAIN: Background REST server could not listen on ${address}`);
                    if (globals.isSea) {
                        globals.logger.error(`MAIN: ${globals.getErrorMessage(err)}`);
                    } else {
                        globals.logger.error(`MAIN: ${globals.getErrorMessage(err)}`);
                    }
                    restServer.log.error(err);
                    process.exit(1);
                }
                globals.logger.verbose(`MAIN: Background REST server listening on ${address}`);

                restServer.ready((err2) => {
                    if (err2) throw err2;
                    restServer.swagger();
                });
            },
        );

        proxyRestServer.listen(
            {
                port: globals.config.get('Butler.restServerConfig.serverPort'),
                host: globals.config.get('Butler.restServerConfig.serverHost'),
            },
            (err, address) => {
                if (err) {
                    globals.logger.error(`MAIN: REST server could not listen on ${address}`);
                    if (globals.isSea) {
                        globals.logger.error(`MAIN: ${globals.getErrorMessage(err)}`);
                    } else {
                        globals.logger.error(`MAIN: ${globals.getErrorMessage(err)}`);
                    }
                    proxyRestServer.log.error(err);
                    process.exit(1);
                }
                globals.logger.info(`MAIN: REST server listening on ${address}`);

                proxyRestServer.ready((err2) => {
                    if (err2) throw err2;
                });
            },
        );
    }

    // Start Docker healthcheck REST server on port set in config file
    if (globals.config.has('Butler.dockerHealthCheck.enable') && globals.config.get('Butler.dockerHealthCheck.enable') === true) {
        try {
            globals.logger.verbose('MAIN: Starting Docker healthcheck server...');

            await dockerHealthCheckServer.listen({
                port: globals.config.get('Butler.dockerHealthCheck.port'),
            });

            globals.logger.info(`MAIN: Started Docker healthcheck server on port ${globals.config.get('Butler.dockerHealthCheck.port')}.`);
        } catch (err) {
            globals.logger.error(
                `MAIN: Error while starting Docker healthcheck server on port ${globals.config.get('Butler.dockerHealthCheck.port')}.`,
            );
            dockerHealthCheckServer.log.error(err);
            process.exit(1);
        }
    }

    // ------------------------------------
    // Create MQTT client object and connect to MQTT broker, if MQTT is enabled
    if (globals.config.get('Butler.mqttConfig.enable')) {
        mqttInitHandlers();

        // Sleep to allow MQTT to connect
        globals.logger.info(`MAIN: Sleeping ${5 * GLOBALS_INIT_CHECK_INTERVAL_MS}ms to allow MQTT to connect.`);
        globals.logger.info('5...');
        await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
        globals.logger.info('4...');
        await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
        globals.logger.info('3...');
        await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
        globals.logger.info('2...');
        await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
        globals.logger.info('1...');
        await globals.sleep(GLOBALS_INIT_CHECK_INTERVAL_MS);
    }

    // Set up service monitoring, if enabled in the config file
    if (globals.config.has('Butler.serviceMonitor.enable') && globals.config.get('Butler.serviceMonitor.enable') === true) {
        setupServiceMonitorTimer(globals.config, globals.logger);
    }

    // Set up Qlik Sense version monitoring, if enabled in the config file
    // Don't start version monitor if Qlik Sense connection is not enabled,
    // i.e. if the globals.options.qsConnection flag is false
    if (!globals.options.qsConnection) {
        globals.logger.info('MAIN: Qlik Sense connection is not enabled. Skipping version monitoring.');
    } else if (
        globals.config.has('Butler.qlikSenseVersion.versionMonitor.enable') &&
        globals.config.get('Butler.qlikSenseVersion.versionMonitor.enable') === true
    ) {
        setupQlikSenseVersionMonitor(globals.config, globals.logger);
    }

    // Set up Qlik Sense server license monitoring, if enabled in the config file
    // Don't start version monitor if Qlik Sense connection is not enabled,
    // i.e. if the globals.options.qsConnection flag is false
    if (!globals.options.qsConnection) {
        globals.logger.info('MAIN: Qlik Sense connection is not enabled. Skipping server license monitoring.');
    } else if (
        globals.config.has('Butler.qlikSenseLicense.serverLicenseMonitor.enable') &&
        globals.config.get('Butler.qlikSenseLicense.serverLicenseMonitor.enable') === true
    ) {
        setupQlikSenseServerLicenseMonitor(globals.config, globals.logger);
    }

    // Set up Qlik Sense access license monitoring, if enabled in the config file
    // i.e. if the globals.options.qsConnection flag is false
    if (!globals.options.qsConnection) {
        globals.logger.info('MAIN: Qlik Sense connection is not enabled. Skipping access license monitoring.');
    } else if (
        globals.config.has('Butler.qlikSenseLicense.licenseMonitor.enable') &&
        globals.config.get('Butler.qlikSenseLicense.licenseMonitor.enable') === true
    ) {
        setupQlikSenseAccessLicenseMonitor(globals.config, globals.logger);
    }

    // Set up Qlik Sense access license release, if enabled in the config file
    // Enable only if at least one license type is enabled for automatic release
    // i.e. if the globals.options.qsConnection flag is false
    if (!globals.options.qsConnection) {
        globals.logger.info('MAIN: Qlik Sense connection is not enabled. Skipping access license release.');
    } else if (
        globals.config.has('Butler.qlikSenseLicense.licenseRelease.enable') &&
        globals.config.get('Butler.qlikSenseLicense.licenseRelease.enable') === true &&
        (globals.config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.enable') === true ||
            globals.config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.professional.enable') === true)
    ) {
        setupQlikSenseLicenseRelease(globals.config, globals.logger);
    }

    // Prepare to listen on port Y for incoming UDP connections regarding failed tasks
    globals.udpServerTaskResultSocket = dgram.createSocket({
        type: 'udp4',
        reuseAddr: true,
    });

    // ---------------------------------------------------
    // Set up UDP handlers
    if (globals.config.get('Butler.udpServerConfig.enable')) {
        udpInitTaskErrorServer();

        // Start UDP server for failed task events
        globals.udpServerTaskResultSocket.bind(globals.udpPortTaskFailure, globals.udpHost);
        globals.logger.debug(`Server for UDP server: ${globals.udpHost}`);
    }
};

start();
