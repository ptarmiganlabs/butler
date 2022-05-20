/* eslint-disable prefer-object-spread */
/* eslint-disable global-require */
// const Fastify = require('fastify');

const path = require('path');
const Fastify = require('fastify');
const AutoLoad = require('@fastify/autoload');
const FastifySwagger = require('@fastify/swagger');
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
    const restServer = Fastify({ logger: true });
    const proxyRestServer = Fastify({ logger: true });
    const dockerHealthCheckServer = Fastify({ logger: false });

    // Set up connection to Influxdb (if enabled)
    globals.initInfluxDB();

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
        globals.logger.info('--------------------------------------');

        // Log info about what Qlik Sense certificates are being used
        globals.logger.info(`Client cert     : ${certFile}`);
        globals.logger.info(`Client cert key : ${keyFile}`);
        globals.logger.info(`Client cert CA  : ${caFile}`);

        // Is there a email address specified on the command line? Send test email to it if so.
        if (globals.options.testEmailAddress && globals.options.testEmailAddress.length > 0) {
            sendTestEmail(globals.options.testEmailAddress);
        }

        // Set up anon telemetry reports, if enabled
        if (
            globals.config.has('Butler.anonTelemetry') === false ||
            (globals.config.has('Butler.anonTelemetry') === true && globals.config.get('Butler.anonTelemetry') === true)
        ) {
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
            globals.logger.info('--> Note re API docs: If the line above mentions 0.0.0.0, this is the same as ANY server IP address.');
            globals.logger.info("--> Replace 0.0.0.0 with one of the Butler host's IP addresses to view the API docs page.");
        }
    } catch (err) {
        globals.logger.error(`CONFIG: Error initiating host info: ${err}`);
    }

    // Register rate limited for API
    restServer.register(FastifyRateLimit, {
        max: 100,
        timeWindow: '1 minute',
    });

    // This loads all plugins defined in plugins.
    // Those should be support plugins that are reused through your application
    restServer.register(require('./plugins/sensible'), { options: Object.assign({}, opts) });
    restServer.register(require('./plugins/support'), { options: Object.assign({}, opts) });

    // let apiDocPath = '';
    // if (process.pkg) {
    //     globals.logger.debug(`CONFIG: Running as standalone app.`);
    //     // apiDocPath = path.resolve(`${process.execPath}/docs/api_doc/butler-api.yaml`);
    //     apiDocPath = path.join(__dirname, '../docs/api_doc/butler-api.yaml');
    // } else {
    //     globals.logger.debug(`CONFIG: Not standalone app.`);
    //     apiDocPath = path.join(process.cwd(), '../docs/api_doc/butler-api.yaml');
    // }
    // globals.logger.debug(`CONFIG: Reading static API doc file from ${apiDocPath}`);

    // restServer.register(FastifySwagger, {
    //     mode: 'static',
    //     specification: {
    //         path: apiDocPath,
    //     },
    //     routePrefix: '/documentation',
    //     hideUntagged: false,
    //     exposeRoute: true,
    // });

    restServer.register(FastifySwagger, {
        routePrefix: '/documentation',
        swagger: {
            mode: 'dynamic',
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
            host: `${globals.config.get('Butler.restServerConfig.serverHost')}:${globals.config.get('Butler.restServerConfig.serverPort')}`,
            schemes: ['http'],
            // consumes: ['application/json'],
            produces: ['application/json'],
        },
        uiConfig: {
            deepLinking: true,
            operationsSorter: 'alpha', // can also be 'alpha' or a function
        },
        hideUntagged: false,
        exposeRoute: true,
    });

    // Loads all plugins defined in routes
    restServer.register(require('./routes/api'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/base_conversion'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/butler_ping'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/disk_utils'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/key_value_store'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/mqtt_publish_message'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/newrelic_event'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/newrelic_metric'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/scheduler'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/sense_app'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/sense_app_dump'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/sense_list_apps'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/sense_start_task'), { options: Object.assign({}, opts) });
    restServer.register(require('./routes/slack_post_message'), { options: Object.assign({}, opts) });

    // ---------------------------------------------------
    // Configure X-HTTP-Method-Override handling
    proxyRestServer.register(FastifyReplyFrom, {
        // base: `http://localhost:${globals.config.get('Butler.restServerConfig.backgroundServerPort')}`,
        base: `http://${globals.config.get('Butler.restServerConfig.serverHost')}:${globals.config.get(
            'Butler.restServerConfig.backgroundServerPort'
        )}`,
        http: true,
    });

    proxyRestServer.get('/*', (request, reply) => {
        const { url } = request.raw;
        reply.from(url, {
            rewriteRequestHeaders: (originalReq, headers) => {
                Object.assign(headers, { remoteIP: originalReq.client.remoteAddress });
                return headers;
            },
        });
    });

    proxyRestServer.put('/*', (request, reply) => {
        const { url } = request.raw;
        reply.from(url, {
            rewriteRequestHeaders: (originalReq, headers) => {
                Object.assign(headers, { remoteIP: originalReq.client.remoteAddress });
                return headers;
            },
        });
    });

    proxyRestServer.delete('/*', (request, reply) => {
        const { url } = request.raw;
        reply.from(url, {
            rewriteRequestHeaders: (originalReq, headers) => {
                Object.assign(headers, { remoteIP: originalReq.client.remoteAddress });
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
                    Object.assign(headers, { remoteIP: originalReq.client.remoteAddress });
                    return headers;
                },
            });
        } catch (err) {
            globals.logger.error(`Error in POST handler: ${err}`);
        }
    });

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

    dockerHealthCheckServer.register(FastifyHealthcheck);

    return { restServer, proxyRestServer, dockerHealthCheckServer };
}

module.exports = build;
