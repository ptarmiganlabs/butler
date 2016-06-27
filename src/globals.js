var slack = require('node-slack');
var mqtt = require('mqtt');
var QRS = require('qrs');
var config = require('config');
var dgram = require('dgram');
var serializeApp = require('serializeapp')
var fs = require('fs-extra');


// Load our own libs
var qrsUtil = require('./qrsUtil');



var qrsConfig = {
  host: config.get('Butler.qrsConfig.qrsServer'),
  port: config.get('Butler.qrsConfig.qrsServerPort'),
  isSecure: config.get('Butler.qrsConfig.isSecure'),
  headers: config.get('Butler.qrsConfig.headers'),
  cert: fs.readFileSync(config.get('Butler.qrsConfig.cert')),
  key: fs.readFileSync(config.get('Butler.qrsConfig.key')),
  rejectUnauthorized: config.get('Butler.qrsConfig.rejectUnauthorized')
};
var qrs = new QRS( qrsConfig );


// ------------------------------------
// Slack config
var slackWebhookURL = config.get('Butler.slackConfig.webhookURL');
var slackLoginNotificationChannel = config.get('Butler.slackConfig.loginNotificationChannel');
var slackTaskFailureChannel = config.get('Butler.slackConfig.taskFailureChannel');

// Create Slack object
var slack = new slack(slackWebhookURL);



// ------------------------------------
// Create MQTT client object and connect to MQTT broker
var mqttClient  = mqtt.connect('mqtt://' + config.get('Butler.mqttConfig.brokerIP'));
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



module.exports = {
  config,
  qrs,
  qrsUtil,
  qrsConfig,
  slack,
  slackLoginNotificationChannel,
  slackTaskFailureChannel,
  udpServerSessionConnectionSocket,
  udpServerTaskFailureSocket,
  udp_host,
  udp_port_session_connection,
  udp_port_take_failure,
  mqttClient
};
