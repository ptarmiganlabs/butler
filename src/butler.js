// Add dependencies
var restify = require('restify');
var corsMiddleware = require('restify-cors-middleware');

// Load code from sub modules
var globals = require('./globals');
var rest = require('./rest');
var mqtt = require('./mqtt');
var udp = require('./udp');


globals.logger.info('--------------------------------------');
globals.logger.info('Starting Butler');
globals.logger.info('Log level is: ' + globals.logTransports.console.level);
globals.logger.info('App version is: ' + globals.appVersion);
globals.logger.info('--------------------------------------');

// Log info about what Qlik Sense certificates are being used
globals.logger.debug(`QRS client cert: ${globals.config.get('Butler.configQRS.cert')}`);
globals.logger.debug(`QRS client cert key: ${globals.config.get('Butler.configQRS.key')}`);
globals.logger.debug(`QRS CA cert: ${globals.config.get('Butler.configQRS.ca')}`);


// ---------------------------------------------------
// Create restServer object
var restServer = restify.createServer({
    name: 'Butler for Qlik Sense',
    version: globals.appVersion
});


// Enable parsing of http parameters
restServer.use(restify.plugins.queryParser());


// Set up CORS handling
const cors = corsMiddleware({
    preflightMaxAge: 5, //Optional
    origins: ['*'],
    allowHeaders: ['API-Token'],
    exposeHeaders: ['API-Token-Expiry']
});

restServer.pre(cors.preflight);
restServer.use(cors.actual);

// Set up endpoints for REST server
//restServer.get('/v2/getDiskSpace', rest.getDiskSpace.respondGetDiskSpace);
//restServer.get('/v2/senseQRSPing', rest.senseQRSPing.respondSenseQRSPing);
restServer.get({
    path: '/v2/activeUserCount',
    flags: 'i'
}, rest.activeUserCount.respondActiveUserCount);
restServer.get({
    path: '/v2/activeUsers',
    flags: 'i'
}, rest.activeUsers.respondActiveUsers);
restServer.get({
    path: '/v2/slackPostMessage',
    flags: 'i'
}, rest.slackPostMessage.respondSlackPostMessage);
restServer.get({
    path: '/v2/createDir',
    flags: 'i'
}, rest.createDir.respondCreateDir);
restServer.get({
    path: '/v2/createDirQVD',
    flags: 'i'
}, rest.createDirQVD.respondCreateDirQVD);
restServer.get({
    path: '/v2/mqttPublishMessage',
    flags: 'i'
}, rest.mqttPublishMessage.respondMQTTPublishMessage);
restServer.get({
    path: '/v2/senseStartTask',
    flags: 'i'
}, rest.senseStartTask.respondSenseStartTask);
restServer.get({
    path: '/v2/senseAppDump',
    flags: 'i'
}, rest.senseAppDump.respondSenseAppDump);
restServer.get({
    path: '/v2/senseListApps',
    flags: 'i'
}, rest.senseListApps.respondSenseListApps);
restServer.get({
    path: '/v2/butlerping',
    flags: 'i'
}, rest.butlerPing.respondButlerPing);
restServer.get({
    path: '/v2/base62ToBase16',
    flags: 'i'
}, rest.base62ToBase16.respondBase62ToBase16);
restServer.get({
    path: '/v2/base16ToBase62',
    flags: 'i'
}, rest.base16ToBase62.respondBase16ToBase62);

// ---------------------------------------------------
// Set up MQTT
mqtt.mqtt.mqttInitHandlers();



// ---------------------------------------------------
// Set up UDP handlers
udp.udp.udpInitTaskErrorServer();
udp.udp.udpInitSessionConnectionServer();


// ---------------------------------------------------
// Start REST server on port 8080

globals.logger.debug(`REST server host: ${globals.config.get('Butler.restServerConfig.serverHost')}`);
globals.logger.debug(`REST server port: ${globals.config.get('Butler.restServerConfig.serverPort')}`);
restServer.listen(globals.config.get('Butler.restServerConfig.serverPort'), globals.config.get('Butler.restServerConfig.serverHost'), function () {
    globals.logger.info(`REST server listening on ${restServer.url}`);
});

globals.logger.debug(`Server for UDP server: ${globals.udp_host}`);

// Start UDP server for Session and Connection events
globals.udpServerSessionConnectionSocket.bind(globals.udp_port_session_connection, globals.udp_host);

// Start UDP server for failed task events
globals.udpServerTaskFailureSocket.bind(globals.udp_port_take_failure, globals.udp_host);
