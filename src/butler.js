// Add dependencies
var restify = require('restify');
var corsMiddleware = require('restify-cors-middleware');

// Load code from sub modules
var globals = require('./globals');
var rest = require('./rest');
var mqtt = require('./mqtt');
var udp = require('./udp');

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
restServerDockerHealthCheck.get({
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

// Set up CORS handling
const cors = corsMiddleware({
    preflightMaxAge: 5, //Optional
    origins: ['*'],
    allowHeaders: ['API-Token'],
    exposeHeaders: ['API-Token-Expiry'],
});

restServer.pre(cors.preflight);
restServer.use(cors.actual);

// Set up endpoints for REST server
//restServer.get('/v2/getDiskSpace', rest.getDiskSpace.respondGetDiskSpace);
//restServer.get('/v2/senseQRSPing', rest.senseQRSPing.respondSenseQRSPing);

if (globals.config.get('Butler.restServerEndpointsEnable.activeUserCount')) {
    globals.logger.debug('Registering REST endpoint /v2/activeUserCount');
    restServer.get({
            path: '/v2/activeUserCount',
            flags: 'i',
        },
        rest.activeUserCount.respondActiveUserCount,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.activeUsers')) {
    globals.logger.debug('Registering REST endpoint /v2/activeUsers');
    restServer.get({
            path: '/v2/activeUsers',
            flags: 'i',
        },
        rest.activeUsers.respondActiveUsers,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.slackPostMessage')) {
    globals.logger.debug('Registering REST endpoint /v2/slackPostMessage');
    restServer.get({
            path: '/v2/slackPostMessage',
            flags: 'i',
        },
        rest.slackPostMessage.respondSlackPostMessage,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.createDir')) {
    globals.logger.debug('Registering REST endpoint /v2/createDir');
    restServer.get({
            path: '/v2/createDir',
            flags: 'i',
        },
        rest.createDir.respondCreateDir,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.createDirQVD')) {
    globals.logger.debug('Registering REST endpoint /v2/createDirQVD');
    restServer.get({
            path: '/v2/createDirQVD',
            flags: 'i',
        },
        rest.createDirQVD.respondCreateDirQVD,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.mqttPublishMessage')) {
    globals.logger.debug('Registering REST endpoint /v2/mqttPublishMessage');
    restServer.get({
            path: '/v2/mqttPublishMessage',
            flags: 'i',
        },
        rest.mqttPublishMessage.respondMQTTPublishMessage,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.senseStartTask')) {
    globals.logger.debug('Registering REST endpoint /v2/senseStartTask');
    restServer.get({
            path: '/v2/senseStartTask',
            flags: 'i',
        },
        rest.senseStartTask.respondSenseStartTask,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.senseAppDump')) {
    globals.logger.debug('Registering REST endpoint /v2/senseAppDump');
    restServer.get({
            path: '/v2/senseAppDump',
            flags: 'i',
        },
        rest.senseAppDump.respondSenseAppDump,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.senseListApps')) {
    globals.logger.debug('Registering REST endpoint /v2/senseListApps');
    restServer.get({
            path: '/v2/senseListApps',
            flags: 'i',
        },
        rest.senseListApps.respondSenseListApps,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.butlerping')) {
    globals.logger.debug('Registering REST endpoint /v2/butlerping');
    restServer.get({
            path: '/v2/butlerping',
            flags: 'i',
        },
        rest.butlerPing.respondButlerPing,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.base62ToBase16')) {
    globals.logger.debug('Registering REST endpoint /v2/base62ToBase16');
    restServer.get({
            path: '/v2/base62ToBase16',
            flags: 'i',
        },
        rest.base62ToBase16.respondBase62ToBase16,
    );
}

if (globals.config.get('Butler.restServerEndpointsEnable.base16ToBase62')) {
    globals.logger.debug('Registering REST endpoint /v2/base16ToBase62');
    restServer.get({
            path: '/v2/base16ToBase62',
            flags: 'i',
        },
        rest.base16ToBase62.respondBase16ToBase62,
    );
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
    globals.udpServerSessionConnectionSocket.bind(
        globals.udp_port_session_connection,
        globals.udp_host,
    );

    // Start UDP server for failed task events
    globals.udpServerTaskFailureSocket.bind(globals.udp_port_take_failure, globals.udp_host);
}

// ---------------------------------------------------
// Start REST server on port 8080

if (globals.config.get('Butler.restServerConfig.enable')) {
    globals.logger.debug(
        `REST server host: ${globals.config.get('Butler.restServerConfig.serverHost')}`,
    );
    globals.logger.debug(
        `REST server port: ${globals.config.get('Butler.restServerConfig.serverPort')}`,
    );

    restServer.listen(
        globals.config.get('Butler.restServerConfig.serverPort'),
        globals.config.get('Butler.restServerConfig.serverHost'),
        function () {
            globals.logger.info(`REST server listening on ${restServer.url}`);
        },
    );
}


// Start Docker healthcheck REST server on port 12398
restServerDockerHealthCheck.listen(12398, function () {
    globals.logger.info('MAIN: Docker healthcheck server now listening');
});
