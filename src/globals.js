const fs = require('fs-extra');
const path = require('path');
const Influx = require('influx');
const { IncomingWebhook } = require('ms-teams-webhook');
const si = require('systeminformation');
const os = require('os');
const crypto = require('crypto');

// Add dependencies
const { Command, Option } = require('commander');

const winston = require('winston');
require('winston-daily-rotate-file');

// Variable holding info about all defined schedules
const configSchedule = [];

function checkFileExistsSync(filepath) {
    let flag = true;
    try {
        fs.accessSync(filepath, fs.constants.F_OK);
    } catch (e) {
        flag = false;
    }
    return flag;
}

// Get app version from package.json file
const appVersion = require('./package.json').version;

// Command line parameters
const program = new Command();
program
    .version(appVersion)
    .name('butler')
    .description(
        'Butler gives superpowers to client-managed Qlik Sense Enterprise on Windows!\nAdvanced reload failure alerts, task scheduler, key-value store, file system access and much more.'
    )
    .option('-c, --configfile <file>', 'path to config file')
    .addOption(new Option('-l, --loglevel <level>', 'log level').choices(['error', 'warn', 'info', 'verbose', 'debug', 'silly']))
    .option('--new-relic-api-key <key>', 'insert API key to use with New Relic')
    .option('--new-relic-account-id <id>', 'New Relic account ID');

// Parse command line params
program.parse(process.argv);
const options = program.opts();

// Is there a config file specified on the command line?
let configFileOption;
let configFileExpanded;
let configFilePath;
let configFileBasename;
let configFileExtension;
if (options.configfile && options.configfile.length > 0) {
    configFileOption = options.configfile;
    configFileExpanded = path.resolve(options.configfile);
    configFilePath = path.dirname(configFileExpanded);
    configFileExtension = path.extname(configFileExpanded);
    configFileBasename = path.basename(configFileExpanded, configFileExtension);

    if (configFileExtension.toLowerCase() !== '.yaml') {
        // eslint-disable-next-line no-console
        console.log('Error: Config file extension must be yaml');
        process.exit(1);
    }

    if (checkFileExistsSync(options.configfile)) {
        process.env.NODE_CONFIG_DIR = configFilePath;
        process.env.NODE_ENV = configFileBasename;
    } else {
        // eslint-disable-next-line no-console
        console.log('Error: Specified config file does not exist');
        process.exit(1);
    }
}

// Are we running as standalone app or not?
const isPkg = typeof process.pkg !== 'undefined';
if (isPkg && configFileOption === undefined) {
    // Show help if running as standalone app and mandatory options (e.g. config file) are not specified
    program.help({ error: true });
}

// eslint-disable-next-line import/order
const config = require('config');

// Is there a log level file specified on the command line?
if (options.loglevel && options.loglevel.length > 0) {
    config.Butler.logLevel = options.loglevel;
}

// Is there a New Relic API key specified on the command line?
if (options.newRelicApiKey && options.newRelicApiKey.length > 0) {
    config.Butler.thirdPartyToolsCredentials.newRelic.insertApiKey = options.newRelicApiKey;
}

// Is there a New Relic account ID specified on the command line?
if (options.newRelicAccountId && options.newRelicAccountId.length > 0) {
    config.Butler.thirdPartyToolsCredentials.newRelic.accountId = options.newRelicAccountId;
}

// Set up logger with timestamps and colors, and optional logging to disk file
const logTransports = [];

logTransports.push(
    new winston.transports.Console({
        name: 'console',
        level: config.get('Butler.logLevel'),
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    })
);

const execPath = isPkg ? path.dirname(process.execPath) : __dirname;

if (config.get('Butler.fileLogging')) {
    logTransports.push(
        new winston.transports.DailyRotateFile({
            dirname: path.join(execPath, config.get('Butler.logDirectory')),
            filename: 'butler.%DATE%.log',
            level: config.get('Butler.logLevel'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        })
    );
}

const logger = winston.createLogger({
    transports: logTransports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
});

// Function to get current logging level
const getLoggingLevel = () => logTransports.find((transport) => transport.name === 'console').level;

// Are we running as standalone app or not?
logger.verbose(`Running as standalone app: ${isPkg}`);

// Helper function to read the contents of the certificate files:
const readCert = (filename) => fs.readFileSync(filename);

const certPath = path.resolve(__dirname, config.get('Butler.cert.clientCert'));
const keyPath = path.resolve(__dirname, config.get('Butler.cert.clientCertKey'));
const caPath = path.resolve(__dirname, config.get('Butler.cert.clientCertCA'));

//  Engine config
const configEngine = {
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
    rejectUnauthorized: config.get('Butler.configQRS.rejectUnauthorized'),
    cert: readCert(certPath),
    key: readCert(keyPath),
    ca: readCert(caPath),
    certPaths: {
        certPath,
        keyPath,
        caPath,
    },
};

// MS Teams notification objects
let teamsTaskFailureObj;
let teamsTaskAbortedObj;
let teamsUserSessionObj;

// ------------------------------------
// MS Teams reload task failed
if (
    config.has('Butler.teamsNotification.enable') &&
    config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
    config.get('Butler.teamsNotification.enable') === true &&
    config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
) {
    const webhookUrl = config.get('Butler.teamsNotification.reloadTaskFailure.webhookURL');

    // Create MS Teams object
    teamsTaskFailureObj = new IncomingWebhook(webhookUrl);
}

// MS Teams reload task aborted
if (
    config.has('Butler.teamsNotification.enable') &&
    config.has('Butler.teamsNotification.reloadTaskAborted.enable') &&
    config.get('Butler.teamsNotification.enable') === true &&
    config.get('Butler.teamsNotification.reloadTaskAborted.enable') === true
) {
    const webhookUrl = config.get('Butler.teamsNotification.reloadTaskAborted.webhookURL');

    // Create MS Teams object
    teamsTaskAbortedObj = new IncomingWebhook(webhookUrl);
}

// ------------------------------------
// Create MQTT client object and connect to MQTT broker, if MQTT is enabled
let mqttClient = null;
// try {
//     if (
//         config.has('Butler.mqttConfig.enable') &&
//         config.has('Butler.mqttConfig.brokerHost') &&
//         config.has('Butler.mqttConfig.brokerPort') &&
//         config.get('Butler.mqttConfig.enable')
//     ) {
//         const mqttOptions = {
//             host: config.get('Butler.mqttConfig.brokerHost'),
//             port: config.get('Butler.mqttConfig.brokerPort'),
//         };

//         mqttClient = mqtt.connect(mqttOptions);
//         /*
//             Following might be needed for conecting to older Mosquitto versions
//             var mqttClient  = mqtt.connect('mqtt://<IP of MQTT server>', {
//                 protocolId: 'MQIsdp',
//                 protocolVersion: 3
//             });
//             */
//         if (!mqttClient.connected) {
//             logger.verbose(
//                 `CONFIG: Created (but not yet connected) MQTT object for ${mqttOptions.host}:${mqttOptions.port}, protocol version ${mqttOptions.protocolVersion}`
//             );
//         }
//     } else {
//         logger.info('CONFIG: MQTT disabled, not connecting to MQTT broker');
//     }
// } catch (err) {
//     logger.error(`CONFIG: Could not set up MQTT: ${JSON.stringify(err, null, 2)}`);
// }

// ------------------------------------
// UDP server connection parameters
const udpHost = config.get('Butler.udpServerConfig.serverHost');

let udpServerTaskFailureSocket = null;
// Prepare to listen on port Y for incoming UDP connections regarding failed tasks
// const udpServerTaskFailureSocket = dgram.createSocket({
//     type: 'udp4',
//     reuseAddr: true,
// });
const udpPortTaskFailure = config.get('Butler.udpServerConfig.portTaskFailure');

// Folder under which QVD folders are to be created
const qvdFolder = config.get('Butler.configDirectories.qvdPath');

// Load approved fromDir and toDir for fileCopy operation
const fileCopyDirectories = [];

if (config.has('Butler.fileCopyApprovedDirectories') && config.get('Butler.fileCopyApprovedDirectories') != null) {
    config.get('Butler.fileCopyApprovedDirectories').forEach((element) => {
        logger.verbose(`fileCopy directories from config file: ${JSON.stringify(element, null, 2)}`);

        const newDirCombo = {
            fromDir: path.normalize(element.fromDirectory),
            toDir: path.normalize(element.toDirectory),
        };

        logger.info(`Adding normalized fileCopy directories ${JSON.stringify(newDirCombo, null, 2)}`);

        fileCopyDirectories.push(newDirCombo);
    });
}

// Load approved fromDir and toDir for fileMove operation
const fileMoveDirectories = [];

if (config.has('Butler.fileMoveApprovedDirectories') && config.get('Butler.fileMoveApprovedDirectories') != null) {
    config.get('Butler.fileMoveApprovedDirectories').forEach((element) => {
        logger.verbose(`fileMove directories from config file: ${JSON.stringify(element, null, 2)}`);

        const newDirCombo = {
            fromDir: path.normalize(element.fromDirectory),
            toDir: path.normalize(element.toDirectory),
        };

        logger.info(`Adding normalized fileMove directories ${JSON.stringify(newDirCombo, null, 2)}`);

        fileMoveDirectories.push(newDirCombo);
    });
}

// Load approved dir for fileDelete operation
const fileDeleteDirectories = [];

if (config.has('Butler.fileDeleteApprovedDirectories') && config.get('Butler.fileDeleteApprovedDirectories') != null) {
    config.get('Butler.fileDeleteApprovedDirectories').forEach((element) => {
        logger.verbose(`fileDelete directory from config file: ${element}`);

        const deleteDir = path.normalize(element);

        logger.info(`Adding normalized fileDelete directory ${deleteDir}`);

        fileDeleteDirectories.push(deleteDir);
    });
}

// Create list of enabled API endpoints
const endpointsEnabled = [];

const getEnabledApiEndpoints = (obj) => {
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
            // Sub-object
            getEnabledApiEndpoints(value);
        }

        if (value === true) {
            endpointsEnabled.push(key);
        }
    }
};

if (config.has('Butler.restServerEndpointsEnable')) {
    const endpoints = config.get('Butler.restServerEndpointsEnable');
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
    port: `${
        config.has('Butler.uptimeMonitor.storeInInfluxdb.hostPort') ? config.get('Butler.uptimeMonitor.storeInInfluxdb.hostPort') : '8086'
    }`,
    database: config.get('Butler.uptimeMonitor.storeInInfluxdb.dbName'),
    username: `${
        config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.enable')
            ? config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.username')
            : ''
    }`,
    password: `${
        config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.enable')
            ? config.get('Butler.uptimeMonitor.storeInInfluxdb.auth.password')
            : ''
    }`,
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
            .then((names) => {
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
                                .catch((err) => {
                                    logger.error(`CONFIG: Error creating new InfluxDB retention policy "${newPolicy.name}"! ${err.stack}`);
                                });
                        })
                        .catch((err) => {
                            logger.error(`CONFIG: Error creating new InfluxDB database "${dbName}"! ${err.stack}`);
                        });
                } else {
                    logger.info(`CONFIG: Found InfluxDB database: ${dbName}`);
                }
            })
            .catch((err) => {
                logger.error(`CONFIG: Error getting list of InfuxDB databases! ${err.stack}`);
            });
    }
}

// Anon telemetry reporting
let hostInfo;

async function initHostInfo() {
    try {
        const siCPU = await si.cpu();
        const siSystem = await si.system();
        const siMem = await si.mem();
        const siOS = await si.osInfo();
        const siDocker = await si.dockerInfo();
        const siNetwork = await si.networkInterfaces();
        const siNetworkDefault = await si.networkInterfaceDefault();

        const defaultNetworkInterface = siNetworkDefault;

        const networkInterface = siNetwork.filter((item) => item.iface === defaultNetworkInterface);

        const idSrc = networkInterface[0].mac + networkInterface[0].ip4 + config.get('Butler.configQRS.host') + siSystem.uuid;
        const salt = networkInterface[0].mac;
        const hash = crypto.createHmac('sha256', salt);
        hash.update(idSrc);
        const id = hash.digest('hex');

        hostInfo = {
            id,
            node: {
                nodeVersion: process.version,
                versions: process.versions,
            },
            os: {
                platform: os.platform(),
                release: os.release(),
                version: os.version(),
                arch: os.arch(),
                cpuCores: os.cpus().length,
                type: os.type(),
                totalmem: os.totalmem(),
            },
            si: {
                cpu: siCPU,
                system: siSystem,
                memory: {
                    total: siMem.total,
                },
                os: siOS,
                network: siNetwork,
                networkDefault: siNetworkDefault,
                docker: siDocker,
            },
        };

        return hostInfo;
    } catch (err) {
        logger.error(`CONFIG: Getting host info: ${err}`);
        return null;
    }
}

module.exports = {
    config,
    configEngine,
    configQRS,
    teamsTaskFailureObj,
    teamsTaskAbortedObj,
    teamsUserSessionObj,
    udpServerTaskFailureSocket,
    udpHost,
    udpPortTaskFailure,
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
    initHostInfo,
    hostInfo,
    isPkg,
    checkFileExistsSync,
};
