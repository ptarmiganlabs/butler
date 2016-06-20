var slack = require('node-slack');
var mqtt = require('mqtt');
var QRS = require('qrs');
var config = require('config');
var qrsUtil = require('./qrsUtil');
var dgram = require('dgram');
var qsocks = require('qsocks')
var serializeApp = require('serializeapp')
var fs = require('fs-extra');
// var yargs = require('yargs');
// var Promise = require('promise');
// var util = require('util');



// ------------------------------------
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
