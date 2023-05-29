/* eslint-disable prefer-object-spread */
/* eslint-disable global-require */
// const Fastify = require('fastify');

const path = require('path');
const Fastify = require('fastify');
const AutoLoad = require('@fastify/autoload');
const FastifySwagger = require('@fastify/swagger');
const FastifySwaggerUi = require('@fastify/swagger-ui');
const FastifyReplyFrom = require('@fastify/reply-from');
const FastifyHealthcheck = require('fastify-healthcheck');
const FastifyRateLimit = require('@fastify/rate-limit');

const globals = require('./globals');
const heartbeat = require('./lib/heartbeat');
const mqtt = require('./mqtt');
const scheduler = require('./lib/scheduler');
const serviceUptime = require('./lib/service_uptime');
const telemetry = require('./lib/telemetry');
const configUtil = require('./lib/config_util');
const { sendTestEmail } = require('./lib/testemail');

async function build(opts = {}) {
    // Create two Fastify servers. One server is a REST server and the other is a reverse proxy server.
    // The REST server is used to provide REST endpoints that can be used by the UI.
    // The reverse proxy server is used to proxy requests to the backend servers.
    // The dockerHealthCheckServer is used to provide a health check endpoint for the Docker container.
    const restServer = Fastify({ logger: true });
    const proxyRestServer = Fastify({ logger: true });
    const dockerHealthCheckServer = Fastify({ logger: false });

    // Set up connection to Influxdb (if enabled)
    globals.initInfluxDB();

    // Start the uptime monitor if it is enabled in the config
    if (
        (globals.config.has('Butler.uptimeMonitor.enabled') && globals.config.get('Butler.uptimeMonitor.enabled') === true) ||
        (globals.config.has('Butler.uptimeMonitor.enable') && globals.config.get('Butler.uptimeMonitor.enable') === true)
    ) {
        serviceUptime.serviceUptimeStart();
    }

    // Load certificates to use when connecting to healthcheck API
    const certFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCert'));
    const keyFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCertKey'));
    const caFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCertCA'));

    // Set up heartbeats, if enabled in the config file
    if (
        (globals.config.has('Butler.heartbeat.enabled') && globals.config.get('Butler.heartbeat.enabled') === true) ||
        (globals.config.has('Butler.heartbeat.enable') && globals.config.get('Butler.heartbeat.enable') === true)
    ) {
        heartbeat.setupHeartbeatTimer(globals.config, globals.logger);
    }

    try {
        // Set Fastify log level based on log level in Butler config file
        const currLogLevel = globals.getLoggingLevel();
        if (currLogLevel === 'debug' || currLogLevel === 'silly') {
            restServer.log.level = 'info';
            proxyRestServer.log.level = 'info';
        } else {
            restServer.log.level = 'silent';
            proxyRestServer.log.level = 'silent';
        }

        // Get host info
        globals.hostInfo = await globals.initHostInfo();
        globals.logger.debug('CONFIG: Initiated host info data structures');

        globals.logger.info('--------------------------------------');
        globals.logger.info('Starting Butler');
        globals.logger.info(`Log level      : ${globals.getLoggingLevel()}`);
        globals.logger.info(`App version    : ${globals.appVersion}`);
        globals.logger.info(`Instance ID    : ${globals.hostInfo.id}`);
        globals.logger.info('');
        globals.logger.info(`Node version   : ${globals.hostInfo.node.nodeVersion}`);
        globals.logger.info(`Architecture   : ${globals.hostInfo.si.os.arch}`);
        globals.logger.info(`Platform       : ${globals.hostInfo.si.os.platform}`);
        globals.logger.info(`Release        : ${globals.hostInfo.si.os.release}`);
        globals.logger.info(`Distro         : ${globals.hostInfo.si.os.distro}`);
        globals.logger.info(`Codename       : ${globals.hostInfo.si.os.codename}`);
        globals.logger.info(`Virtual        : ${globals.hostInfo.si.system.virtual}`);
        globals.logger.info(`Processors     : ${globals.hostInfo.si.cpu.processors}`);
        globals.logger.info(`Physical cores : ${globals.hostInfo.si.cpu.physicalCores}`);
        globals.logger.info(`Cores          : ${globals.hostInfo.si.cpu.cores}`);
        globals.logger.info(`Docker arch.   : ${globals.hostInfo.si.cpu.hypervizor}`);
        globals.logger.info(`Total memory   : ${globals.hostInfo.si.memory.total}`);
        globals.logger.info('');
        // Add log line with name of config file
        globals.logger.info(`Config file    : ${globals.configFileExpanded}`);
        globals.logger.info(`API rate limit : ${globals.options.apiRateLimit}`);
        globals.logger.info('--------------------------------------');

        // Log info about what Qlik Sense certificates are being used
        globals.logger.info(`Client cert     : ${certFile}`);
        globals.logger.info(`Client cert key : ${keyFile}`);
        globals.logger.info(`Client cert CA  : ${caFile}`);

        // Load approved directories for file system API operations from config file
        await globals.loadApprovedDirectories();

        // Is there a email address specified on the command line? Send test email to it if so.
        if (globals.options.testEmailAddress && globals.options.testEmailAddress.length > 0) {
            // Is there a from address specified in a separate command line option?
            if (globals.options.testEmailFromAddress && globals.options.testEmailFromAddress.length > 0) {
                sendTestEmail(globals.options.testEmailAddress, globals.options.testEmailFromAddress);
            } else {
                sendTestEmail(globals.options.testEmailAddress, '');
            }
        }

        // Check if the user has opted in to sending anonymous telemetry
        if (
            globals.config.has('Butler.anonTelemetry') === false ||
            (globals.config.has('Butler.anonTelemetry') === true && globals.config.get('Butler.anonTelemetry') === true)
        ) {
            // Set up the timer to send anonymous telemetry
            telemetry.setupAnonUsageReportTimer();
            globals.logger.verbose('MAIN: Anonymous telemetry reporting has been set up.');
        }

        // Verify that select parts of config file are valid
        configUtil.configVerifyAllTaskId();

        // Show link to Swagger API docs page, if the API is enabled
        if (globals.config.has('Butler.restServerConfig.enable') && globals.config.get('Butler.restServerConfig.enable') === true) {
            globals.logger.info(
                `REST API documentation available at http://${globals.config.get(
                    'Butler.restServerConfig.serverHost'
                )}:${globals.config.get('Butler.restServerConfig.serverPort')}/documentation`
            );
            globals.logger.info(
                '--> Note regarding API docs: If the line above mentions 0.0.0.0, this is the same as ANY server IP address.'
            );
            globals.logger.info("--> Replace 0.0.0.0 with one of the Butler host's IP addresses to view the API docs page.");
        }
    } catch (err) {
        globals.logger.error(`CONFIG: Error initiating host info: ${err}`);
    }

    // Set up REST server, if enabled
    if (globals.config.get('Butler.restServerConfig.enable') === true) {
        // Register rate limit for API
        // 0 means no rate limit
        if (globals.options.apiRateLimit > 0) {
            // This code registers the FastifyRateLimit plugin.
            // The plugin limits the number of API requests that
            // can be made from a given IP address within a given
            // time window.

            await restServer.register(FastifyRateLimit, {
                max: globals.options.apiRateLimit,
                timeWindow: '1 minute',
            });
        }

        // Add custom error handler for 429 errors (rate limit exceeded)
        restServer.setErrorHandler((error, request, reply) => {
            if (error.statusCode === 429) {
                globals.logger.warn(
                    `API: Rate limit exceeded for source IP address ${request.ip}. Method=${request.method}, endpoint=${request.url}`
                );
            }
            reply.send(error);
        });

        // This loads all plugins defined in plugins.
        // Those should be support plugins that are reused through your application
        await restServer.register(require('./plugins/sensible'), { options: Object.assign({}, opts) });
        await restServer.register(require('./plugins/support'), { options: Object.assign({}, opts) });

        await restServer.register(FastifySwagger, {
            mode: 'dynamic',
            openapi: {
                info: {
                    title: 'Butler API documentation',
                    description:
                        'Butler is a microservice that provides add-on features to Qlik Sense Enterprise on Windows.\nButler offers both a REST API and things like failed reload notifications etc.\n\nThis page contains the API documentation. Full documentation is available at https://butler.ptarmiganlabs.com',
                    version: globals.appVersion,
                },
                externalDocs: {
                    url: 'https://github.com/ptarmiganlabs',
                    description: 'Butler family of tools on GitHub',
                },
                servers: [
                    {
                        url: `http://${globals.config.get('Butler.restServerConfig.serverHost')}:${globals.config.get(
                            'Butler.restServerConfig.serverPort'
                        )}`,
                    },
                ],
                // consumes: ['application/json'],
                produces: ['application/json'],
            },
        });

        await restServer.register(FastifySwaggerUi, {
            routePrefix: '/documentation',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: true,
                operationsSorter: 'alpha', // can be 'alpha' or a function
            },
        });

        // Loads all plugins defined in routes
        await restServer.register(require('./routes/api'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/base_conversion'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/butler_ping'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/disk_utils'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/key_value_store'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/mqtt_publish_message'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/newrelic_event'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/newrelic_metric'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/scheduler'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/sense_app'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/sense_app_dump'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/sense_list_apps'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/sense_start_task'), { options: Object.assign({}, opts) });
        await restServer.register(require('./routes/slack_post_message'), { options: Object.assign({}, opts) });

        // ---------------------------------------------------
        // Configure X-HTTP-Method-Override handling
        await proxyRestServer.register(FastifyReplyFrom, {
            // base: `http://localhost:${globals.config.get('Butler.restServerConfig.backgroundServerPort')}`,
            base: `http://${globals.config.get('Butler.restServerConfig.serverHost')}:${globals.config.get(
                'Butler.restServerConfig.backgroundServerPort'
            )}`,
            http: true,
        });

        // Handle requests from the proxy server.
        proxyRestServer.get('/*', (request, reply) => {
            const { url } = request.raw;
            reply.from(url, {
                rewriteRequestHeaders: (originalReq, headers) => {
                    Object.assign(headers, { remoteIP: originalReq.ip });
                    return headers;
                },
            });
        });

        proxyRestServer.put('/*', (request, reply) => {
            const { url } = request.raw;
            reply.from(url, {
                rewriteRequestHeaders: (originalReq, headers) => {
                    Object.assign(headers, { remoteIP: originalReq.ip });
                    return headers;
                },
            });
        });

        proxyRestServer.delete('/*', (request, reply) => {
            const { url } = request.raw;
            reply.from(url, {
                rewriteRequestHeaders: (originalReq, headers) => {
                    Object.assign(headers, { remoteIP: originalReq.ip });
                    return headers;
                },
            });
        });

        proxyRestServer.post('/*', (request, reply) => {
            try {
                const { url } = request.raw;
                const { 'x-http-method-override': method = 'POST' } = request.headers;

                // eslint-disable-next-line no-param-reassign
                reply.request.raw.method = method;
                reply.from(url, {
                    rewriteRequestHeaders: (originalReq, headers) => {
                        Object.assign(headers, { remoteIP: originalReq.ip });
                        return headers;
                    },
                });
            } catch (err) {
                globals.logger.error(`Error in POST handler: ${err}`);
            }
        });
    } else {
        globals.logger.info('MAIN: Will not set up REST server as it is disabled in the config file.');
    }

    // ---------------------------------------------------
    // Set up MQTT
    if (globals.config.get('Butler.mqttConfig.enable')) {
        mqtt.mqtt.mqttInitHandlers();
    }

    // Load already defined schedules
    if (globals.config.has('Butler.scheduler')) {
        if (globals.config.get('Butler.scheduler.enable') === true) {
            scheduler.loadSchedulesFromDisk();
            // scheduler.launchAllSchedules();
        } else {
            // eslint-disable-next-line quotes
            globals.logger.info("MAIN: Didn't load schedules from file");
        }
    }

    await dockerHealthCheckServer.register(FastifyHealthcheck);

    return { restServer, proxyRestServer, dockerHealthCheckServer };
}

module.exports = build;
