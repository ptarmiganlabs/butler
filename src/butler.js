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

// Set up connection to Influxdb (if enabled)
globals.initInfluxDB();

if (globals.config.get('Butler.uptimeMonitor.enable') == true) {
    serviceUptime.serviceUptimeStart();
}

// Load certificates to use when connecting to healthcheck API
// var fs = require('fs'),
var path = require('path'),
    certFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCert')),
    keyFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCertKey')),
    caFile = path.resolve(__dirname, globals.config.get('Butler.cert.clientCertCA'));

globals.logger.info('--------------------------------------');
globals.logger.info('Starting Butler');
globals.logger.info(`Log level is: ${globals.getLoggingLevel()}`);
globals.logger.info(`App version is: ${globals.appVersion}`);
globals.logger.info('--------------------------------------');

// Log info about what Qlik Sense certificates are being used
globals.logger.debug(`Client cert: ${certFile}`);
globals.logger.debug(`Client cert key: ${keyFile}`);
globals.logger.debug(`CA cert: ${caFile}`);

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
    allowHeaders: ['API-Token'],
    exposeHeaders: ['API-Token-Expiry'],
});

restServer.pre(cors.preflight);
restServer.use(cors.actual);

restServer.pre(restify.pre.sanitizePath());

restifySwaggerJsdoc.createSwaggerPage({
    title: 'Butler API documentation', // Page title
    description: 'Butler is a microservice that provides add-on features to Qlik Sense Enterprise on Windows.<br>Butler offers both a REST API and things like failed reload notifications etc.<p>This page contains the API documentation. Full documentation is available at https://butler.ptarmiganlabs.com',
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

if (globals.config.get('Butler.restServerEndpointsEnable.fileDelete')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/filedelete');
    restServer.put({ path: '/v4/filedelete' }, rest.disk_utils.respondPUT_fileDelete);
}

if (globals.config.get('Butler.restServerEndpointsEnable.fileMove')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/filemove');
    restServer.put({ path: '/v4/filemove' }, rest.disk_utils.respondPUT_fileMove);
}

if (globals.config.get('Butler.restServerEndpointsEnable.activeUserCount')) {
    globals.logger.debug('Registering REST endpoint GET /v4/activeusercount');
    restServer.get({ path: '/v4/activeusercount' }, rest.activeUserCount.respondGET_activeUserCount);
}

if (globals.config.get('Butler.restServerEndpointsEnable.activeUsers')) {
    globals.logger.debug('Registering REST endpoint GET /v4/activeusers');
    restServer.get({ path: '/v4/activeusers' }, rest.activeUsers.respondGET_activeUsers);
}

if (globals.config.get('Butler.restServerEndpointsEnable.slackPostMessage')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/slackpostmessage');
    restServer.put({ path: '/v4/slackpostmessage' }, rest.slackPostMessage.respondPUT_slackPostMessage);
}

if (globals.config.get('Butler.restServerEndpointsEnable.createDir')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/createdir');
    restServer.put({ path: '/v4/createdir' }, rest.createDir.respondPUT_createDir);
}

if (globals.config.get('Butler.restServerEndpointsEnable.createDirQVD')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/createdirqvd');
    restServer.put({ path: '/v4/createdirqvd' }, rest.createDirQVD.respondPUT_createDirQVD);
}

if (globals.config.get('Butler.restServerEndpointsEnable.mqttPublishMessage')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/mqttpublishmessage');
    restServer.put({ path: '/v4/mqttpublishmessage' }, rest.mqttPublishMessage.respondPUT_mqttPublishMessage);
}

if (globals.config.get('Butler.restServerEndpointsEnable.senseStartTask')) {
    globals.logger.debug('Registering REST endpoint PUT /v4/sensestarttask');
    restServer.put({ path: '/v4/sensestarttask' }, rest.senseStartTask.respondPUT_senseStartTask);
}

if (globals.config.get('Butler.restServerEndpointsEnable.senseAppDump')) {
    globals.logger.debug('Registering REST endpoint GET /v4/senseappdump');
    restServer.get({ path: '/v4/senseappdump/:appId' }, rest.senseAppDump.respondGET_senseAppDump);
}

if (globals.config.get('Butler.restServerEndpointsEnable.senseListApps')) {
    globals.logger.debug('Registering REST endpoint GET /v4/senselistapps');
    restServer.get({ path: '/v4/senselistapps' }, rest.senseListApps.respondGET_senseListApps);
}

if (globals.config.get('Butler.restServerEndpointsEnable.butlerping')) {
    globals.logger.debug('Registering REST endpoint GET /v4/butlerping');
    restServer.get({ path: '/v4/butlerping' }, rest.butlerPing.respondGET_butlerPing);
}

if (globals.config.get('Butler.restServerEndpointsEnable.base62ToBase16')) {
    globals.logger.debug('Registering REST endpoint GET /v4/base62tobase16');
    restServer.get({ path: '/v4/base62tobase16' }, rest.base62ToBase16.respondGET_base62ToBase16);
}

if (globals.config.get('Butler.restServerEndpointsEnable.base16ToBase62')) {
    globals.logger.debug('Registering REST endpoint GET /v4/base16tobase62');
    restServer.get({ path: '/v4/base16tobase62' }, rest.base16ToBase62.respondGET_base16ToBase62);
}

if (globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')) {
    globals.logger.debug('Registering REST endpoint GET /v4/keyvaluenamespaces');
    restServer.get({ path: '/v4/keyvaluenamespaces' }, rest.keyValueStore.respondGET_keyvaluenamespaces);

    globals.logger.debug('Registering REST endpoint GET /v4/keyvalue');
    restServer.get({ path: '/v4/keyvalue/:namespace/:key' }, rest.keyValueStore.respondGET_keyvalue);
    restServer.get({ path: '/v4/keyvalue/:namespace' }, rest.keyValueStore.respondGET_keyvalue);
    restServer.get({ path: '/v4/keyvalue' }, rest.keyValueStore.respondGET_keyvalue);

    globals.logger.debug('Registering REST endpoint POST /v4/keyvalue');
    restServer.post({ path: '/v4/keyvalue/:namespace' }, rest.keyValueStore.respondPOST_keyvalue);

    globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalue/{namespace}/{key}');
    restServer.del({ path: '/v4/keyvalue/:namespace/:key' }, rest.keyValueStore.respondDELETE_keyvalue);

    globals.logger.debug('Registering REST endpoint PUT /v4/keyvalue/{namespace}/clear');
    restServer.put({ path: '/v4/keyvalue/:namespace/clear' }, rest.keyValueStore.respondPUT_keyvalueClear);
}

if (globals.config.get('Butler.scheduler.enable')) {
    if (globals.config.get('Butler.restServerEndpointsEnable.scheduler.getSchedule')) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedule');

        restServer.post({ path: '/v4/schedule' }, rest.scheduler.respondPOST_schedule);
    }

    if (globals.config.get('Butler.restServerEndpointsEnable.scheduler.createNewSchedule')) {
        globals.logger.debug('Registering REST endpoint GET /v4/schedule');

        restServer.get({ path: '/v4/schedule/:scheduleId' }, rest.scheduler.respondGET_schedule);
        restServer.get({ path: '/v4/schedule' }, rest.scheduler.respondGET_schedule);
    }

    if (globals.config.get('Butler.restServerEndpointsEnable.scheduler.deleteSchedule')) {
        globals.logger.debug('Registering REST endpoint DELETE /v4/schedule');

        restServer.del({ path: '/v4/schedule/:scheduleId' }, rest.scheduler.respondDELETE_schedule);
    }

    if (globals.config.get('Butler.restServerEndpointsEnable.scheduler.startSchedule')) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedulestart');

        restServer.post({ path: '/v4/schedulestart/:scheduleId' }, rest.scheduler.respondPOST_scheduleStart);
        restServer.post({ path: '/v4/schedulestart' }, rest.scheduler.respondPOST_scheduleStart);
    }

    if (globals.config.get('Butler.restServerEndpointsEnable.scheduler.stopSchedule')) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedulestop');

        restServer.post({ path: '/v4/schedulestop/:scheduleId' }, rest.scheduler.respondPOST_scheduleStop);
        restServer.post({ path: '/v4/schedulestop' }, rest.scheduler.respondPOST_scheduleStop);
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
        globals.logger.info('MAIN: Didn\'t load schedules from file');
    }
}

// Set up heartbeats
if (globals.config.get('Butler.heartbeat.enable') == true) {
    heartbeat.setupHeartbeatTimer(globals.config, globals.logger);

    globals.logger.info('MAIN: Heartbeat timer has been set up');
}

// Start Docker healthcheck REST server on port 12398
restServerDockerHealthCheck.listen(12398, function () {
    globals.logger.info('MAIN: Docker healthcheck server now listening');
});
