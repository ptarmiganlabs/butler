var restify = require('restify');
var slack = require('node-slack');
var mkdirp = require('mkdirp');
var disk = require('diskusage');
var mqtt = require('mqtt');
var dgram = require('dgram');
var os = require('os');

// Set up various objects and variables needed by the app
var slackWebhookURL = '<fill in your web hook URL from Slack>';
const SLACK_LOGIN_NOTIFICATION_CHANNEL = '<fill in name of Slack chanel where audit events (login/logoff etc) should be displayed>';

var slack = new slack(slackWebhookURL);

var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>');
// Following might be needed for conecting to older Mosquitto versions
//var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
//  protocolId: 'MQIsdp',
//  protocolVersion: 3
//});


var restServer = restify.createServer({
  name: 'Qlik Sense Butler'
});


// Listen on port 9997 for incoming UDP connections regarding session starting/stoping, or connection opening/closing
var udpServer = dgram.createSocket({type:"udp4", reuseAddr:true});
const UDP_PORT = 9997;
const UDP_HOST = '<IP of server where Butler is running>';  // Should work with localhost too... but it doesn't. Investigation needed


function respondSlack(req, res, next) {
  console.log(req.params);

  slack.send({
    text: req.params.msg,
    channel: req.params.channel,
    username: req.params.from_user,
    icon_emoji: req.params.emoji
  });

  res.send(req.params);
  next();
}

function respondCreateDir(req, res, next) {
  console.log(req.params);

  mkdirp(req.params.directory, function(err) {
    // path was created unless there was error
    console.log('created dir ' + req.params.directory);
  });

  res.send(req.params);
  next();
}


function respondGetDiskSpace(req, res, next) {
  console.log(req.params);

  // Windows: get disk usage. Takes path as first parameter
  disk.check(req.params.path, function(err, info) {
    console.log(info);
    req.params.available = info.available;
    req.params.free = info.free;
    req.params.total = info.total;
  });

  // OSX/Linux: get disk usage. Takes mount point as first parameter
  //disk.check(req.params.path, function(err, info) {
  //  req.params.available = info.available;
  //  req.params.free = info.free;
  //  req.params.total = info.total;
  //});

  res.send(req.params);
  next();
}


function respondMQTTPublishMessage(req, res, next) {
  // Use data in request to publish MQTT message
  console.log(req.params);

  mqttClient.publish(req.params.topic, req.params.message);

  res.send(req.params);
  next();
}



function respondMQTTStartSenseTask(req, res, next) {
  // Use data in request to start Qlik Sense task
  console.log(req.params);

  // Triggering Sense tasks based on incoming MQTT messages not yet implemented

  res.send(req.params);
  next();
}



mqttClient.on('connect', function () {
  console.log('Connected to MQTT broker');
//  mqttClient.subscribe('presence');
//  mqttClient.publish('presence', 'Hello mqtt');
});

mqttClient.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
});


mqttClient.on('error', function (topic, message) {
  // Error occured
  console.log('MQTT error');
});


restServer.use(restify.queryParser());    // Enable parsing of http parameters


// Set up UDP server for sending acting on session events from Sense
udpServer.on('listening', () => {
  var address = udpServer.address();
  console.log('UDP server listening on %s:%s', address.address, address.port);
  mqttClient.publish('qliksense/butler/session_server', 'start');   // Publish MQTT message that UDP server has started
});

udpServer.on('error', () => {
  var address = udpServer.address();
  console.log('UDP server error on %s:%s', address.address, address.port);
  mqttClient.publish('qliksense/butler/session_server', 'error');   // Publish MQTT message that UDP server has reported an error
});

// Main handler for UDP messages relating to session and connection events
udpServer.on('message', function(message, remote) {
  var msg = message.toString().split(';');
  console.log('%s: %s for user %s/%s', msg[0], msg[1], msg[2], msg[3])

  // Send Slack message when session starts/stops, or a connection open/close
  slack.send({
    text: msg[1] + ' for user ' + msg[2] + '/' + msg[3],
    channel: SLACK_LOGIN_NOTIFICATION_CHANNEL,
    username: msg[0],
    icon_emoji: ''
  });

  // Sessions
  if (msg[1] == 'Start session') {
    mqttClient.publish('qliksense/session/start', msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

  if (msg[1] == 'Stop session') {
    mqttClient.publish('qliksense/session/stop', msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

  // Connections
  if (msg[1] == 'Open connection') {
    mqttClient.publish('qliksense/connection/open', msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

  if (msg[1] == 'Close connection') {
    mqttClient.publish('qliksense/connection/close', msg[0] + ': ' + msg[2] + '/' + msg[3]);
  };

});



// Set up endpoints for REST server
restServer.get('/slack', respondSlack);
restServer.get('/createDir', respondCreateDir);
restServer.get('/getDiskSpace', respondGetDiskSpace);
restServer.get('/mqttPublishMessage', respondMQTTPublishMessage);
restServer.get('/mqttStartSenseTask', respondMQTTPublishMessage);


restServer.listen(8080, function() {
//  console.log('%s REST server listening on %s', restServer.name, restServer.url);
  console.log('REST server listening on %s', restServer.url);
});

udpServer.bind(UDP_PORT, UDP_HOST);
