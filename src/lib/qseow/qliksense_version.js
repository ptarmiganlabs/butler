import later from '@breejs/later';
import axios from 'axios';
import https from 'https';

import globals from '../../globals.js';
import { HTTP_TIMEOUT_SHORT_MS } from '../../constants.js';
import { postQlikSenseVersionToInfluxDB } from '../influxdb/qlik_sense_version.js';

/**
 * Checks the Qlik Sense version.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
async function checkQlikSenseVersion(config, logger) {
    try {
        // Set up Sense call to systeminfo endpoint using Axios
        const httpsAgent = new https.Agent({
            rejectUnauthorized: globals.config.get('Butler.qlikSenseVersion.versionMonitor.rejectUnauthorized'),
            cert: globals.configQRS.cert,
            key: globals.configQRS.key,
        });

        const axiosConfig = {
            url: `/v1/systeminfo`,
            method: 'get',
            baseURL: `https://${globals.config.get('Butler.qlikSenseVersion.versionMonitor.host')}:9032`,
            timeout: HTTP_TIMEOUT_SHORT_MS,
            responseType: 'json',
            httpsAgent,
        };

        const result = await axios(axiosConfig);

        // Is status code 200 or body is empty?
        if (result.status !== 200 || !result.data) {
            logger.error(`[QSEOW] QLIKSENSE VERSION MONITOR: HTTP status code ${result.status}, "${result.statusText}"`);
            return;
        }

        // Debug log
        logger.debug(`QLIKSENSE VERSION MONITOR: ${JSON.stringify(result.data)}`);

        // Log version info to console log
        logger.info(`[QSEOW] QLIKSENSE VERSION MONITOR: Qlik Sense product name: ${result.data.productName}`);
        logger.info(`[QSEOW] QLIKSENSE VERSION MONITOR: Qlik Sense deployment type: ${result.data.deploymentType}`);
        logger.info(`[QSEOW] QLIKSENSE VERSION MONITOR: Qlik Sense version: ${result.data.version}`);
        logger.info(`[QSEOW] QLIKSENSE VERSION MONITOR: Qlik Sense release: ${result.data.releaseLabel}`);

        // To which destination should we send the version information?
        // Check InfluDB first
        // If InfluxDB is enabled, post the version info to InfluxDB
        if (
            config.get('Butler.influxDb.enable') === true &&
            config.get('Butler.qlikSenseVersion.versionMonitor.destination.influxDb.enable') === true
        ) {
            await postQlikSenseVersionToInfluxDB(result.data);
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE VERSION MONITOR: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE VERSION MONITOR: ${globals.getErrorMessage(err)}`);
        }
    }
}

/**
 * Sets up the timer used to check Qlik Sense version.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
export async function setupQlikSenseVersionMonitor(config, logger) {
    try {
        if (config.get('Butler.qlikSenseVersion.versionMonitor.enable') === true) {
            const sched = later.parse.text(config.get('Butler.qlikSenseVersion.versionMonitor.frequency'));
            later.setInterval(() => {
                checkQlikSenseVersion(config, logger, false);
            }, sched);

            // Do an initial version check
            logger.verbose('[QSEOW] Doing initial Qlik Sense version check');
            checkQlikSenseVersion(config, logger, true);
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE VERSION MONITOR INIT: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE VERSION MONITOR INIT: ${globals.getErrorMessage(err)}`);
        }
    }
}
