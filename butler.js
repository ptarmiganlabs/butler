var restify = require('restify');
var Slack = require('node-slack');
var mkdirp = require('mkdirp');
var disk = require('diskusage');
var mqtt = require('mqtt');
var qsocks = require('qsocks');

 
var slackWebhookURL = '<fill in your web hook URL from Slack>';
var slack = new Slack(slackWebhookURL);
//var mqttClient  = mqtt.connect('mqtt://<MQTT broker>');
var mqttClient  = mqtt.connect('mqtt://localhost');

var configQSocks = {
//    host: 'sense-demo.qlik.com',
    host: 'sense.spotify.net',
    isSecure: true,
    prefix: dev
};



qsocks.Connect(configQSocks).then(function(global) {
    console.log(global);
})


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



var server = restify.createServer({
  name: 'Butler'
});

server.use(restify.queryParser());    // Enable parsing of http parameters

server.get('/slack', respondSlack);
server.get('/createDir', respondCreateDir);
server.get('/getDiskSpace', respondGetDiskSpace);
server.get('/mqttPublishMessage', respondMQTTPublishMessage);
server.get('/mqttStartSenseTask', respondMQTTPublishMessage);


server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
