// Add dependencies
var restify = require('restify');
var slack = require('node-slack');
var mkdirp = require('mkdirp');
var disk = require('diskusage');
var mqtt = require('mqtt');
var dgram = require('dgram');
var os = require('os');
var QRS = require('qrs');
var config = require('config');





// Load code from sub modules
var rest = require('./rest');



// Slack config
var slackWebhookURL = config.get('Butler.slackConfig.webhookURL');
var slackLoginNotificationChannel = config.get('Butler.slackConfig.loginNotificationChannel');
var slackTaskFailureChannel = config.get('Butler.slackConfig.taskFailureChannel');

// Create Slack object
var slack = new slack(slackWebhookURL);




// Set up connection parameters for Sense QRS API
var qrsConfig = {
  "host": config.get('Butler.qrsConfig.serverIP'),
  "useSSL": config.get('Butler.qrsConfig.useSSL'),
  "xrfkey": config.get('Butler.qrsConfig.xrfkey'),
  "authentication": config.get('Butler.qrsConfig.authentication'),
  "headerKey": config.get('Butler.qrsConfig.headerKey'),
  "headerValue": config.get('Butler.qrsConfig.headerValue'),
  "virtualProxy": config.get('Butler.qrsConfig.virtualProxy')
};
var qrs = new QRS( qrsConfig );



// Create MQTT client object and connect to MQTT broker
var mqttClient  = mqtt.connect('mqtt://' + config.get('Butler.mqttConfig.brokerIP'));
/*
Following might be needed for conecting to older Mosquitto versions
var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
  protocolId: 'MQIsdp',
  protocolVersion: 3
});
*/

// Create restServer object
var restServer = restify.createServer({
  name: 'Butler for Qlik Sense'
});

// Enable parsing of http parameters
restServer.use(restify.queryParser());


// UDP server connection parameters
const UDP_HOST = config.get('Butler.udpServerConfig.serverIP');

// Prepare to listen on port 9997 for incoming UDP connections regarding session starting/stoping, or connection opening/closing
var udpServerSessionConnection = dgram.createSocket({type:"udp4", reuseAddr:true});
const UDP_PORT_SESSION_CONNECTION = config.get('Butler.udpServerConfig.portSessionConnectionEvents');

// Prepare to listen on port 9998 for incoming UDP connections regarding failed tasks
var udpServerTaskFailure = dgram.createSocket({type:"udp4", reuseAddr:true});
const UDP_PORT_TASK_FAILURE = config.get('Butler.udpServerConfig.portTaskFailure');




// ------------------------------------------------
// Handler for MQTT connect messages. Called when connection to MQTT broker has been established
mqttClient.on('connect', function () {
  console.info('Connected to MQTT broker');

  // Let the world know that Butler is connected to MQTT
  mqttClient.publish('qliksense/butler/mqtt/status', 'Connected to MQTT broker');

  // Have Butler listen to all messages in the qliksense/ subtree
  mqttClient.subscribe('qliksense/#');
});

// Handler for MQTT messages matching the previously set up subscription
mqttClient.on('message', function (topic, message) {

  console.info('MQTT message received');
  console.info(topic.toString());
  console.info(message.toString());

  // **MQTT message dispatch**
  // Start Sense task
  if (topic == 'qliksense/start_task') {
    startSenseTask(message.toString());
  };
});

// Handler for MQTT errors
mqttClient.on('error', function (topic, message) {
  // Error occured
  console.error('MQTT error');
});
// ------------------------------------------------



// ------------------------------------------------



// Set up UDP server for acting on Sense session and connection events
// -------------------------------------------------------------------

// Handler for UDP server startup event
udpServerSessionConnection.on('listening', () => {
  var address = udpServerSessionConnection.address();
  console.info('UDP server listening on %s:%s', address.address, address.port);

  // Publish MQTT message that UDP server has started
  mqttClient.publish('qliksense/butler/session_server', 'start');
});

// Handler for UDP error event
udpServerSessionConnection.on('error', () => {
  var address = udpServerSessionConnection.address();
  console.error('UDP server error on %s:%s', address.address, address.port);
  // Publish MQTT message that UDP server has reported an error
  mqttClient.publish('qliksense/butler/session_server', 'error');
});

// Main handler for UDP messages relating to session and connection events
udpServerSessionConnection.on('message', function(message, remote) {
  var msg = message.toString().split(';');
  console.info('%s: %s for user %s/%s', msg[0], msg[1], msg[2], msg[3])

  // Send Slack message when session starts/stops, or a connection open/close
  slack.send({
    text: msg[1] + ' for user ' + msg[2] + '/' + msg[3],
    channel: SLACK_LOGIN_NOTIFICATION_CHANNEL,
    username: msg[0],
    icon_emoji: ''
  });

  // Handle session events
  if (msg[1] == 'Start session') {
    mqttClient.publish(config.get('Butler.mqttConfig.sessionStartTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

  if (msg[1] == 'Stop session') {
    mqttClient.publish(config.get('Butler.mqttConfig.sessionStopTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

  // Handle connection events
  if (msg[1] == 'Open connection') {
    mqttClient.publish(config.get('Butler.mqttConfig.connectionOpenTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

  if (msg[1] == 'Close connection') {
    mqttClient.publish(config.get('Butler.mqttConfig.connectionCloseTopic'), msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

});
// ------------------------------------------------


// ------------------------------------------------
// Set up UDP server for acting on Sense failed task events
// --------------------------------------------------------

// Handler for UDP server startup event
udpServerTaskFailure.on('listening', () => {
  var address = udpServerTaskFailure.address();
  console.log('UDP server listening on %s:%s', address.address, address.port);
  // Publish MQTT message that UDP server has started
  mqttClient.publish(config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
});

// Handler for UDP error event
udpServerTaskFailure.on('error', () => {
  var address = udpServerTaskFailure.address();
  console.log('UDP server error on %s:%s', address.address, address.port);
  // Publish MQTT message that UDP server has reported an error
  mqttClient.publish(config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
});

// Main handler for UDP messages relating to failed tasks
udpServerTaskFailure.on('message', function(message, remote) {
  var msg = message.toString().split(';');
  console.log('%s: Task "%s" failed, associated with app "%s', msg[0], msg[1], msg[2], msg[3])

  // Post to Slack when a task has failed
  slack.send({
    text: 'Failed task: "' + msg[1] + '", linked to app "' + msg[2] + '".',
    channel: SLACK_TASK_FAILURE_CHANNEL,
    username: msg[0],
    icon_emoji: ':ghost:'
  });

  // Publish MQTT message when a task has failed
  mqttClient.publish(config.get('Butler.mqttConfig.taskFailureTopic'), msg[1]);
});
// ------------------------------------------------






// Set up endpoints for REST server
restServer.get('/slackPostMessage', rest.slackPostMessage.respondSlackPostMessage);
restServer.get('/createDir', rest.createDir.respondCreateDir);
restServer.get('/getDiskSpace', rest.getDiskSpace.respondGetDiskSpace);
restServer.get('/mqttPublishMessage', rest.mqttPublishMessage.respondMQTTPublishMessage);
restServer.get('/senseStartTask', rest.senseStartTask.respondSenseStartTask);
restServer.get('/senseQRSPing', rest.senseQRSPing.respondSenseQRSPing);
restServer.get('/butlerPing', rest.butlerPing.respondButlerPing);



// Start REST server on port 8080
restServer.listen(config.get('Butler.restServerConfig.serverPort'), function() {
  // console.log('%s REST server listening on %s', restServer.name, restServer.url);
  console.info('REST server listening on %s', restServer.url);
});

// Start UDP server for Session and Connection events
udpServerSessionConnection.bind(UDP_PORT_SESSION_CONNECTION, UDP_HOST);

// Start UDP server for failed task events
udpServerTaskFailure.bind(UDP_PORT_TASK_FAILURE, UDP_HOST);
