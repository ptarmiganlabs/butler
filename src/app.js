/* eslint-disable prefer-object-spread */
/* eslint-disable global-require */

import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

import Fastify from 'fastify';
// import AutoLoad from '@fastify/autoload';
import FastifySwagger from '@fastify/swagger';
import FastifySwaggerUi from '@fastify/swagger-ui';
import FastifyReplyFrom from '@fastify/reply-from';
import FastifyHealthcheck from 'fastify-healthcheck';
import FastifyRateLimit from '@fastify/rate-limit';
import FastifyStatic from '@fastify/static';

import globals from './globals.js';
import setupHeartbeatTimer from './lib/heartbeat.js';
import { loadSchedulesFromDisk } from './lib/scheduler.js';
import serviceUptimeStart from './lib/service_uptime.js';
import setupAnonUsageReportTimer from './lib/telemetry.js';
import { configVerifyAllTaskId } from './lib/config_util.js';
import sendTestEmail from './lib/testemail.js';
import configObfuscate from './lib/config_obfuscate.js';

async function build(opts = {}) {
    // Create two Fastify servers. One server is a REST server and the other is a reverse proxy server.
    // The REST server is used to provide REST endpoints that can be used by the UI.
    // The reverse proxy server is used to proxy requests to the backend servers.
    // The dockerHealthCheckServer is used to provide a health check endpoint for the Docker container.
    const restServer = Fastify({ logger: true });
    const proxyRestServer = Fastify({ logger: true });
    const dockerHealthCheckServer = Fastify({ logger: false });
    const configVisServer = Fastify({ logger: true });

    // Set up connection to Influxdb (if enabled)
    globals.initInfluxDB();

    // Start the uptime monitor if it is enabled in the config
    if (globals.config.has('Butler.uptimeMonitor.enable') && globals.config.get('Butler.uptimeMonitor.enable') === true) {
        serviceUptimeStart();
    }

    // Load certificates to use when connecting to healthcheck API
    // When running in packaged app (using pkg): import.meta.url = /snapshot/butler/build.cjs
    // When running as Node.js: import.meta.url =  /home/goran/code/butler/src/app.js
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const certFile = path.resolve(dirname, globals.config.get('Butler.cert.clientCert'));
    const keyFile = path.resolve(dirname, globals.config.get('Butler.cert.clientCertKey'));
    const caFile = path.resolve(dirname, globals.config.get('Butler.cert.clientCertCA'));
    globals.logger.verbose(`----------------1: ${dirname}`);

    globals.logger.verbose(`MAIN: Executing JS dirname: ${dirname}`);
    globals.logger.verbose(`MAIN: Executing JS filename: ${filename}`);
    globals.logger.verbose(`MAIN: Using client cert file: ${certFile}`);
    globals.logger.verbose(`MAIN: Using client cert key file: ${keyFile}`);
    globals.logger.verbose(`MAIN: Using client cert CA file: ${caFile}`);

    // Set up heartbeats, if enabled in the config file
    if (globals.config.has('Butler.heartbeat.enable') && globals.config.get('Butler.heartbeat.enable') === true) {
        setupHeartbeatTimer(globals.config, globals.logger);
    }

    try {
        // Set Fastify log level based on log level in Butler config file
        const currLogLevel = globals.getLoggingLevel();
        if (currLogLevel === 'debug' || currLogLevel === 'silly') {
            restServer.log.level = 'info';
            proxyRestServer.log.level = 'info';
            configVisServer.log.level = 'info';
        } else {
            restServer.log.level = 'silent';
            proxyRestServer.log.level = 'silent';
            configVisServer.log.level = 'silent';
        }

        // Get host info
        globals.hostInfo = await globals.initHostInfo();
        globals.logger.debug('CONFIG: Initiated host info data structures');

        globals.logger.info('--------------------------------------');
        globals.logger.info('Starting Butler');
        globals.logger.info(`Log level         : ${globals.getLoggingLevel()}`);
        globals.logger.info(`App version       : ${globals.appVersion}`);
        globals.logger.info(`Instance ID       : ${globals.hostInfo.id}`);
        globals.logger.info(`Running in Docker : ${globals.hostInfo.isRunningInDocker}`);
        globals.logger.info('');
        globals.logger.info(`Node version      : ${globals.hostInfo.node.nodeVersion}`);
        globals.logger.info(`Architecture      : ${globals.hostInfo.si.os.arch}`);
        globals.logger.info(`Platform          : ${globals.hostInfo.si.os.platform}`);
        globals.logger.info(`Release           : ${globals.hostInfo.si.os.release}`);
        globals.logger.info(`Distro            : ${globals.hostInfo.si.os.distro}`);
        globals.logger.info(`Codename          : ${globals.hostInfo.si.os.codename}`);
        globals.logger.info(`Virtual           : ${globals.hostInfo.si.system.virtual}`);
        globals.logger.info(`Processors        : ${globals.hostInfo.si.cpu.processors}`);
        globals.logger.info(`Physical cores    : ${globals.hostInfo.si.cpu.physicalCores}`);
        globals.logger.info(`Cores             : ${globals.hostInfo.si.cpu.cores}`);
        globals.logger.info(`Total memory      : ${globals.hostInfo.si.memory.total}`);
        globals.logger.info('');

        // Add log line with name of config file
        globals.logger.info(`Config file       : ${globals.configFileExpanded}`);
        globals.logger.info(`API rate limit    : ${globals.options.apiRateLimit} calls per minute`);
        globals.logger.info('--------------------------------------');

        // Log info about what Qlik Sense certificates are being used
        globals.logger.info(`Client cert       : ${certFile}`);
        globals.logger.info(`Client cert key   : ${keyFile}`);
        globals.logger.info(`Client cert CA    : ${caFile}`);

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
            setupAnonUsageReportTimer();
            globals.logger.verbose('MAIN: Anonymous telemetry reporting has been set up.');
        }

        // Verify that select parts of config file are valid
        configVerifyAllTaskId();

        // Show link to Swagger API docs page, if the API is enabled
        if (globals.config.has('Butler.restServerConfig.enable') && globals.config.get('Butler.restServerConfig.enable') === true) {
            globals.logger.info(
                `REST API documentation available at http://${globals.config.get(
                    'Butler.restServerConfig.serverHost',
                )}:${globals.config.get('Butler.restServerConfig.serverPort')}/documentation`,
            );
            globals.logger.info(
                '--> Note regarding API docs: If the line above mentions 0.0.0.0, this is the same as ANY server IP address.',
            );
            globals.logger.info("--> Replace 0.0.0.0 with one of the Butler host's IP addresses to view the API docs page.");
        }
    } catch (err) {
        globals.logger.error(`CONFIG: Error initiating host info: ${err}`);
        globals.logger.error(`CONFIG: Error initiating host info, stack trace: ${err.stack}`);
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
                    `API: Rate limit exceeded for source IP address ${request.ip}. Method=${request.method}, endpoint=${request.url}`,
                );
            }
            reply.send(error);
        });

        // This loads all plugins defined in plugins.
        // Those should be support plugins that are reused through your application
        await restServer.register(import('./plugins/sensible.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./plugins/support.js'), { options: Object.assign({}, opts) });

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
                            'Butler.restServerConfig.serverPort',
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
        await restServer.register(import('./routes/rest_server/api.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/base_conversion.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/butler_ping.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/disk_utils.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/key_value_store.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/mqtt_publish_message.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/newrelic_event.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/newrelic_metric.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/scheduler.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/sense_app.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/sense_app_dump.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/sense_list_apps.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/sense_start_task.js'), { options: Object.assign({}, opts) });
        await restServer.register(import('./routes/rest_server/slack_post_message.js'), { options: Object.assign({}, opts) });

        // ---------------------------------------------------
        // Configure X-HTTP-Method-Override handling
        await proxyRestServer.register(FastifyReplyFrom, {
            // base: `http://localhost:${globals.config.get('Butler.restServerConfig.backgroundServerPort')}`,
            base: `http://${globals.config.get('Butler.restServerConfig.serverHost')}:${globals.config.get(
                'Butler.restServerConfig.backgroundServerPort',
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

    // Set up config server, if enabled
    if (globals.config.get('Butler.configVisualisation.enable') === true) {
        // Register rate limit for API
        // 0 means no rate limit

        // This code registers the FastifyRateLimit plugin.
        // The plugin limits the number of API requests that
        // can be made from a given IP address within a given
        // time window.

        // 30 requests per minute
        await configVisServer.register(FastifyRateLimit, {
            max: 300,
            timeWindow: '1 minute',
        });

        // Add custom error handler for 429 errors (rate limit exceeded)
        configVisServer.setErrorHandler((error, request, reply) => {
            if (error.statusCode === 429) {
                globals.logger.warn(
                    `CONFIG VIS: Rate limit exceeded for source IP address ${request.ip}. Method=${request.method}, endpoint=${request.url}`,
                );
            }
            reply.send(error);
        });

        // This loads all plugins defined in plugins.
        // Those should be support plugins that are reused through your application
        await configVisServer.register(import('./plugins/sensible.js'), { options: Object.assign({}, opts) });
        await configVisServer.register(import('./plugins/support.js'), { options: Object.assign({}, opts) });

        // Create absolute path to the html directory
        // dirname points to the directory where this file (app.js) is located, taking into account
        // if the app is running as a packaged app or as a Node.js app.
        globals.logger.verbose(`----------------2: ${globals.appBasePath}`);

        // Get directory contents of dirname
        const dirContents = fs.readdirSync(globals.appBasePath);
        globals.logger.verbose(`CONFIG VIS: Directory contents of "${globals.appBasePath}": ${dirContents}`);

        const htmlDir = path.resolve(globals.appBasePath, 'static/configvis');
        globals.logger.info(`CONFIG VIS: Serving static files from ${htmlDir}`);

        await configVisServer.register(FastifyStatic, {
            root: htmlDir,
            constraints: {}, // optional: default {}. Example: { host: 'example.com' }
            redirect: true, // Redirect to trailing '/' when the pathname is a dir
        });

        configVisServer.get('/', async (request, reply) => {
            // Obfuscate the config object before sending it to the client
            // First get clean copy of the config object
            let newConfig = JSON.parse(JSON.stringify(globals.config));

            if (globals.config.get('Butler.configVisualisation.obfuscate')) {
                // Obfuscate config file before presenting it to the user
                // This is done to avoid leaking sensitive information
                // to users who should not have access to it.
                // The obfuscation is done by replacing parts of the
                // config file with masked strings.
                newConfig = configObfuscate(newConfig);
            }

            // Convert the (potentially obfuscated) config object to YAML format (=string)
            const butlerConfigYaml = yaml.dump(newConfig);

            // Read index.html from disk
            // dirname points to the directory where this file (app.js) is located, taking into account
            // if the app is running as a packaged app or as a Node.js app.
            globals.logger.verbose(`----------------3: ${globals.appBasePath}`);
            const filePath = path.resolve(globals.appBasePath, 'static/configvis', 'index.html');
            const template = fs.readFileSync(filePath, 'utf8');

            // Compile handlebars template
            const compiledTemplate = handlebars.compile(template);

            // Get config as HTML encoded JSON string
            const butlerConfigJsonEncoded = JSON.stringify(newConfig);

            // Render the template
            const renderedText = compiledTemplate({ butlerConfigJsonEncoded, butlerConfigYaml });

            globals.logger.debug(`CONFIG VIS: Rendered text: ${renderedText}`);

            // Send reply as HTML
            reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(renderedText);
        });
    }

    // Load already defined schedules
    if (globals.config.has('Butler.scheduler')) {
        if (globals.config.get('Butler.scheduler.enable') === true) {
            loadSchedulesFromDisk();
            // scheduler.launchAllSchedules();
        } else {
            // eslint-disable-next-line quotes
            globals.logger.info("MAIN: Didn't load schedules from file");
        }
    }

    await dockerHealthCheckServer.register(FastifyHealthcheck);

    return { restServer, proxyRestServer, dockerHealthCheckServer, configVisServer };
}

export default build;
