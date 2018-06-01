var slack = require('node-slack');
var mqtt = require('mqtt');
var config = require('config');
var dgram = require('dgram');
var fs = require('fs-extra');
var dict = require('dict');
var gitHubApi = require('@octokit/rest');
var winston = require('winston');

// Set up default log format for Winston logger
var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            'timestamp': true,
            'colorize': true
        })
    ]
});


// GitHub access
var github = new gitHubApi({
    debug: false,
    headers: {
        'user-agent': 'Butler-Sense-App' // GitHub is happy with a unique user agent 
    },
    timeout: 5000
});
// protocol: "https",
// host: config.get('Butler.gitHub.host'),
// pathPrefix: config.get('Butler.gitHub.pathPrefix'),  
// Promise: require('bluebird'),
// followRedirects: false, // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects 

// Load our own libs
var qrsUtil = require('./qrsUtil');

// Helper function to read the contents of the certificate files:
// const readCert = filename => fs.readFileSync(path.resolve(__dirname, certificatesPath, filename));
const readCert = filename => fs.readFileSync(filename);


//  Engine config
var configEngine = {
    engineVersion: config.get('Butler.configEngine.engineVersion'),
    host: config.get('Butler.configEngine.server'),
    port: config.get('Butler.configEngine.serverPort'),
    isSecure: config.get('Butler.configEngine.isSecure'),
    headers: config.get('Butler.configEngine.headers'),
    cert: readCert(config.get('Butler.configEngine.cert')),
    key: readCert(config.get('Butler.configEngine.key')),
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
var slackObj = new slack(slackWebhookURL);


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
var udpServerSessionConnectionSocket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
});
var udp_port_session_connection = config.get('Butler.udpServerConfig.portSessionConnectionEvents');

// Prepare to listen on port Y for incoming UDP connections regarding failed tasks
var udpServerTaskFailureSocket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true
});
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
    qvdFolder,
    github,
    logger
};
