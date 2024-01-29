import os from 'os';
import crypto from 'crypto';
import fs from 'fs-extra';
import upath from 'upath';
import Influx from 'influx';
import { IncomingWebhook } from 'ms-teams-webhook';
import si from 'systeminformation';
import isUncPath from 'is-unc-path';
import winston from 'winston';
import { fileURLToPath } from 'url';

// Add dependencies
import { Command, Option } from 'commander';

import 'winston-daily-rotate-file';

let instance = null;

class Settings {
    constructor() {
        if (!instance) {
            instance = this;
        }

        // Get app version from package.json file
        const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));
        const { version } = loadJSON('../package.json');
        this.appVersion = version;

        // Command line parameters
        const program = new Command();
        program
            .version(this.appVersion)
            .name('butler')
            .description(
                'Butler gives superpowers to client-managed Qlik Sense Enterprise on Windows!\nAdvanced reload failure alerts, task scheduler, key-value store, file system access and much more.'
            )
            .option('-c, --configfile <file>', 'path to config file')
            .addOption(new Option('-l, --loglevel <level>', 'log level').choices(['error', 'warn', 'info', 'verbose', 'debug', 'silly']))
            .option(
                '--new-relic-account-name  <name...>',
                'New Relic account name. Used within Butler to differentiate between different target New Relic accounts'
            )
            .option('--new-relic-api-key <key...>', 'insert API key to use with New Relic')
            .option('--new-relic-account-id <id...>', 'New Relic account ID')
            .option('--test-email-address <address>', 'send test email to this address. Used to verify email settings in the config file.')
            .option(
                '--test-email-from-address <address>',
                'send test email from this address. Only relevant when SMTP server allows from address to be set.'
            )
            .option('--no-qs-connection', "don't connect to Qlik Sense server at all. Run in isolated mode")
            .option(
                '--api-rate-limit',
                'set the API rate limit, per minute. Default is 100 calls/minute. Set to 0 to disable rate limiting.',
                100
            );

        // Parse command line params
        program.parse(process.argv);
        this.options = program.opts();

        this.checkFileExistsSync = Settings.checkFileExistsSync;
        this.sleep = Settings.sleep;

        // Is there a config file specified on the command line?
        let configFileOption;
        this.configFileExpanded = null;
        let configFilePath;
        let configFileBasename;
        let configFileExtension;
        if (this.options.configfile && this.options.configfile.length > 0) {
            configFileOption = this.options.configfile;
            this.configFileExpanded = upath.resolve(this.options.configfile);
            configFilePath = upath.dirname(this.configFileExpanded);
            configFileExtension = upath.extname(this.configFileExpanded);
            configFileBasename = upath.basename(this.configFileExpanded, configFileExtension);

            if (configFileExtension.toLowerCase() !== '.yaml') {
                // eslint-disable-next-line no-console
                console.log('Error: Config file extension must be yaml');
                process.exit(1);
            }

            if (this.checkFileExistsSync(this.options.configfile)) {
                process.env.NODE_CONFIG_DIR = configFilePath;
                process.env.NODE_ENV = configFileBasename;
            } else {
                // eslint-disable-next-line no-console
                console.log('Error: Specified config file does not exist');
                process.exit(1);
            }
        } else {
            // Get value of env variable NODE_ENV
            const env = process.env.NODE_ENV;

            // Get path to config file
            const filename = fileURLToPath(import.meta.url);
            const dirname = upath.dirname(filename);
            this.configFileExpanded = upath.resolve(dirname, `./config/${env}.yaml`);
        }

        // this.config = this.loadConfig();
        // this.config = await import('config');
        (async () => {
            this.config = (await import('config')).default;

            // Are there New Relic account name(s), API key(s) and account ID(s) specified on the command line?
            // There must be the same number of each specified!
            // If so, replace any info from the config file with data from command line options
            if (
                this.options?.newRelicAccountName?.length > 0 &&
                this.options?.newRelicApiKey?.length > 0 &&
                this.options?.newRelicAccountId?.length > 0 &&
                this.options?.newRelicAccountName?.length === this.options?.newRelicApiKey?.length &&
                this.options?.newRelicApiKey?.length === this.options?.newRelicAccountId?.length
            ) {
                this.config.Butler.thirdPartyToolsCredentials.newRelic = [];

                // eslint-disable-next-line no-plusplus
                for (let index = 0; index < this.options.newRelicApiKey.length; index++) {
                    const accountName = this.ptions.newRelicAccountName[index];
                    const accountId = this.options.newRelicAccountId[index];
                    const insertApiKey = this.options.newRelicApiKey[index];

                    this.config.Butler.thirdPartyToolsCredentials.newRelic.push({ accountName, accountId, insertApiKey });
                }
            } else if (
                this.options?.newRelicAccountName?.length > 0 ||
                this.options?.newRelicApiKey?.length > 0 ||
                this.options?.newRelicAccountId?.length > 0
            ) {
                // eslint-disable-next-line no-console
                console.log('\n\nIncorrect command line parameters: Number of New Relic account names/IDs/API keys must match. Exiting.');
                process.exit(1);
            }

            this.execPath = this.isPkg ? upath.dirname(process.execPath) : process.cwd();

            // Are we running as standalone app or not?
            this.isPkg = typeof process.pkg !== 'undefined';
            if (this.isPkg && configFileOption === undefined) {
                // Show help if running as standalone app and mandatory options (e.g. config file) are not specified
                program.help({ error: true });
            }

            // Is there a log level file specified on the command line?
            if (this.options.loglevel && this.options.loglevel.length > 0) {
                this.config.Butler.logLevel = this.options.loglevel;
            }

            // Set up logger with timestamps and colors, and optional logging to disk file
            this.logTransports = [];

            this.logTransports.push(
                new winston.transports.Console({
                    name: 'console',
                    level: this.config.get('Butler.logLevel'),
                    format: winston.format.combine(
                        winston.format.errors({ stack: true }),
                        winston.format.timestamp(),
                        winston.format.colorize(),
                        winston.format.simple(),
                        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
                    ),
                })
            );

            if (
                this.config.Butler.logLevel === 'verbose' ||
                this.config.Butler.logLevel === 'debug' ||
                this.config.Butler.logLevel === 'silly'
            ) {
                // We don't have a logging object yet, so use plain console.log

                // Are we in a packaged app?
                if (this.isPkg) {
                    // eslint-disable-next-line no-console
                    console.log(`Running in packaged app. Executable path: ${this.execPath}`);
                } else {
                    // eslint-disable-next-line no-console
                    console.log(`Running in non-packaged environment. Executable path: ${this.execPath}`);
                }

                // eslint-disable-next-line no-console
                console.log(`Log file directory: ${upath.join(this.execPath, this.config.get('Butler.logDirectory'))}`);

                // eslint-disable-next-line no-console
                console.log(`upath.dirname(process.execPath): ${upath.dirname(process.execPath)}`);

                // eslint-disable-next-line no-console
                console.log(`process.cwd(): ${process.cwd()}`);
            }

            if (this.config.get('Butler.fileLogging')) {
                this.logTransports.push(
                    new winston.transports.DailyRotateFile({
                        dirname: upath.join(this.execPath, this.config.get('Butler.logDirectory')),
                        filename: 'butler.%DATE%.log',
                        level: this.config.get('Butler.logLevel'),
                        datePattern: 'YYYY-MM-DD',
                        maxFiles: '30d',
                    })
                );
            }

            this.logger = winston.createLogger({
                transports: this.logTransports,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
                ),
            });

            // Function to get current logging level
            this.getLoggingLevel = () => this.logTransports.find((transport) => transport.name === 'console').level;

            // Write various verbose log info now that we have a logger object
            // Are we running as standalone app or not?
            this.logger.verbose(`Running as standalone app: ${this.isPkg}`);

            // Verbose: Show what New Relic account names/API keys/account IDs have been defined (on command line or in config file)
            this.logger.verbose(
                `New Relic account names/API keys/account IDs (via command line or config file): ${JSON.stringify(
                    this.config.Butler.thirdPartyToolsCredentials.newRelic,
                    null,
                    2
                )}`
            );

            // Get certificate file paths for QRS connection
            const filename = fileURLToPath(import.meta.url);
            const dirname = upath.dirname(filename);
            const certPath = upath.resolve(dirname, this.config.get('Butler.cert.clientCert'));
            const keyPath = upath.resolve(dirname, this.config.get('Butler.cert.clientCertKey'));
            const caPath = upath.resolve(dirname, this.config.get('Butler.cert.clientCertCA'));

            this.configEngine = null;
            this.configQRS = null;
            if (
                this.config.has('Butler.restServerApiDocGenerate') === false ||
                this.config.get('Butler.restServerApiDocGenerate') === false
            ) {
                this.logger.debug('CONFIG: API doc mode=off');
                //  Engine config
                this.configEngine = {
                    engineVersion: this.config.get('Butler.configEngine.engineVersion'),
                    host: this.config.get('Butler.configEngine.host'),
                    port: this.config.get('Butler.configEngine.port'),
                    isSecure: this.config.get('Butler.configEngine.useSSL'),
                    headers: this.config.get('Butler.configEngine.headers'),
                    cert: this.readCert(this.config.get('Butler.cert.clientCert')),
                    key: this.readCert(this.config.get('Butler.cert.clientCertKey')),
                    rejectUnauthorized: this.config.get('Butler.configEngine.rejectUnauthorized'),
                };

                // QRS config
                this.configQRS = {
                    authentication: this.config.get('Butler.configQRS.authentication'),
                    host: this.config.get('Butler.configQRS.host'),
                    port: this.config.get('Butler.configQRS.port'),
                    useSSL: this.config.get('Butler.configQRS.useSSL'),
                    headerKey: this.config.get('Butler.configQRS.headerKey'),
                    headerValue: this.config.get('Butler.configQRS.headerValue'),
                    rejectUnauthorized: this.config.get('Butler.configQRS.rejectUnauthorized'),
                    cert: this.readCert(certPath),
                    key: this.readCert(keyPath),
                    ca: this.readCert(caPath),
                    certPaths: {
                        certPath,
                        keyPath,
                        caPath,
                    },
                };
            } else {
                this.logger.debug('CONFIG: API doc mode=on');
            }

            // Variable holding info about all defined schedules
            this.configSchedule = [];

            // Create list of enabled API endpoints
            this.endpointsEnabled = [];

            const getEnabledApiEndpoints = (obj) => {
                // eslint-disable-next-line no-restricted-syntax
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        // Sub-object
                        getEnabledApiEndpoints(value);
                    }

                    if (value === true) {
                        this.endpointsEnabled.push(key);
                    }
                }
            };

            if (this.config.has('Butler.restServerEndpointsEnable')) {
                const endpoints = this.config.get('Butler.restServerEndpointsEnable');
                getEnabledApiEndpoints(endpoints);
            }

            this.logger.info(`Enabled API endpoints: ${JSON.stringify(this.endpointsEnabled, null, 2)}`);

            // Variables to hold info on what directories are approved for file system operations via Butler's REST API
            this.fileCopyDirectories = [];
            this.fileMoveDirectories = [];
            this.fileDeleteDirectories = [];

            // Variable holding info about the computer where Butler is running
            this.hostInfo = await this.initHostInfo();

            // Set up InfluxDB
            this.logger.info(`CONFIG: Influxdb enabled: ${this.config.get('Butler.influxDb.enable')}`);
            if (this.config.get('Butler.influxDb.enable') === true) {
                this.logger.info(`CONFIG: Influxdb host IP: ${this.config.get('Butler.influxDb.hostIP')}`);
                this.logger.info(`CONFIG: Influxdb host port: ${this.config.get('Butler.influxDb.hostPort')}`);
                this.logger.info(`CONFIG: Influxdb db name: ${this.config.get('Butler.influxDb.dbName')}`);
            }

            // Set up Influxdb client
            this.influx = null;
            if (this.config.get('Butler.influxDb.enable')) {
                this.influx = new Influx.InfluxDB({
                    host: this.config.get('Butler.influxDb.hostIP'),
                    port: `${this.config.has('Butler.influxDb.hostPort') ? this.config.get('Butler.influxDb.hostPort') : '8086'}`,
                    database: this.config.get('Butler.influxDb.dbName'),
                    username: `${this.config.get('Butler.influxDb.auth.enable') ? this.config.get('Butler.influxDb.auth.username') : ''}`,
                    password: `${this.config.get('Butler.influxDb.auth.enable') ? this.config.get('Butler.influxDb.auth.password') : ''}`,
                    schema: [
                        {
                            measurement: 'butler_memory_usage',
                            fields: {
                                heap_used: Influx.FieldType.FLOAT,
                                heap_total: Influx.FieldType.FLOAT,
                                external: Influx.FieldType.FLOAT,
                                process_memory: Influx.FieldType.FLOAT,
                            },
                            tags: ['butler_instance', 'version'],
                        },
                        {
                            measurement: 'win_service_state',
                            fields: {
                                state_num: Influx.FieldType.INTEGER,
                                state_text: Influx.FieldType.STRING,
                                startup_mode_num: Influx.FieldType.INTEGER,
                                startup_mode_text: Influx.FieldType.STRING,
                            },
                            tags: ['butler_instance', 'host', 'service_name', 'display_name', 'friendly_name'],
                        },
                    ],
                });
            }

            // Folder under which QVD folders are to be created
            this.qvdFolder = this.config.get('Butler.configDirectories.qvdPath');

            // MS Teams notification objects
            this.teamsTaskFailureObj = null;
            this.teamsTaskAbortedObj = null;
            this.teamsUserSessionObj = null;
            this.teamsServiceStoppedMonitorObj = null;
            this.teamsServiceStartedMonitorObj = null;

            // ------------------------------------
            // MS Teams reload task failed
            if (
                this.config.has('Butler.teamsNotification.enable') &&
                this.config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
                this.config.get('Butler.teamsNotification.enable') === true &&
                this.config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
            ) {
                const webhookUrl = this.config.get('Butler.teamsNotification.reloadTaskFailure.webhookURL');

                // Create MS Teams object
                this.teamsTaskFailureObj = new IncomingWebhook(webhookUrl);
            }

            // MS Teams reload task aborted
            if (
                this.config.has('Butler.teamsNotification.enable') &&
                this.config.has('Butler.teamsNotification.reloadTaskAborted.enable') &&
                this.config.get('Butler.teamsNotification.enable') === true &&
                this.config.get('Butler.teamsNotification.reloadTaskAborted.enable') === true
            ) {
                const webhookUrl = this.config.get('Butler.teamsNotification.reloadTaskAborted.webhookURL');

                // Create MS Teams object
                this.teamsTaskAbortedObj = new IncomingWebhook(webhookUrl);
            }

            // MS Teams service started/stopped
            if (
                this.config.has('Butler.teamsNotification.enable') &&
                this.config.has('Butler.serviceMonitor.alertDestination.teams.enable') &&
                this.config.get('Butler.teamsNotification.enable') === true &&
                this.config.get('Butler.serviceMonitor.alertDestination.teams.enable') === true
            ) {
                // Create MS Teams objects
                // Service stopped
                let webhookUrl = this.config.get('Butler.teamsNotification.serviceStopped.webhookURL');
                this.teamsServiceStoppedMonitorObj = new IncomingWebhook(webhookUrl);

                // Service started
                webhookUrl = this.config.get('Butler.teamsNotification.serviceStarted.webhookURL');
                this.teamsServiceStartedMonitorObj = new IncomingWebhook(webhookUrl);
            }

            // ------------------------------------
            // UDP server connection parameters
            this.udpHost = this.config.get('Butler.udpServerConfig.serverHost');
            this.udpServerReloadTaskSocket = null;
            // Prepare to listen on port Y for incoming UDP connections regarding failed tasks
            // const udpServerReloadTaskSocket = dgram.createSocket({
            //     type: 'udp4',
            //     reuseAddr: true,
            // });
            this.udpPortTaskFailure = this.config.get('Butler.udpServerConfig.portTaskFailure');

            // this.mqttClient,

            // eslint-disable-next-line no-constructor-return
            return instance;
        })();
    }

    // get(key) {
    //     return config.get(key);
    // }

    // Helper function to read the contents of the certificate files
    readCert(filename) {
        let cert = null;
        try {
            cert = fs.readFileSync(filename);
        } catch (err) {
            this.logger.error(`CONFIG: Error reading certificate file "${filename}"! ${err.stack}`);
        }
        return cert;
    }

    // Helper function to load list of approved directories for file system operations via Butler's REST API
    async loadApprovedDirectories() {
        try {
            // Load approved fromDir and toDir for fileCopy operation
            if (this.config.has('Butler.fileCopyApprovedDirectories') && this.config.get('Butler.fileCopyApprovedDirectories') != null) {
                this.config.get('Butler.fileCopyApprovedDirectories').forEach((element) => {
                    this.logger.verbose(`fileCopy directories from config file: ${JSON.stringify(element, null, 2)}`);

                    // Check if Butler is running on Linux-ish host and UNC path(s) are specified
                    // Warn if so
                    if (this.hostInfo.si.os.platform.toLowerCase() !== 'windows') {
                        if (isUncPath(element.fromDirectory) === true) {
                            this.logger.warn(
                                `FILE COPY CONFIG: UNC paths won't work on non-Windows OSs ("${element.fromDirectory}"). OS is "${this.hostInfo.si.os.platform}".`
                            );
                        }
                        if (isUncPath(element.toDirectory) === true) {
                            this.logger.warn(
                                `FILE COPY CONFIG: UNC paths won't work on non-Windows OSs ("${element.toDirectory}"). OS is "${this.hostInfo.si.os.platform}".`
                            );
                        }
                    }

                    const newDirCombo = {
                        fromDir: upath.normalizeSafe(element.fromDirectory),
                        toDir: upath.normalizeSafe(element.toDirectory),
                    };
                    this.logger.verbose(`Adding normalized fileCopy directories ${JSON.stringify(newDirCombo, null, 2)}`);

                    this.fileCopyDirectories.push(newDirCombo);
                });
            }
        } catch (err) {
            this.logger.error(`CONFIG: Getting approved file copy directories: ${err}`);
        }

        try {
            // Load approved fromDir and toDir for fileMove operation
            if (this.config.has('Butler.fileMoveApprovedDirectories') && this.config.get('Butler.fileMoveApprovedDirectories') != null) {
                this.config.get('Butler.fileMoveApprovedDirectories').forEach((element) => {
                    this.logger.verbose(`fileMove directories from config file: ${JSON.stringify(element, null, 2)}`);

                    // Check if Butler is running on Linux-ish host and UNC path(s) are specified
                    // Warn if so
                    if (this.hostInfo.si.os.platform.toLowerCase() !== 'windows') {
                        if (isUncPath(element.fromDirectory) === true) {
                            this.logger.warn(
                                `FILE MOVE CONFIG: UNC paths won't work on non-Windows OSs ("${element.fromDirectory}"). OS is "${this.hostInfo.si.os.platform}".`
                            );
                        }
                        if (isUncPath(element.toDirectory) === true) {
                            this.logger.warn(
                                `FILE MOVE CONFIG: UNC paths won't work on non-Windows OSs ("${element.toDirectory}"). OS is "${this.hostInfo.si.os.platform}".`
                            );
                        }
                    }

                    const newDirCombo = {
                        fromDir: upath.normalizeSafe(element.fromDirectory),
                        toDir: upath.normalizeSafe(element.toDirectory),
                    };

                    this.logger.verbose(`Adding normalized fileMove directories ${JSON.stringify(newDirCombo, null, 2)}`);

                    this.fileMoveDirectories.push(newDirCombo);
                });
            }
        } catch (err) {
            this.logger.error(`CONFIG: Getting approved file move directories: ${err}`);
        }

        try {
            // Load approved dir for fileDelete operation
            if (
                this.config.has('Butler.fileDeleteApprovedDirectories') &&
                this.config.get('Butler.fileDeleteApprovedDirectories') != null
            ) {
                this.config.get('Butler.fileDeleteApprovedDirectories').forEach((element) => {
                    this.logger.verbose(`fileDelete directory from config file: ${element}`);

                    // Check if Butler is running on Linux-ish host and UNC path(s) are specified
                    // Warn if so
                    if (this.hostInfo.si.os.platform.toLowerCase() !== 'windows') {
                        if (isUncPath(element) === true) {
                            this.logger.warn(
                                `FILE DELETE CONFIG: UNC paths won't work on non-Windows OSs ("${element}"). OS is "${this.hostInfo.si.os.platform}".`
                            );
                        }
                    }

                    const deleteDir = upath.normalizeSafe(element);
                    this.logger.verbose(`Adding normalized fileDelete directory ${deleteDir}`);

                    this.fileDeleteDirectories.push(deleteDir);
                });
            }
        } catch (err) {
            this.logger.error(`CONFIG: Getting approved file delete directories: ${err}`);
        }
    }

    async initHostInfo() {
        try {
            const siCPU = await si.cpu();
            const siSystem = await si.system();
            const siMem = await si.mem();
            const siOS = await si.osInfo();
            const siDocker = await si.dockerInfo();
            const siNetwork = await si.networkInterfaces();
            const siNetworkDefault = await si.networkInterfaceDefault();

            const defaultNetworkInterface = siNetworkDefault;

            // Get info about all available network interfaces
            const networkInterface = siNetwork.filter((item) => item.iface === defaultNetworkInterface);

            // Loop through all network interfaces, find the first one with a MAC address
            // and use that to generate a unique ID for this Butler instance
            let id = '';
            for (let i = 0; i < networkInterface.length; ) {
                if (networkInterface[i].mac !== '') {
                    const idSrc =
                        networkInterface[i].mac + networkInterface[i].ip4 + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                    const salt = networkInterface[i].mac;
                    const hash = crypto.createHmac('sha256', salt);
                    hash.update(idSrc);
                    id = hash.digest('hex');
                    break;
                }
                i += 1;
            }

            // If no MAC address was found, use either of
            // - siOS.serial
            // - siMem.total
            // - siOS.release
            // - siCPU.brand
            if (id === '') {
                let idSrc = '';
                if (siOS.serial !== '') {
                    idSrc = siOS.serial + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else if (siMem.total !== '') {
                    idSrc = siMem.total + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else if (siOS.release !== '') {
                    idSrc = siOS.release + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else if (siCPU.brand !== '') {
                    idSrc = siCPU.brand + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else {
                    idSrc = this.config.get('Butler.configQRS.host') + siSystem.uuid;
                }
                const salt = siMem.total;
                const hash = crypto.createHmac('sha256', salt);
                hash.update(idSrc);
                id = hash.digest('hex');
            }

            // Warn if we couldn't create a unique ID
            if (id === '') {
                this.logger.warn('CONFIG: Could not create a unique ID for this Butler instance!');
            }

            const hostInfo = {
                id,
                isRunningInDocker: Settings.isRunningInDocker(),
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
            this.logger.error(`CONFIG: Getting host info: ${err}`);
            return null;
        }
    }

    initInfluxDB() {
        const dbName = this.config.get('Butler.influxDb.dbName');
        const enableInfluxdb = this.config.get('Butler.influxDb.enable');

        if (enableInfluxdb) {
            this.influx
                .getDatabaseNames()
                .then((names) => {
                    if (!names.includes(dbName)) {
                        this.influx
                            .createDatabase(dbName)
                            .then(() => {
                                this.logger.info(`CONFIG: Created new InfluxDB database: ${dbName}`);

                                const newPolicy = this.config.get('Butler.influxDb.retentionPolicy');

                                // Create new default retention policy
                                this.influx
                                    .createRetentionPolicy(newPolicy.name, {
                                        database: dbName,
                                        duration: newPolicy.duration,
                                        replication: 1,
                                        isDefault: true,
                                    })
                                    .then(() => {
                                        this.logger.info(`CONFIG: Created new InfluxDB retention policy: ${newPolicy.name}`);
                                    })
                                    .catch((err) => {
                                        this.logger.error(
                                            `CONFIG: Error creating new InfluxDB retention policy "${newPolicy.name}"! ${err.stack}`
                                        );
                                    });
                            })
                            .catch((err) => {
                                this.logger.error(`CONFIG: Error creating new InfluxDB database "${dbName}"! ${err.stack}`);
                            });
                    } else {
                        this.logger.info(`CONFIG: Found InfluxDB database: ${dbName}`);
                    }
                })
                .catch((err) => {
                    this.logger.error(`CONFIG: Error getting list of InfuxDB databases! ${err.stack}`);
                });
        } else {
            this.logger.info('CONFIG: InfluxDB disabled, not connecting to InfluxDB');
        }
    }

    // async loadConfig() {
    //     const a = await import('config');

    //     console.log(a);
    //     return this.config;
    // }

    // Static function to check if a file exists
    static checkFileExistsSync(filepath) {
        let flag = true;
        try {
            fs.accessSync(filepath, fs.constants.F_OK);
        } catch (e) {
            flag = false;
        }
        return flag;
    }

    // Static sleep function
    static sleep(ms) {
        // eslint-disable-next-line no-promise-executor-return
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Static function to check if Butler is running in a Docker container
    static isRunningInDocker() {
        try {
            fs.accessSync('/.dockerenv');
            return true;
        } catch (_) {
            return false;
        }
    }
}

// export default {
//     config,
//     configEngine,
//     configFileExpanded,
//     configQRS,
//     teamsTaskFailureObj,
//     teamsTaskAbortedObj,
//     teamsUserSessionObj,
//     teamsServiceStoppedMonitorObj,
//     teamsServiceStartedMonitorObj,
//     udpServerReloadTaskSocket,
//     udpHost,
//     udpPortTaskFailure,
//     // mqttClient,
//     qvdFolder,
//     logger,
//     logTransports,
//     appVersion,
//     getLoggingLevel,
//     configSchedule,
//     initInfluxDB,
//     influx,
//     fileCopyDirectories,
//     fileMoveDirectories,
//     fileDeleteDirectories,
//     endpointsEnabled,
//     loadApprovedDirectories,
//     initHostInfo,
//     hostInfo,
//     isPkg,
//     checkFileExistsSync,
//     options,
//     execPath,
//     sleep,
// };

export default new Settings();
