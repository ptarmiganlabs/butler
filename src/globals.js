var slack = require('node-slack');
var mqtt = require('mqtt');
var config = require('config');
var dgram = require('dgram');
var fs = require('fs-extra');
var dict = require("dict");


// Load our own libs
var qrsUtil = require('./qrsUtil');


//  Engine config
var configEngine = {
  host: config.get('Butler.configEngine.server'),
  port: config.get('Butler.configEngine.serverPort'),
  isSecure: config.get('Butler.configEngine.isSecure'),
  headers: config.get('Butler.configEngine.headers'),
  cert: fs.readFileSync(config.get('Butler.configEngine.cert')),
  key: fs.readFileSync(config.get('Butler.configEngine.key')),
  rejectUnauthorized: config.get('Butler.configEngine.rejectUnauthorized')
};


// QRS config
var configQRS = {
  authentication: config.get('Butler.configQRS.authentication'),
  host: config.get('Butler.configQRS.host'),
  port: config.get('Butler.configQRS.port'),
  useSSL: config.get('Butler.configQRS.useSSL'),
  headerKey: config.get('Butler.configQRS.headerKey'),
  headerValue: config.get('Butler.configQRS.headerValue'),
  cert: config.get('Butler.configQRS.cert'),
  key: config.get('Butler.configQRS.key'),
  ca: config.get('Butler.configQRS.ca')
};

// ------------------------------------
// Slack config
var slackWebhookURL = config.get('Butler.slackConfig.webhookURL');
var slackLoginNotificationChannel = config.get('Butler.slackConfig.loginNotificationChannel');
var slackTaskFailureChannel = config.get('Butler.slackConfig.taskFailureChannel');

// Create Slack object
var slack = new slack(slackWebhookURL);


// ------------------------------------
// Data structures needed to keep track of currently active users/sessions
var currentUsers = dict();
var currentUsersPerServer = dict();


// ------------------------------------
// Create MQTT client object and connect to MQTT broker
var mqttClient = mqtt.connect('mqtt://' + config.get('Butler.mqttConfig.brokerIP'));
/*
Following might be needed for conecting to older Mosquitto versions
var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
  protocolId: 'MQIsdp',
  protocolVersion: 3
});
*/


// ------------------------------------
// UDP server connection parameters
var udp_host = config.get('Butler.udpServerConfig.serverIP');

// Prepare to listen on port X for incoming UDP connections regarding session starting/stoping, or connection opening/closing
var udpServerSessionConnectionSocket = dgram.createSocket({type:"udp4", reuseAddr:true});
var udp_port_session_connection = config.get('Butler.udpServerConfig.portSessionConnectionEvents');

// Prepare to listen on port Y for incoming UDP connections regarding failed tasks
var udpServerTaskFailureSocket = dgram.createSocket({type:"udp4", reuseAddr:true});
var udp_port_take_failure = config.get('Butler.udpServerConfig.portTaskFailure');


// ------------------------------------
// Folder under which QVD folders are to be created
var qvdFolder = config.get('Butler.qvdPath');


module.exports = {
  config,
  qrsUtil,
  configEngine,
  configQRS,
  slack,
  slackLoginNotificationChannel,
  slackTaskFailureChannel,
  currentUsers,
  currentUsersPerServer,
  udpServerSessionConnectionSocket,
  udpServerTaskFailureSocket,
  udp_host,
  udp_port_session_connection,
  udp_port_take_failure,
  mqttClient,
  qvdFolder
};
