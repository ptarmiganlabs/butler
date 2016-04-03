var restify = require('restify');
var Slack = require('node-slack');
var mkdirp = require('mkdirp');
var disk = require('diskusage');
var mqtt = require('mqtt');
var dgram = require('dgram');
var os = require('os');

// Set up various objects and variables needed by the app
var slackWebhookURL = '<fill in your web hook URL from Slack>';
const SLACK_LOGIN_NOTIFICATION_CHANNEL = '<fill in name of Slack chanel where audient events should be displayed>';

var slack = new Slack(slackWebhookURL);
var mqttClient  = mqtt.connect('mqtt://localhost');
var restServer = restify.createServer({
  name: 'Qlik Sense Butler'
});

var udpServer = dgram.createSocket({type:"udp4", reuseAddr:true});
const UDP_PORT = 9997;
const UDP_HOST = 'localhost';





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
  //console.log(req.params);

  // // Windows: get disk usage. Takes path as first parameter
  // disk.check(req.params.path, function(err, info) {
  //   req.params.available = info.available;
  //   req.params.free = info.free;
  //   req.params.total = info.total;
  // });


  // OSX/Linux: get disk usage. Takes mount point as first parameter
  disk.check(req.params.path, function(err, info) {
    req.params.available = info.available;
    req.params.free = info.free;
    req.params.total = info.total;
  });


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

  mqttClient.publish(req.params.topic, req.params.message);

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
//  mqttClient.end();
});



restServer.use(restify.queryParser());    // Enable parsing of http parameters


// Set up UDP server
udpServer.on('listening', () => {
  var address = udpServer.address();
  console.log('UDP server listening on %s:%s', address.address, address.port);
  mqttClient.publish('butler/udpserver/', 'listening');
});

udpServer.on('error', () => {
  var address = udpServer.address();
  console.log('UDP server error on %s:%s', address.address, address.port);
  mqttClient.publish('butler/udpserver/', 'error');
});

udpServer.on('message', function(message, remote) {
  var msg = message.toString().split(';');

  slack.send({
    text: msg[0] + ' for user ' + msg[1] + '/' + msg[2],
    channel: SLACK_LOGIN_NOTIFICATION_CHANNEL,
    username: os.hostname(),
    icon_emoji: ''
  });

  mqttClient.publish('butler/udpserver/', 'slack message');
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

//udpServer.bind(UDP_PORT, UDP_HOST);
udpServer.bind(UDP_PORT);
