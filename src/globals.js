import os from 'os';
import crypto from 'crypto';
import fs from 'fs-extra';
import upath from 'upath';
import Influx from 'influx';
import si from 'systeminformation';
import isUncPath from 'is-unc-path';
import winston from 'winston';
import yaml from 'js-yaml';
// Ensure js-yaml is included in bundled/minified builds (used indirectly by the 'config' package to parse YAML)
// Assign to a global to prevent tree-shaking when CI uses --minify
globalThis.butlerJsYaml = yaml;
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { Command, Option } from 'commander';
import 'winston-daily-rotate-file';
import sea from 'node:sea';
import { UdpQueueManager } from './lib/udp-queue-manager.js';

let instance = null;

class Settings {
    constructor() {
        if (!instance) {
            instance = this;
        }

        // Flag to keep track of initialisation status of globals object
        this.initialised = false;

        return instance;
    }

    /**
     * Format error message appropriately for SEA vs non-SEA apps
     * In SEA apps, stack traces are less useful, so we prefer err.message
     * In non-SEA apps, we show full stack traces for better debugging
     *
     * @param {Error} err - The error object
     * @returns {string} Formatted error message
     */
    getErrorMessage(err) {
        // Check SEA status - use direct check if isSea hasn't been initialized yet
        const isSeaApp = this.isSea !== undefined ? this.isSea : sea.isSea();

        if (isSeaApp) {
            // For SEA apps, prefer cleaner error messages
            return err.message || err.toString();
        }

        // For non-SEA apps, show full stack trace for debugging
        return err.stack || err.message || err.toString();
    }

    async init() {
        // Get app version from package.json file
        const filenamePackage = `./package.json`;

        // Are we running as a packaged app?
        if (sea.isSea()) {
            // Get contents of package.json file, including version number
            const packageJson = sea.getAsset('package.json', 'utf8');
            this.appVersion = JSON.parse(packageJson).version;

            // Save path to the executable
            this.appBasePath = upath.dirname(process.execPath);
            console.log(`Running as standalone app. Executable path: ${this.appBasePath}`);
        } else {
            // Get path to JS file
            const a = fileURLToPath(import.meta.url);

            // Strip off the filename
            const b = upath.dirname(a);

            // Add path to package.json file
            const c = upath.join(b, '..', filenamePackage);

            // Get app version
            const { version } = JSON.parse(readFileSync(c));
            this.appVersion = version;

            // Save path to the executable
            this.appBasePath = upath.join(b, '..');
            console.log(`Running in non-packaged environment. Executable path: ${this.appBasePath}`);
        }

        // Command line parameters
        const program = new Command();
        program
            .version(this.appVersion)
            .name('butler')
            .description(
                'Butler gives superpowers to client-managed Qlik Sense Enterprise on Windows!\nAdvanced reload failure alerts, task scheduler, key-value store, file system access and much more.',
            )
            .addHelpText(
                'after',
                `
Configuration File:
  Butler requires a configuration file to run. You must specify one using the -c option.
  
  Example config files are included in the distribution ZIP file, as well as online at:
    https://github.com/ptarmiganlabs/butler/tree/master/src/config

  
  For more information visit: https://butler.ptarmiganlabs.com`,
            )
            .option('-c, --configfile <file>', 'path to config file (REQUIRED)')
            .addOption(new Option('-l, --loglevel <level>', 'log level').choices(['error', 'warn', 'info', 'verbose', 'debug', 'silly']))
            .option(
                '--new-relic-account-name  <name...>',
                'New Relic account name. Used within Butler to differentiate between different target New Relic accounts',
            )
            .option('--new-relic-api-key <key...>', 'insert API key to use with New Relic')
            .option('--new-relic-account-id <id...>', 'New Relic account ID')
            .option('--test-email-address <address>', 'send test email to this address. Used to verify email settings in the config file.')
            .option(
                '--test-email-from-address <address>',
                'send test email from this address. Only relevant when SMTP server allows from address to be set.',
            )
            .option('--no-qs-connection', "don't connect to Qlik Sense server at all. Run in isolated mode")
            .option(
                '--api-rate-limit',
                'set the API rate limit, per minute. Default is 100 calls/minute. Set to 0 to disable rate limiting.',
                100,
            )

            .option('--skip-config-verification', 'Disable config file verification', false);

        // Parse command line params
        program.parse(process.argv);
        this.options = program.opts();

        // Check if config file is provided - if not, show help and exit
        if (!this.options.configfile || this.options.configfile.length === 0) {
            program.help();
        }

        // Utility functions
        this.checkFileExistsSync = Settings.checkFileExistsSync;
        this.sleep = Settings.sleep;

        // Is there a config file specified on the command line?
        this.configFileExpanded = null;
        let configFileOption;
        let configFilePath;
        let configFileBasename;
        let configFileExtension;

        // Since configfile is required, this check should always pass
        // but we'll keep it for safety
        if (this.options.configfile && this.options.configfile.length > 0) {
            configFileOption = this.options.configfile;
            this.configFileExpanded = upath.resolve(this.options.configfile);
            configFilePath = upath.dirname(this.configFileExpanded);
            configFileExtension = upath.extname(this.configFileExpanded);
            configFileBasename = upath.basename(this.configFileExpanded, configFileExtension);

            if (configFileExtension.toLowerCase() !== '.yaml') {
                console.log('\n*** Invalid config file extension ***');
                console.log('='.repeat(40));
                console.log('Butler configuration files must have a .yaml extension.');
                console.log('');
                console.log(`You specified: ${this.options.configfile}`);
                console.log('Please use a .yaml file instead.');
                console.log('='.repeat(40));
                process.exit(1);
            }

            if (this.checkFileExistsSync(this.options.configfile)) {
                // Read YAML config and inject via NODE_CONFIG to avoid parser/resolution issues in SEA bundles
                try {
                    const yamlStr = fs.readFileSync(this.configFileExpanded, 'utf8');
                    const cfgObj = yaml.load(yamlStr) || {};
                    // Apply CLI loglevel override before loading config
                    if (this.options.loglevel && this.options.loglevel.length > 0) {
                        cfgObj.Butler = cfgObj.Butler || {};
                        cfgObj.Butler.logLevel = this.options.loglevel;
                    }
                    process.env.NODE_CONFIG = JSON.stringify(cfgObj);
                    process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';
                } catch (e) {
                    console.log('\n*** Config file error ***');
                    console.log('='.repeat(40));
                    console.log(`Failed to read or parse config file: ${this.configFileExpanded}`);
                    console.log(`Error: ${e.message}`);
                    console.log('');
                    console.log('Please check that:');
                    console.log('• The file exists and is readable');
                    console.log('• The YAML syntax is valid');
                    console.log('• The file is not corrupted');
                    console.log('='.repeat(40));
                    process.exit(1);
                }
            } else {
                console.log('\n*** Config file not found ***');
                console.log('='.repeat(40));
                console.log(`The specified config file does not exist: ${this.options.configfile}`);
                console.log(`Resolved path: ${this.configFileExpanded}`);
                console.log('');
                console.log('Please check that:');
                console.log('• The file path is correct');
                console.log('• The file exists');
                console.log('• You have read permissions');
                console.log('='.repeat(40));
                process.exit(1);
            }
        } else {
            // This should never happen since configfile is now required,
            // but just in case...
            console.log('\n*** No configuration file specified ***');
            console.log('='.repeat(50));
            console.log('This should not happen - please report this as a bug.');
            console.log('='.repeat(50));
            process.exit(1);
        }

        // Load YAML parser before loading the 'config' package so YAML support is available in bundled/SEA builds
        await import('js-yaml');

        // Allow config mutations if needed (per node-config docs)
        process.env.ALLOW_CONFIG_MUTATIONS = process.env.ALLOW_CONFIG_MUTATIONS || '1';
        // Load application config after env vars are set; works in both SEA and non-SEA when bundled with esbuild
        this.config = (await import('config')).default;

        // Startup diagnostics for config loading (safe: does not print secrets)
        try {
            const cfgObjDiag = this.config?.util?.toObject ? this.config.util.toObject() : null;
            const topKeys = cfgObjDiag ? Object.keys(cfgObjDiag).slice(0, 10) : [];
            const isSea = sea.isSea();
            console.log('CONFIG: source', {
                cliConfigFile: this.options.configfile ?? null,
                resolvedConfigFile: this.configFileExpanded ?? null,
                NODE_ENV: process.env.NODE_ENV ?? null,
                NODE_CONFIG_DIR: process.env.NODE_CONFIG_DIR ?? null,
                NODE_CONFIG_present: typeof process.env.NODE_CONFIG === 'string' && process.env.NODE_CONFIG.length > 0,
                SEA: isSea,
            });
            console.log('CONFIG: top-level keys', topKeys);
            if (this.config?.has?.('Butler.logLevel')) {
                console.log('CONFIG: Butler.logLevel (pre-CLI override):', this.config.get('Butler.logLevel'));
            }
        } catch (e) {
            console.log('CONFIG: diagnostics failed:', e?.message ?? e);
        }

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

            for (let index = 0; index < this.options.newRelicApiKey.length; index++) {
                const accountName = this.options.newRelicAccountName[index];
                const accountId = this.options.newRelicAccountId[index];
                const insertApiKey = this.options.newRelicApiKey[index];

                this.config.Butler.thirdPartyToolsCredentials.newRelic.push({ accountName, accountId, insertApiKey });
            }
        } else if (
            this.options?.newRelicAccountName?.length > 0 ||
            this.options?.newRelicApiKey?.length > 0 ||
            this.options?.newRelicAccountId?.length > 0
        ) {
            console.log('\n\nIncorrect command line parameters: Number of New Relic account names/IDs/API keys must match. Exiting.');
            process.exit(1);
        }

        // Are we running as standalone app or not?
        this.isSea = sea.isSea();

        // Save path to executable
        this.execPath = this.isSea ? upath.dirname(process.execPath) : process.cwd();

        // Are we running as standalone app or not?
        if (this.isSea && !this.options.configfile) {
            // Show help if running as standalone app and mandatory options (e.g. config file) are not specified
            program.help({ error: true });
        }

        // CLI loglevel already applied via NODE_CONFIG prior to loading config

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
                    winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
                ),
            }),
        );

        if (
            this.config.Butler.logLevel === 'verbose' ||
            this.config.Butler.logLevel === 'debug' ||
            this.config.Butler.logLevel === 'silly'
        ) {
            // We don't have a logging object yet, so use plain console.log

            // Are we in a packaged app?
            if (this.isSea) {
                console.log(`Running as standalone app. Executable path: ${this.execPath}`);
            } else {
                console.log(`Running in non-packaged environment. Executable path: ${this.execPath}`);
            }

            console.log(`Log file directory: ${upath.join(this.execPath, this.config.get('Butler.logDirectory'))}`);
            console.log(`upath.dirname(process.execPath): ${upath.dirname(process.execPath)}`);
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
                }),
            );
        }

        this.logger = winston.createLogger({
            transports: this.logTransports,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
            ),
        });

        // Function to get current logging level
        this.getLoggingLevel = () => this.logTransports.find((transport) => transport.name === 'console').level;

        // Write various verbose log info now that we have a logger object
        // Verbose: Show what New Relic account names/API keys/account IDs have been defined (on command line or in config file)
        this.logger.verbose(
            `New Relic account names/API keys/account IDs (via command line or config file): ${JSON.stringify(
                this.config.Butler.thirdPartyToolsCredentials.newRelic,
                null,
                2,
            )}`,
        );

        this.configEngine = null;
        this.configQRS = null;
        if (this.config.has('Butler.restServerApiDocGenerate') === false || this.config.get('Butler.restServerApiDocGenerate') === false) {
            this.logger.debug('CONFIG: API doc mode=off');

            // Only load certificates if we're connecting to Qlik Sense
            let certificates = null;
            if (this.options.qsConnection) {
                // Get certificate file paths for QRS connection
                certificates = this.loadCertificates();
            }

            // Deep copy of headers object
            const httpHeadersEngine = JSON.parse(JSON.stringify(this.config.get('Butler.configEngine.headers')));

            //  Engine config
            this.configEngine = {
                engineVersion: this.config.get('Butler.configEngine.engineVersion'),
                host: this.config.get('Butler.configEngine.host'),
                port: this.config.get('Butler.configEngine.port'),
                isSecure: this.config.get('Butler.configEngine.useSSL'),
                headers: httpHeadersEngine,
                cert: certificates?.cert,
                key: certificates?.key,
                rejectUnauthorized: this.config.get('Butler.configEngine.rejectUnauthorized'),
            };

            // Deep copy of headers object
            const httpHeadersQRS = JSON.parse(JSON.stringify(this.config.get('Butler.configQRS.headers')));

            // QRS config
            this.configQRS = {
                authentication: this.config.get('Butler.configQRS.authentication'),
                host: this.config.get('Butler.configQRS.host'),
                port: this.config.get('Butler.configQRS.port'),
                useSSL: this.config.get('Butler.configQRS.useSSL'),
                headers: httpHeadersQRS,
                rejectUnauthorized: this.config.get('Butler.configQRS.rejectUnauthorized'),
                cert: certificates?.cert,
                key: certificates?.key,
                ca: certificates?.ca,
                certPaths: certificates?.paths,
            };
        } else {
            this.logger.debug('CONFIG: API doc mode=on');
        }

        // Variable holding info about all defined schedules
        this.configSchedule = [];

        // Create list of enabled API endpoints
        this.endpointsEnabled = [];

        /**
         * Recursively traverses an object and adds all keys with a value of true to this.endpointsEnabled array.
         * Used to determine which API endpoints are enabled in the Butler config file.
         * @param {Object} obj - Object to traverse.
         * @returns {undefined}
         */
        const getEnabledApiEndpoints = (obj) => {
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
                schema: [],
            });
        }

        // Folder under which QVD folders are to be created
        this.qvdFolder = this.config.get('Butler.configDirectories.qvdPath');

        // ------------------------------------
        // UDP server connection parameters
        this.udpHost = this.config.get('Butler.udpServerConfig.serverHost');
        this.udpServerTaskResultSocket = null;
        this.udpPortTaskFailure = this.config.get('Butler.udpServerConfig.portTaskFailure');

        // Initialize UDP queue manager if UDP server is enabled
        if (this.config.get('Butler.udpServerConfig.enable')) {
            try {
                const queueConfig = {
                    messageQueue: this.config.get('Butler.udpServerConfig.messageQueue'),
                    rateLimit: this.config.get('Butler.udpServerConfig.rateLimit'),
                    maxMessageSize: this.config.get('Butler.udpServerConfig.maxMessageSize'),
                };
                this.udpQueueManager = new UdpQueueManager(queueConfig, this.logger, 'reload_task_events');
                this.logger.info('CONFIG: UDP queue manager initialized');
            } catch (err) {
                this.logger.error(`CONFIG: Error initializing UDP queue manager: ${this.getErrorMessage(err)}`);
            }
        } else {
            this.udpQueueManager = null;
        }

        // Indicate that we have finished initialising
        this.initialised = true;

        this.logger.verbose('GLOBALS: Init done');

        return instance;
    }

    /**
     * Resolves the path of a certificate file based on the current
     * module's directory and the relative path provided in the
     * configuration file.
     *
     * @param {string} certConfigPath - The relative path to the
     * certificate file as specified in the configuration file.
     * @returns {string} The resolved absolute path to the
     * certificate file.
     */
    resolveCertPath(certConfigPath) {
        const filename = fileURLToPath(import.meta.url);
        const dirname = upath.dirname(filename);
        return upath.resolve(dirname, certConfigPath);
    }

    /**
     * Reads the contents of a certificate file specified by the given
     * filename.
     *
     * @param {string} filename - The filename of the certificate file
     * to be read.
     * @returns {string|null} The contents of the certificate file, or
     * null if an error occurred while reading the file.
     */
    readCert(filename) {
        let cert = null;
        try {
            cert = fs.readFileSync(filename);
        } catch (err) {
            this.logger.error(`CONFIG: Error reading certificate file "${filename}"! ${this.getErrorMessage(err)}`);
        }
        return cert;
    }

    /**
     * Loads all certificates at once and returns an object containing
     * the certificate contents and file paths.
     *
     * @returns {Object} An object containing the certificate contents and file
     * paths.
     * @property {string} cert - The contents of the client certificate file.
     * @property {string} key - The contents of the client key file.
     * @property {string} ca - The contents of the CA certificate file.
     * @property {Object<string, string>} paths - An object containing the file
     * paths to the certificate files.
     */
    loadCertificates() {
        const certPath = this.resolveCertPath(this.config.get('Butler.cert.clientCert'));
        const keyPath = this.resolveCertPath(this.config.get('Butler.cert.clientCertKey'));
        const caPath = this.resolveCertPath(this.config.get('Butler.cert.clientCertCA'));

        return {
            cert: this.readCert(certPath),
            key: this.readCert(keyPath),
            ca: this.readCert(caPath),
            paths: { certPath, keyPath, caPath },
        };
    }

    /**
     * Resolves the paths of the client certificate, client key, and CA
     * certificate files based on the current module's directory and
     * the relative paths provided in the configuration file.
     *
     * Utility function to get certificate paths for external use (e.g., in app.js)
     * This resolves paths based on the calling context (SEA vs regular Node.js)
     *
     * @returns {Object} An object containing the resolved paths to the
     * certificate files.
     * @property {string} certPath - The resolved absolute path to the client
     * certificate file.
     * @property {string} keyPath - The resolved absolute path to the client key
     * file.
     * @property {string} caPath - The resolved absolute path to the CA
     * certificate file.
     */
    getCertificatePaths() {
        // Use the same logic as in app.js for path resolution
        let dirname;
        if (sea.isSea()) {
            const filename = fileURLToPath(import.meta.url);
            dirname = upath.dirname(filename);
        } else {
            dirname = process.cwd();
        }

        const certPath = upath.resolve(dirname, this.config.get('Butler.cert.clientCert'));
        const keyPath = upath.resolve(dirname, this.config.get('Butler.cert.clientCertKey'));
        const caPath = upath.resolve(dirname, this.config.get('Butler.cert.clientCertCA'));

        return { certPath, keyPath, caPath };
    }

    /**
     * Loads approved directories for file system operations via Butler's REST API.
     *
     * Loads approved fromDir and toDir for fileCopy operation, approved fromDir and toDir for
     * fileMove operation, and approved dir for fileDelete operation.
     *
     * Also checks if Butler is running on Linux-ish host and UNC path(s) are specified.
     * Warns if so.
     */
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
                                `FILE COPY CONFIG: UNC paths won't work on non-Windows OSs ("${element.fromDirectory}"). OS is "${this.hostInfo.si.os.platform}".`,
                            );
                        }
                        if (isUncPath(element.toDirectory) === true) {
                            this.logger.warn(
                                `FILE COPY CONFIG: UNC paths won't work on non-Windows OSs ("${element.toDirectory}"). OS is "${this.hostInfo.si.os.platform}".`,
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
            this.logger.error(`CONFIG: Getting approved file copy directories: ${this.getErrorMessage(err)}`);
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
                                `FILE MOVE CONFIG: UNC paths won't work on non-Windows OSs ("${element.fromDirectory}"). OS is "${this.hostInfo.si.os.platform}".`,
                            );
                        }
                        if (isUncPath(element.toDirectory) === true) {
                            this.logger.warn(
                                `FILE MOVE CONFIG: UNC paths won't work on non-Windows OSs ("${element.toDirectory}"). OS is "${this.hostInfo.si.os.platform}".`,
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
            this.logger.error(`CONFIG: Getting approved file move directories: ${this.getErrorMessage(err)}`);
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
                                `FILE DELETE CONFIG: UNC paths won't work on non-Windows OSs ("${element}"). OS is "${this.hostInfo.si.os.platform}".`,
                            );
                        }
                    }

                    const deleteDir = upath.normalizeSafe(element);
                    this.logger.verbose(`Adding normalized fileDelete directory ${deleteDir}`);

                    this.fileDeleteDirectories.push(deleteDir);
                });
            }
        } catch (err) {
            this.logger.error(`CONFIG: Getting approved file delete directories: ${this.getErrorMessage(err)}`);
        }
    }

    /**
     * Gathers and returns information about the host system where Butler is running.
     * Includes OS details, network info, hardware details, and a unique ID.
     *
     * Note: On Windows, this function may execute OS commands via the 'systeminformation' npm package:
     * - cmd.exe /d /s /c \chcp (to get code page info)
     * - netstat -r (to get routing table info)
     * - cmd.exe /d /s /c \echo %COMPUTERNAME%.%USERDNSDOMAIN% (to get computer/domain names)
     *
     * Other OSs may use similar commands or system calls to gather information.
     *
     * These commands are not executed directly by Butler, but by the systeminformation package
     * to gather system details. If this triggers security alerts, you can disable detailed system
     * information gathering by setting Butler.systemInfo.enable to false in the config file.
     *
     * @returns {object | null} Object containing host information or null if an error occurs
     */
    async initHostInfo() {
        try {
            // Check if detailed system info gathering is enabled
            const enableSystemInfo = this.config.get('Butler.systemInfo.enable');

            let siCPU = {};
            let siSystem = {};
            let siMem = {};
            let siOS = {};
            let siDocker = {};
            let siNetwork = [];
            let siNetworkDefault = '';

            // Only gather detailed system info if enabled in config
            if (enableSystemInfo) {
                siCPU = await si.cpu();
                siSystem = await si.system();
                siMem = await si.mem();
                siOS = await si.osInfo();
                siDocker = await si.dockerInfo();
                siNetwork = await si.networkInterfaces();
                siNetworkDefault = await si.networkInterfaceDefault();
            } else {
                // If detailed system info is disabled, use minimal fallback values
                this.logger.info('SYSTEM INFO: Detailed system information gathering is disabled. Using minimal system info.');
                siSystem = { uuid: 'disabled' };
                siMem = { total: os.totalmem() };
                siOS = {
                    platform: os.platform(),
                    arch: os.arch(),
                    release: os.release(),
                    distro: 'unknown',
                    codename: 'unknown',
                    serial: 'unknown',
                };
                siCPU = { processors: 1, physicalCores: 1, cores: os.cpus().length, brand: 'unknown' };
                siNetwork = [{ iface: 'default', mac: '00:00:00:00:00:00', ip4: '127.0.0.1' }];
                siNetworkDefault = 'default';
                siDocker = { isDocker: false };
            }

            const defaultNetworkInterface = siNetworkDefault;

            // Get info about all available network interfaces
            const networkInterface = siNetwork.filter((item) => item.iface === defaultNetworkInterface);

            // Ensure we have at least one network interface for ID generation
            const netIface =
                networkInterface.length > 0 ? networkInterface[0] : siNetwork[0] || { mac: '00:00:00:00:00:00', ip4: '127.0.0.1' };

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
                if (siOS.serial && siOS.serial !== '' && siOS.serial !== 'unknown') {
                    idSrc = siOS.serial + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else if (siMem.total && siMem.total !== '') {
                    idSrc = siMem.total + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else if (siOS.release && siOS.release !== '' && siOS.release !== 'unknown') {
                    idSrc = siOS.release + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else if (siCPU.brand && siCPU.brand !== '' && siCPU.brand !== 'unknown') {
                    idSrc = siCPU.brand + this.config.get('Butler.configQRS.host') + siSystem.uuid;
                } else {
                    idSrc = this.config.get('Butler.configQRS.host') + siSystem.uuid;
                }
                // Add underscore to salt to make sure it's a string
                const salt = `${siMem.total || 'fallback'}_`;
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
                node: { nodeVersion: process.version, versions: process.versions },
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
                    memory: { total: siMem.total },
                    os: siOS,
                    network: siNetwork,
                    networkDefault: siNetworkDefault,
                    docker: siDocker,
                },
            };

            return hostInfo;
        } catch (err) {
            this.logger.error(`CONFIG: Getting host info: ${this.getErrorMessage(err)}`);
            return null;
        }
    }

    /**
     * Initialize InfluxDB.
     *
     * This function will connect to InfluxDB if enabled in the config file and create a new database if it does not exist.
     * It will also create a new default retention policy if one does not exist.
     *
     * @throws {Error} If InfluxDB has not been initialized (race condition during startup of Butler).
     * @throws {Error} If getting the list of InfluxDB databases fails.
     * @throws {Error} If creating a new InfluxDB database fails.
     * @throws {Error} If creating a new InfluxDB retention policy fails.
     */
    async initInfluxDB() {
        const dbName = this.config.get('Butler.influxDb.dbName');
        const enableInfluxdb = this.config.get('Butler.influxDb.enable');

        // Ensure that InfluxDB has been created
        if (this.influx === undefined) {
            this.logger.error('CONFIG: InfluxDB not initialized! Possible race condition during startup of Butler. Exiting.');
            process.exit(1);
        }

        if (enableInfluxdb) {
            try {
                const names = await this.influx.getDatabaseNames();

                if (!names.includes(dbName)) {
                    try {
                        await this.influx.createDatabase(dbName);
                        this.logger.info(`CONFIG: Created new InfluxDB database: ${dbName}`);

                        const newPolicy = this.config.get('Butler.influxDb.retentionPolicy');

                        // Create new default retention policy
                        try {
                            await this.influx.createRetentionPolicy(newPolicy.name, {
                                database: dbName,
                                duration: newPolicy.duration,
                                replication: 1,
                                isDefault: true,
                            });
                            this.logger.info(`CONFIG: Created new InfluxDB retention policy: ${newPolicy.name}`);
                        } catch (err) {
                            this.logger.error(
                                `CONFIG: Error creating new InfluxDB retention policy "${newPolicy.name}"! ${this.getErrorMessage(err)}`,
                            );
                        }
                    } catch (err) {
                        this.logger.error(`CONFIG: Error creating new InfluxDB database "${dbName}"! ${this.getErrorMessage(err)}`);
                    }
                } else {
                    this.logger.info(`CONFIG: Found InfluxDB database: ${dbName}`);
                }
            } catch (err) {
                this.logger.error(`CONFIG: Error getting list of InfuxDB databases! ${this.getErrorMessage(err)}`);
            }
        } else {
            this.logger.info('CONFIG: InfluxDB disabled, not connecting to InfluxDB');
        }
    }

    // async loadConfig() {
    //     const a = await import('config');

    //     console.log(a);
    //     return this.config;
    // }

    /**
     * Synchronously checks if a file exists
     *
     * @param {string} filepath - path to the file to check
     * @returns {boolean} true if the file exists, false otherwise
     */
    static checkFileExistsSync(filepath) {
        let flag = true;
        try {
            fs.accessSync(filepath, fs.constants.F_OK);
        } catch (e) {
            flag = false;
        }
        return flag;
    }

    /**
     * Synchronously sleep for a given amount of milliseconds.
     *
     * @param {number} ms - milliseconds to sleep for
     * @returns {Promise<void>} a promise that resolves after the sleep period
     */
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Checks if Butler is running in a Docker container.
     * @returns {boolean} true if running in Docker, false otherwise
     */
    static isRunningInDocker() {
        try {
            fs.accessSync('/.dockerenv');
            return true;
        } catch (_) {
            return false;
        }
    }

    /**
     * Function to get static engine http headers, ready for use with axios
     *
     * It takes the static headers configuration from the engine config and returns an object with the header names as keys and the header values as values.
     *
     * @returns {Object} an object with the static engine http headers
     */
    getEngineHttpHeaders() {
        const headersConfig = this.configEngine.headers.static;

        // headers variable is an array of objects, each object has "name" and "value" properties
        const headersObj = {};
        headersConfig.forEach((element) => {
            headersObj[element.name] = element.value;
        });

        return headersObj;
    }

    /**
     * Function to get static QRS http headers, ready for use with axios
     *
     * It takes the static headers configuration from the QRS config and returns an object with the header names as keys and the header values as values.
     *
     * @returns {Object} an object with the static QRS http headers
     */
    getQRSHttpHeaders() {
        const headersConfig = this.configQRS.headers.static;

        // headers variable is an array of objects, each object has "name" and "value" properties
        const headersObj = {};
        headersConfig.forEach((element) => {
            headersObj[element.name] = element.value;
        });

        return headersObj;
    }
}

export default new Settings();
