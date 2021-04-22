// Add dependencies
var restify = require('restify');
var corsMiddleware = require('restify-cors-middleware');
var restifySwaggerJsdoc = require('restify-swagger-jsdoc');

// Load code from sub modules
var globals = require('./globals');
var rest = require('./rest');
var mqtt = require('./mqtt');
var udp = require('./udp');
var heartbeat = require('./lib/heartbeat.js');
var scheduler = require('./lib/scheduler.js');
const serviceUptime = require('./lib/service_uptime');
const telemetry = require('./lib/telemetry');

// Set up connection to Influxdb (if enabled)
globals.initInfluxDB();

if (globals.config.get('Butler.uptimeMonitor.enable') == true) {
    serviceUptime.serviceUptimeStart();
}

// Load certificates to use when connecting to healthcheck API
var path = require('path'),
    certFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCert')),
    keyFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCertKey')),
    caFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCertCA'));

(async () => {
    try {
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
        globals.logger.info(`Client cert: ${certFile}`);
        globals.logger.info(`Client cert key: ${keyFile}`);
        globals.logger.info(`CA cert: ${caFile}`);

        // Set up anon telemetry reports, if enabled
        if (
            globals.config.has('Butler.anonTelemetry') == false ||
            (globals.config.has('Butler.anonTelemetry') == true && globals.config.get('Butler.anonTelemetry') == true)
        ) {
            telemetry.setupAnonUsageReportTimer();
            globals.logger.verbose('MAIN: Anonymous telemetry reporting has been set up.');
        }
    } catch (err) {
        globals.logger.error(`CONFIG: Error initiating host info: ${err}`);
    }
})();

// ---------------------------------------------------
// Create restServer object for Docker healthcheck
var restServerDockerHealthCheck = restify.createServer({
    name: 'Docker healthcheck for Butler',
    version: globals.appVersion,
});

// Enable parsing of http parameters
restServerDockerHealthCheck.use(restify.plugins.queryParser());

// Set up endpoint for Docker healthcheck REST server
restServerDockerHealthCheck.get(
    {
        path: '/',
        flags: 'i',
    },
    (req, res, next) => {
        globals.logger.verbose('Docker healthcheck API endpoint called.');

        res.send(0);
        next();
    },
);

// ---------------------------------------------------
// Create restServer object
var restServer = restify.createServer({
    name: 'Butler for Qlik Sense',
    version: globals.appVersion,
});

// Enable parsing of http parameters
restServer.use(restify.plugins.queryParser());

// Enable parsing of request body
restServer.use(restify.plugins.bodyParser());

// Set up CORS handling
const cors = corsMiddleware({
    preflightMaxAge: 5, //Optional
    origins: ['*'],
    // allowHeaders: ['Access-Control-Allow-Origin'],
    // exposeHeaders: [],
});

restServer.pre(cors.preflight);
restServer.use(cors.actual);

restServer.pre(function (req, res, next) {
    // Is there a X-HTTP-Method-Override header?
    // If so, change the http method to the one specified

    for (const [key, value] of Object.entries(req.headers)) {
        if (key.toLowerCase() == 'x-http-method-override') {
            req.method = value;
        }
    }

    req.headers.accept = 'application/json';
    return next();
});

// Cleans up sloppy URLs on the request object
// TODO Verify that sloppy URLs are really cleaned up
restServer.pre(restify.plugins.pre.sanitizePath());

// Dedupe slashes in URL before routing
// TODO Verify that deduping really works.
restServer.pre(restify.plugins.pre.dedupeSlashes());

restifySwaggerJsdoc.createSwaggerPage({
    title: 'Butler API documentation', // Page title
    description:
        'Butler is a microservice that provides add-on features to Qlik Sense Enterprise on Windows.<br>Butler offers both a REST API and things like failed reload notifications etc.<p>This page contains the API documentation. Full documentation is available at https://butler.ptarmiganlabs.com',
    version: globals.appVersion, // Server version
    server: restServer, // Restify server instance created with restify.createServer()
    path: '/docs/swagger', // Public url where the swagger page will be available
    apis: ['./rest/*.js'],
});
// Set up endpoints for REST server
//restServer.get('/v4/senseQRSPing', rest.senseQRSPing.respondSenseQRSPing);

// if (globals.config.get('Butler.restServerEndpointsEnable.getDiskSpace')) {
//     globals.logger.debug('Registering REST endpoint GET /v4/getdiskspace');
//     restServer.get({ path: '/v4/getdiskspace' }, rest.getDiskSpace.respondGET_getDiskSpace);
// }
if (
    globals.config.has('Butler.restServerEndpointsEnable.apiListEnbledEndpoints') &&
    globals.config.get('Butler.restServerEndpointsEnable.apiListEnbledEndpoints')
) {
    globals.logger.debug('Registering REST endpoint GET /v4/configfile/endpointsenabled');
    restServer.get({ path: '/v4/configfile/endpointsenabled' }, rest.api.respondGET_configFileListEnbledEndpoints);
}

if (globals.config.has('Butler.restServerEndpointsEnable.fileDelete') && globals.config.get('Butler.restServerEndpointsEnable.fileDelete')) {
    globals.logger.debug('Registering REST endpoint DELETE /v4/filedelete');
    restServer.del({ path: '/v4/filedelete' }, rest.disk_utils.respondPUT_fileDelete);
}

if (globals.config.has('Butler.restServerEndpointsEnable.fileMove') && globals.config.get('Butler.restServerEndpointsEnable.fileMove')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/filemove');
    restServer.put({ path: '/v4/filemove' }, rest.disk_utils.respondPUT_fileMove);
}

if (globals.config.has('Butler.restServerEndpointsEnable.fileCopy') && globals.config.get('Butler.restServerEndpointsEnable.fileCopy')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/filecopy');
    restServer.put({ path: '/v4/filecopy' }, rest.disk_utils.respondPUT_fileCopy);
}

if (globals.config.has('Butler.restServerEndpointsEnable.activeUserCount') && globals.config.get('Butler.restServerEndpointsEnable.activeUserCount')) {
    globals.logger.debug('Registering REST endpoint GET /v4/activeusercount');
    restServer.get({ path: '/v4/activeusercount' }, rest.activeUserCount.respondGET_activeUserCount);
}

if (globals.config.has('Butler.restServerEndpointsEnable.activeUsers') && globals.config.get('Butler.restServerEndpointsEnable.activeUsers')) {
    globals.logger.debug('Registering REST endpoint GET /v4/activeusers');
    restServer.get({ path: '/v4/activeusers' }, rest.activeUsers.respondGET_activeUsers);
}

if (globals.config.has('Butler.restServerEndpointsEnable.slackPostMessage') && globals.config.get('Butler.restServerEndpointsEnable.slackPostMessage')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/slackpostmessage');
    restServer.put({ path: '/v4/slackpostmessage' }, rest.slackPostMessage.respondPUT_slackPostMessage);
}

if (globals.config.has('Butler.restServerEndpointsEnable.createDir') && globals.config.get('Butler.restServerEndpointsEnable.createDir')) {
    globals.logger.debug('Registering REST endpoint POST /v4/createdir');
    restServer.post({ path: '/v4/createdir' }, rest.disk_utils.respondPOST_createDir);
}

if (globals.config.has('Butler.restServerEndpointsEnable.createDirQVD') && globals.config.get('Butler.restServerEndpointsEnable.createDirQVD')) {
    globals.logger.debug('Registering REST endpoint POST /v4/createdirqvd');
    restServer.post({ path: '/v4/createdirqvd' }, rest.disk_utils.respondPOST_createDirQVD);
}

if (globals.config.has('Butler.restServerEndpointsEnable.mqttPublishMessage') && globals.config.get('Butler.restServerEndpointsEnable.mqttPublishMessage')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/mqttpublishmessage');
    restServer.put({ path: '/v4/mqttpublishmessage' }, rest.mqttPublishMessage.respondPUT_mqttPublishMessage);
}

if (globals.config.has('Butler.restServerEndpointsEnable.senseStartTask') && globals.config.get('Butler.restServerEndpointsEnable.senseStartTask')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/sensestarttask');
    restServer.put({ path: '/v4/reloadtask/:taskId/start' }, rest.senseStartTask.respondPUT_senseStartTask);
}

if (globals.config.has('Butler.restServerEndpointsEnable.senseAppReload') && globals.config.get('Butler.restServerEndpointsEnable.senseAppReload')) {
    globals.logger.debug('Registering REST endpoint GET /v4/app/:appId/reload');
    restServer.put({ path: '/v4/app/:appId/reload' }, rest.senseApp.respondPUT_senseAppReload);
}

if (globals.config.has('Butler.restServerEndpointsEnable.senseAppDump') && globals.config.get('Butler.restServerEndpointsEnable.senseAppDump')) {
    globals.logger.debug('Registering REST endpoint GET /v4/senseappdump');
    restServer.get({ path: '/v4/senseappdump/:appId' }, rest.senseAppDump.respondGET_senseAppDump);
    restServer.get({ path: '/v4/app/:appId/dump' }, rest.senseAppDump.respondGET_senseAppDump);
}

if (globals.config.has('Butler.restServerEndpointsEnable.senseListApps') && globals.config.get('Butler.restServerEndpointsEnable.senseListApps')) {
    globals.logger.debug('Registering REST endpoint GET /v4/senselistapps');
    restServer.get({ path: '/v4/senselistapps' }, rest.senseListApps.respondGET_senseListApps);
    restServer.get({ path: '/v4/apps/list' }, rest.senseListApps.respondGET_senseListApps);
}

if (globals.config.has('Butler.restServerEndpointsEnable.butlerping') && globals.config.get('Butler.restServerEndpointsEnable.butlerping')) {
    globals.logger.debug('Registering REST endpoint GET /v4/butlerping');
    restServer.get({ path: '/v4/butlerping' }, rest.butlerPing.respondGET_butlerPing);
}

if (globals.config.has('Butler.restServerEndpointsEnable.base62ToBase16') && globals.config.get('Butler.restServerEndpointsEnable.base62ToBase16')) {
    globals.logger.debug('Registering REST endpoint GET /v4/base62tobase16');
    restServer.get({ path: '/v4/base62tobase16' }, rest.base62ToBase16.respondGET_base62ToBase16);
}

if (globals.config.has('Butler.restServerEndpointsEnable.base16ToBase62') && globals.config.get('Butler.restServerEndpointsEnable.base16ToBase62')) {
    globals.logger.debug('Registering REST endpoint GET /v4/base16tobase62');
    restServer.get({ path: '/v4/base16tobase62' }, rest.base16ToBase62.respondGET_base16ToBase62);
}

if (globals.config.has('Butler.restServerEndpointsEnable.keyValueStore') && globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')) {
    globals.logger.debug('Registering REST endpoint GET /v4/keyvaluenamespaces');
    restServer.get({ path: '/v4/keyvaluesnamespaces' }, rest.keyValueStore.respondGET_keyvaluesnamespaces);

    globals.logger.debug('Registering REST endpoint GET /v4/keyvalues/:namespace/keyexists');
    restServer.get({ path: '/v4/keyvalues/:namespace/keyexists' }, rest.keyValueStore.respondGET_keyvalueExists);

    globals.logger.debug('Registering REST endpoint GET /v4/keyvalues');
    restServer.get({ path: '/v4/keyvalues/:namespace' }, rest.keyValueStore.respondGET_keyvalues);

    globals.logger.debug('Registering REST endpoint POST /v4/keyvalues');
    restServer.post({ path: '/v4/keyvalues/:namespace' }, rest.keyValueStore.respondPOST_keyvalues);

    globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalues/{namespace}/{key}');
    restServer.del({ path: '/v4/keyvalues/:namespace/:key' }, rest.keyValueStore.respondDELETE_keyvalues);

    globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalues/{namespace}');
    restServer.del({ path: '/v4/keyvalues/:namespace' }, rest.keyValueStore.respondDELETE_keyvaluesDelete);

    globals.logger.debug('Registering REST endpoint GET /v4/keylist/{namespace}');
    restServer.get({ path: '/v4/keylist/:namespace' }, rest.keyValueStore.respondGET_keylistGet);
}

if (globals.config.has('Butler.scheduler.enable') && globals.config.get('Butler.scheduler.enable')) {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.createNewSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.createNewSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedules');

        restServer.post({ path: '/v4/schedules' }, rest.scheduler.respondPOST_schedules);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.getSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.getSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/schedules');

        restServer.get({ path: '/v4/schedules' }, rest.scheduler.respondGET_schedules);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.deleteSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.deleteSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint DELETE /v4/schedules');

        restServer.del({ path: '/v4/schedules/:scheduleId' }, rest.scheduler.respondDELETE_schedules);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.startSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.startSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedulestart');

        restServer.put({ path: '/v4/schedules/:scheduleId/start' }, rest.scheduler.respondPUT_schedulesStart);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.stopSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.stopSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedulestop');

        restServer.put({ path: '/v4/schedules/:scheduleId/stop' }, rest.scheduler.respondPUT_schedulesStop);
    }
}

// ---------------------------------------------------
// Set up MQTT
if (globals.config.get('Butler.mqttConfig.enable')) {
    mqtt.mqtt.mqttInitHandlers();
}

// ---------------------------------------------------
// Set up UDP handlers
if (globals.config.get('Butler.udpServerConfig.enable')) {
    udp.udp.udpInitTaskErrorServer();
    udp.udp.udpInitSessionConnectionServer();

    globals.logger.debug(`Server for UDP server: ${globals.udp_host}`);

    // Start UDP server for Session and Connection events
    globals.udpServerSessionConnectionSocket.bind(globals.udp_port_session_connection, globals.udp_host);

    // Start UDP server for failed task events
    globals.udpServerTaskFailureSocket.bind(globals.udp_port_take_failure, globals.udp_host);
}

// ---------------------------------------------------
// Start REST server on port 8080
if (globals.config.get('Butler.restServerConfig.enable')) {
    globals.logger.debug(`REST server host: ${globals.config.get('Butler.restServerConfig.serverHost')}`);
    globals.logger.debug(`REST server port: ${globals.config.get('Butler.restServerConfig.serverPort')}`);

    restServer.listen(globals.config.get('Butler.restServerConfig.serverPort'), globals.config.get('Butler.restServerConfig.serverHost'), function () {
        globals.logger.info(`MAIN: REST server listening on ${restServer.url}`);
    });
}

// Load already defined schedules
if (globals.config.has('Butler.scheduler')) {
    if (globals.config.get('Butler.scheduler.enable') == true) {
        scheduler.loadSchedulesFromDisk();
        // scheduler.launchAllSchedules();
    } else {
        // eslint-disable-next-line quotes
        globals.logger.info("MAIN: Didn't load schedules from file");
    }
}

// Set up heartbeats, if enabled in the config file
if (globals.config.get('Butler.heartbeat.enable') == true) {
    heartbeat.setupHeartbeatTimer(globals.config, globals.logger);

    globals.logger.info('MAIN: Heartbeat timer has been set up');
}

// Start Docker healthcheck REST server on port set in config file
if (globals.config.get('Butler.dockerHealthCheck.enable') == true) {
    globals.logger.verbose('MAIN: Starting Docker healthcheck server...');

    restServerDockerHealthCheck.listen(globals.config.get('Butler.dockerHealthCheck.port'), function () {
        globals.logger.info('MAIN: Docker healthcheck server now listening');
    });
}

// Code below used during development

// process.on('SIGUSR2', () => {
//     // Run with
//    // node --expose-gc butler.js
//     //
//     // Trigger with
//     // kill -SIGUSR2 $(pgrep -lfa node | grep butler.js | awk '{print $1}'
//     try {
//         if (global.gc) {
//             console.info('SIGUSR2 signal received. GC starting');
//             global.gc();
//         } else {
//             console.log('`node --expose-gc index.js`');
//             process.exit();
//         }
//     } catch (e) {
//         console.log('`node --expose-gc index.js`');
//         process.exit();
//     }
// });
