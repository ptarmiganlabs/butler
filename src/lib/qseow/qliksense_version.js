import later from '@breejs/later';
import axios from 'axios';
import https from 'https';

import globals from '../../globals.js';
import { HTTP_TIMEOUT_SHORT_MS } from '../../constants.js';
import { formatHttpErrorWithContext, formatHttpResultWithContext, hasExpectedHttpStatus } from '../qrs_error.js';
import { postQlikSenseVersionToInfluxDB } from '../influxdb/qlik_sense_version.js';

/**
 * Build common request context for Qlik Sense version monitor logging.
 * @returns {Object} Request context with host, port, base URL, and timeout.
 */
function getVersionMonitorRequestContext() {
    const hostname = globals.config.get('Butler.qlikSenseVersion.versionMonitor.host');
    const portNumber = 9032;

    return {
        hostname,
        portNumber,
        baseURL: `https://${hostname}:${portNumber}`,
        timeout: HTTP_TIMEOUT_SHORT_MS,
    };
}

/**
 * Checks the Qlik Sense version.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
async function checkQlikSenseVersion(config, logger) {
    const endpoint = '/v1/systeminfo';
    const requestContext = getVersionMonitorRequestContext();

    try {
        // Set up Sense call to systeminfo endpoint using Axios
        const httpsAgent = new https.Agent({
            rejectUnauthorized: globals.config.get('Butler.qlikSenseVersion.versionMonitor.rejectUnauthorized'),
            cert: globals.configQRS.cert,
            key: globals.configQRS.key,
        });

        const axiosConfig = {
            url: endpoint,
            method: 'get',
            baseURL: requestContext.baseURL,
            timeout: HTTP_TIMEOUT_SHORT_MS,
            responseType: 'json',
            httpsAgent,
        };

        const result = await axios(axiosConfig);

        // Is status code 200 or body is empty?
        if (!hasExpectedHttpStatus(result) || !result.data) {
            logger.error(
                `[QSEOW] QLIKSENSE VERSION MONITOR: Unexpected HTTP response: ${formatHttpResultWithContext(
                    result,
                    endpoint,
                    requestContext,
                    { method: 'GET', expectedStatusCodes: [200] },
                )}`,
            );
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
        const formattedError = formatHttpErrorWithContext(err, endpoint, requestContext, { method: 'GET' });
        logger.error(`[QSEOW] QLIKSENSE VERSION MONITOR: ${formattedError}`);
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
        logger.error(
            `[QSEOW] QLIKSENSE VERSION MONITOR INIT: ${formatHttpErrorWithContext(
                err,
                '/v1/systeminfo',
                getVersionMonitorRequestContext(),
                {
                    method: 'GET',
                },
            )}`,
        );
    }
}
