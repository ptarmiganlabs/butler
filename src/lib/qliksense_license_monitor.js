import later from '@breejs/later';
import QrsInteract from 'qrs-interact';

import globals from '../globals.js';
import { postQlikSenseLicenseStatusToInfluxDB } from './post_to_influxdb.js';

// Function to check Qlik Sense license status
// The isFirsCheck parameter is used to determine if we should send a message to the alert destinations
// Set isFirsCheck default to false
async function checkQlikSenseLicenseStatus(config, logger, initialCheck) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: 4242,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        configQRS.headers = {
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };
        const qrsInstance = new QrsInteract(configQRS);

        // Get Qlik Sense license info
        const result1 = await qrsInstance.Get(`license/accesstypeoverview`);

        // Is status code 200 or body is empty?
        if (result1.statusCode !== 200 || !result1.body) {
            logger.error(`QLIKSENSE LICENSE MONITOR: HTTP status code ${result1.statusCode}`);
            return;
        }

        // Debug log
        logger.debug(`QLIKSENSE LICENSE MONITOR: ${JSON.stringify(result1.body)}`);

        // To which destination should we send the license information?
        // Check InfluDB first
        // If InfluxDB is enabled, post the license status to InfluxDB
        if (
            config.has('Butler.influxDb.enable') &&
            config.get('Butler.influxDb.enable') === true &&
            config.has('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.enable') &&
            config.get('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.enable') === true
        ) {
            await postQlikSenseLicenseStatusToInfluxDB(result1.body);
        }
    } catch (err) {
        logger.error(`QLIKSENSE LICENSE MONITOR: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE MONITOR: ${err.stack}`);
        }
    }
}

// Function to set up the timer used to check Qlik Sense license status
async function setupQlikSenseLicenseMonitor(config, logger) {
    try {
        if (
            !config.has('Butler.qlikSenseLicense.licenseMonitor.enable') ||
            config.get('Butler.qlikSenseLicense.licenseMonitor.enable') === true
        ) {
            const sched = later.parse.text(config.get('Butler.qlikSenseLicense.licenseMonitor.frequency'));
            later.setInterval(() => {
                checkQlikSenseLicenseStatus(config, logger, false);
            }, sched);

            // Do an initial service status check
            logger.verbose('Doing initial Qlik Sense license check');
            checkQlikSenseLicenseStatus(config, logger, true);
        }
    } catch (err) {
        logger.error(`QLIKSENSE LICENSE MONITOR INIT: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE MONITOR INIT: ${err.stack}`);
        }
    }
}

export default setupQlikSenseLicenseMonitor;
