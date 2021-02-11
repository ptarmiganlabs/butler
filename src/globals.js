var mqtt = require('mqtt');
const config = require('config');
var dgram = require('dgram');
var fs = require('fs-extra');
var dict = require('dict');
const path = require('path');
const Influx = require('influx');
const { IncomingWebhook } = require('ms-teams-webhook');

const winston = require('winston');
require('winston-daily-rotate-file');

// Variable holding info about all defined schedules
var configSchedule = [];

// Get app version from package.json file
var appVersion = require('./package.json').version;

// Set up logger with timestamps and colors, and optional logging to disk file
const logTransports = [];

logTransports.push(
    new winston.transports.Console({
        name: 'console',
        level: config.get('Butler.logLevel'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
        ),
    }),
);

if (config.get('Butler.fileLogging')) {
    logTransports.push(
        new winston.transports.DailyRotateFile({
            dirname: path.join(__dirname, config.get('Butler.logDirectory')),
            filename: 'butler.%DATE%.log',
            level: config.get('Butler.logLevel'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        }),
    );
}

const logger = winston.createLogger({
    transports: logTransports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
});

// Function to get current logging level
const getLoggingLevel = () => {
    return logTransports.find(transport => {
        return transport.name == 'console';
    }).level;
};

// Load our own libs
// var qrsUtil = require('./qrsUtil');

// Helper function to read the contents of the certificate files:
const readCert = filename => fs.readFileSync(filename);

var certPath = path.resolve(__dirname, config.get('Butler.cert.clientCert')),
    keyPath = path.resolve(__dirname, config.get('Butler.cert.clientCertKey')),
    caPath = path.resolve(__dirname, config.get('Butler.cert.clientCertCA'));

//  Engine config
var configEngine = {
    engineVersion: config.get('Butler.configEngine.engineVersion'),
    host: config.get('Butler.configEngine.host'),
    port: config.get('Butler.configEngine.port'),
    isSecure: config.get('Butler.configEngine.useSSL'),
    headers: config.get('Butler.configEngine.headers'),
    cert: readCert(config.get('Butler.cert.clientCert')),
    key: readCert(config.get('Butler.cert.clientCertKey')),
    rejectUnauthorized: config.get('Butler.configEngine.rejectUnauthorized'),
};

// QRS config
const configQRS = {
    authentication: config.get('Butler.configQRS.authentication'),
    host: config.get('Butler.configQRS.host'),
    port: config.get('Butler.configQRS.port'),
    useSSL: config.get('Butler.configQRS.useSSL'),
    headerKey: config.get('Butler.configQRS.headerKey'),
    headerValue: config.get('Butler.configQRS.headerValue'),
    cert: readCert(certPath),
    key: readCert(keyPath),
    ca: readCert(caPath),
    certPaths: {
        certPath: certPath,
        keyPath: keyPath,
        capath: caPath,
    },
};


// ------------------------------------
// MS Teams reload task failed
if (
    config.has('Butler.teamsNotification.enable') &&
    config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
    config.get('Butler.teamsNotification.enable') == true &&
    config.get('Butler.teamsNotification.reloadTaskFailure.enable') == true
) {
    let webhookUrl = config.get('Butler.teamsNotification.reloadTaskFailure.webhookURL');

    // Create MS Teams object
    var teamsTaskFailureObj = new IncomingWebhook(webhookUrl);
}

// MS Teams reload task aborted
if (
    config.has('Butler.teamsNotification.enable') &&
    config.has('Butler.teamsNotification.reladTaskAborted.enable') &&
    config.get('Butler.teamsNotification.enable') == true &&
    config.get('Butler.teamsNotification.reladTaskAborted.enable') == true
) {
    let webhookUrl = config.get('Butler.teamsNotification.reladTaskAborted.webhookURL');

    // Create MS Teams object
    var teamsTaskAbortedObj = new IncomingWebhook(webhookUrl);
}

// MS Teams user session events
if (
    config.has('Butler.teamsNotification.enable') &&
    config.has('Butler.teamsNotification.userSessionEvents.enable') &&
    config.get('Butler.teamsNotification.enable') == true &&
    config.get('Butler.teamsNotification.userSessionEvents.enable') == true
) {
    let webhookUrl = config.get('Butler.teamsNotification.userSessionEvents.webhookURL');

    // Create MS Teams object
    var teamsUserSessionObj = new IncomingWebhook(webhookUrl);
}

// ------------------------------------
// Data structures used to keep track of currently active users/sessions
var currentUsers = dict();
var currentUsersPerServer = dict();

// ------------------------------------
// Create MQTT client object and connect to MQTT broker

var mqttOptions = {
    host: config.get('Butler.mqttConfig.brokerHost'),
    port: config.get('Butler.mqttConfig.brokerPort'),
};

var mqttClient = mqtt.connect(mqttOptions);
/*
Following might be needed for conecting to older Mosquitto versions
var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
  protocolId: 'MQIsdp',
  protocolVersion: 3
});
*/

// ------------------------------------
// UDP server connection parameters
var udp_host = config.get('Butler.udpServerConfig.serverHost');

// Prepare to listen on port X for incoming UDP connections regarding session starting/stoping, or connection opening/closing
var udpServerSessionConnectionSocket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true,
});
var udp_port_session_connection = config.get('Butler.udpServerConfig.portSessionConnectionEvents');

// Prepare to listen on port Y for incoming UDP connections regarding failed tasks
var udpServerTaskFailureSocket = dgram.createSocket({
    type: 'udp4',
    reuseAddr: true,
});
var udp_port_take_failure = config.get('Butler.udpServerConfig.portTaskFailure');

// Folder under which QVD folders are to be created
var qvdFolder = config.get('Butler.configDirectories.qvdPath');

// Load approved fromDir and toDir for fileCopy operation
var fileCopyDirectories = [];

if (config.has('Butler.fileCopyApprovedDirectories')) {
    config.get('Butler.fileCopyApprovedDirectories').forEach(element => {
        logger.verbose(`fileCopy directories from config file: ${JSON.stringify(element, null, 2)}`);

        let newDirCombo = {
            fromDir: path.normalize(element.fromDirectory),
            toDir: path.normalize(element.toDirectory),
        };

        logger.info(`Adding normalized fileCopy directories ${JSON.stringify(newDirCombo, null, 2)}`);

        fileCopyDirectories.push(newDirCombo);
    });
}

// Load approved fromDir and toDir for fileMove operation
var fileMoveDirectories = [];

if (config.has('Butler.fileMoveApprovedDirectories')) {
    config.get('Butler.fileMoveApprovedDirectories').forEach(element => {
        logger.verbose(`fileMove directories from config file: ${JSON.stringify(element, null, 2)}`);

        let newDirCombo = {
            fromDir: path.normalize(element.fromDirectory),
            toDir: path.normalize(element.toDirectory),
        };

        logger.info(`Adding normalized fileMove directories ${JSON.stringify(newDirCombo, null, 2)}`);

        fileMoveDirectories.push(newDirCombo);
    });
}

// Load approved dir for fileDelete operation
var fileDeleteDirectories = [];

if (config.has('Butler.fileDeleteApprovedDirectories')) {
    config.get('Butler.fileDeleteApprovedDirectories').forEach(element => {
        logger.verbose(`fileDelete directory from config file: ${element}`);

        let deleteDir = path.normalize(element);

        logger.info(`Adding normalized fileDelete directory ${deleteDir}`);

        fileDeleteDirectories.push(deleteDir);
    });
}

// Create list of enabled API endpoints
var endpointsEnabled = [];

const getEnabledApiEndpoints = function (obj) {
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
            // Sub-object
            getEnabledApiEndpoints(value);
        }

        if (value == true) {
            endpointsEnabled.push(key);
        }
    }
};

if (config.has('Butler.restServerEndpointsEnable')) {
    let endpoints = config.get('Butler.restServerEndpointsEnable');
    getEnabledApiEndpoints(endpoints);
}

logger.info(`Enabled API endpoints: ${JSON.stringify(endpointsEnabled, null, 2)}`);

// Set up InfluxDB
logger.info(`CONFIG: Influxdb enabled: ${config.get('Butler.uptimeMonitor.storeInInfluxdb.enable')}`);
logger.info(`CONFIG: Influxdb host IP: ${config.get('Butler.uptimeMonitor.storeInInfluxdb.hostIP')}`);
logger.info(`CONFIG: Influxdb host port: ${config.get('Butler.uptimeMonitor.storeInInfluxdb.hostPort')}`);
logger.info(`CONFIG: Influxdb db name: ${config.get('Butler.uptimeMonitor.storeInInfluxdb.dbName')}`);

// Set up Influxdb client
const influx = new Influx.InfluxDB({
    host: config.get('Butler.uptimeMonitor.storeInInfluxdb.hostIP'),
    port: `${config.has('Butler.uptimeMonitor.storeInInfluxdb.hostPort') ? config.get('Butler.uptimeMonitor.storeInInfluxdb.hostPort') : '8086'}`,
    database: config.get('Butler.uptimeMonitor.storeInInfluxdb.dbName'),
    username: `${config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.enable') ? config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.username') : ''}`,
    password: `${config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.enable') ? config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.password') : ''}`,
    schema: [
        {
            measurement: 'butler_memory_usage',
            fields: {
                heap_used: Influx.FieldType.FLOAT,
                heap_total: Influx.FieldType.FLOAT,
                external: Influx.FieldType.FLOAT,
                process_memory: Influx.FieldType.FLOAT,
            },
            tags: ['butler_instance'],
        },
    ],
});

function initInfluxDB() {
    const dbName = config.get('Butler.uptimeMonitor.storeInInfluxdb.dbName');
    const enableInfluxdb = config.get('Butler.uptimeMonitor.storeInInfluxdb.enable');

    if (enableInfluxdb) {
        influx
            .getDatabaseNames()
            .then(names => {
                if (!names.includes(dbName)) {
                    influx
                        .createDatabase(dbName)
                        .then(() => {
                            logger.info(`CONFIG: Created new InfluxDB database: ${dbName}`);

                            const newPolicy = config.get('Butler.uptimeMonitor.storeInInfluxdb.retentionPolicy');

                            // Create new default retention policy
                            influx
                                .createRetentionPolicy(newPolicy.name, {
                                    database: dbName,
                                    duration: newPolicy.duration,
                                    replication: 1,
                                    isDefault: true,
                                })
                                .then(() => {
                                    logger.info(`CONFIG: Created new InfluxDB retention policy: ${newPolicy.name}`);
                                })
                                .catch(err => {
                                    logger.error(`CONFIG: Error creating new InfluxDB retention policy "${newPolicy.name}"! ${err.stack}`);
                                });
                        })
                        .catch(err => {
                            logger.error(`CONFIG: Error creating new InfluxDB database "${dbName}"! ${err.stack}`);
                        });
                } else {
                    logger.info(`CONFIG: Found InfluxDB database: ${dbName}`);
                }
            })
            .catch(err => {
                logger.error(`CONFIG: Error getting list of InfuxDB databases! ${err.stack}`);
            });
    }
}

module.exports = {
    config,
    // qrsUtil,
    configEngine,
    configQRS,
    teamsTaskFailureObj,
    teamsTaskAbortedObj,
    teamsUserSessionObj,
    currentUsers,
    currentUsersPerServer,
    udpServerSessionConnectionSocket,
    udpServerTaskFailureSocket,
    udp_host,
    udp_port_session_connection,
    udp_port_take_failure,
    mqttClient,
    qvdFolder,
    logger,
    logTransports,
    appVersion,
    getLoggingLevel,
    configSchedule,
    initInfluxDB,
    influx,
    fileCopyDirectories,
    fileMoveDirectories,
    fileDeleteDirectories,
    endpointsEnabled,
};
