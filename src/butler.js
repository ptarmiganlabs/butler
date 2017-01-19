// Add dependencies
var restify = require('restify');


// Load code from sub modules
var globals = require('./globals');
var rest = require('./rest');
var mqtt = require('./mqtt');
var udp = require('./udp');



// Set default debug level
// { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
globals.logger.transports.console.level = 'warn';


// ---------------------------------------------------
// Create restServer object
var restServer = restify.createServer({
    name: 'Butler for Qlik Sense'
});

// Enable parsing of http parameters
restServer.use(restify.queryParser());

// Set up endpoints for REST server
restServer.get('/v2/activeUserCount', rest.activeUserCount.respondActiveUserCount);
restServer.get('/v2/activeUsers', rest.activeUsers.respondActiveUsers);
restServer.get('/v2/slackPostMessage', rest.slackPostMessage.respondSlackPostMessage);
restServer.get('/v2/createDir', rest.createDir.respondCreateDir);
restServer.get('/v2/createDirQVD', rest.createDirQVD.respondCreateDirQVD);
restServer.get('/v2/getDiskSpace', rest.getDiskSpace.respondGetDiskSpace);
restServer.get('/v2/mqttPublishMessage', rest.mqttPublishMessage.respondMQTTPublishMessage);
restServer.get('/v2/senseStartTask', rest.senseStartTask.respondSenseStartTask);
//restServer.get('/v2/senseQRSPing', rest.senseQRSPing.respondSenseQRSPing);
restServer.get('/v2/senseAppDump', rest.senseAppDump.respondSenseAppDump);
restServer.get('/v2/senseListApps', rest.senseListApps.respondSenseListApps);
restServer.get('/v2/butlerPing', rest.butlerPing.respondButlerPing);
restServer.get('/v2/base62ToBase16', rest.base62ToBase16.respondBase62ToBase16);
restServer.get('/v2/base16ToBase62', rest.base16ToBase62.respondBase16ToBase62);


// ---------------------------------------------------
// Set up MQTT
mqtt.mqtt.mqttInitHandlers();


// ---------------------------------------------------
// Set up UDP handlers
udp.udp.udpInitTaskErrorServer();
udp.udp.udpInitSessionConnectionServer();


// ---------------------------------------------------
// Start REST server on port 8080
restServer.listen(globals.config.get('Butler.restServerConfig.serverPort'), function() {
    var oldLogLevel = globals.logger.transports.console.level;
    globals.logger.transports.console.level = 'info';

    globals.logger.log('info', 'REST server listening on %s', restServer.url);

    globals.logger.transports.console.level = oldLogLevel;
});

// Start UDP server for Session and Connection events
globals.udpServerSessionConnectionSocket.bind(globals.udp_port_session_connection, globals.udp_host);

// Start UDP server for failed task events
globals.udpServerTaskFailureSocket.bind(globals.udp_port_take_failure, globals.udp_host);
