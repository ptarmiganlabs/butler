import axios from 'axios';
import { Duration, DateTime } from 'luxon';

import globals from '../../../globals.js';
import { HTTP_TIMEOUT_MS } from '../../../constants.js';

/**
 * Get script log for a specific Qlik Sense Cloud app reload.
 *
 * @param {string} appId - Qlik Sense Cloud app ID
 * @param {string} reloadId - Qlik Sense Cloud reload ID
 * @returns {Promise<Object|boolean>} - Returns script log object if successful, otherwise false
 */
export async function getQlikSenseCloudAppReloadScriptLog(appId, reloadId) {
    try {
        // Set up Qlik Sense Cloud API configuration
        const axiosConfig = {
            url: `/api/v1/apps/${appId}/reloads/logs/${reloadId}`,
            method: 'get',
            baseURL: `${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl')}`,
            headers: {
                Authorization: `Bearer ${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token')}`,
            },
            timeout: HTTP_TIMEOUT_MS,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const scriptLogFull = result.data.split('\r\n');

        // Get number of lines in scriptLogFull
        const scriptLogLineCount = scriptLogFull.length;

        globals.logger.verbose('[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Done getting script log');

        return {
            scriptLogFull,
            scriptLogSize: scriptLogLineCount,
        };
    } catch (err) {
        globals.logger.error(`[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Get script log head lines.
 *
 * @param {Array} scriptLogFull - Full script log as array
 * @param {number} headLineCount - Number of lines to get from head
 * @returns {string} - Returns script log head as string
 */
export function getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, headLineCount) {
    if (headLineCount > 0) {
        const scriptLogHead = scriptLogFull.slice(0, headLineCount).join('\r\n');
        globals.logger.debug(`[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Script log head:\n${scriptLogHead}`);

        return scriptLogHead;
    } else {
        return '';
    }
}

/**
 * Get script log tail lines.
 *
 * @param {Array} scriptLogFull - Full script log as array
 * @param {number} tailLineCount - Number of lines to get from tail
 * @returns {string} - Returns script log tail as string
 */
export function getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, tailLineCount) {
    if (tailLineCount > 0) {
        const scriptLogTail = scriptLogFull.slice(Math.max(scriptLogFull.length - tailLineCount, 0)).join('\r\n');
        globals.logger.debug(`[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Script log tails:\n${scriptLogTail}`);

        return scriptLogTail;
    } else {
        return '';
    }
}

/**
 * Get general info/status/result for a specific Qlik Sense Cloud reload.
 *
 * @param {string} reloadId - Qlik Sense Cloud reload ID
 * @returns {Promise<Object|boolean>} - Returns reload info object if successful, otherwise false
 */
export async function getQlikSenseCloudAppReloadInfo(reloadId) {
    try {
        // Set up Qlik Sense Cloud API configuration
        const axiosConfig = {
            url: `/api/v1/reloads/${reloadId}`,
            method: 'get',
            baseURL: `${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl')}`,
            headers: {
                Authorization: `Bearer ${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token')}`,
            },
            timeout: HTTP_TIMEOUT_MS,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const reloadInfo = JSON.parse(result.data);

        // Reload status lookup, i.e. what initiated the reload. One of
        // - hub: one-time reload manually triggered in hub
        // - chronos: time based scheduled reload triggered by chronos
        // - external = reload triggered via external API request
        // - automations = reload triggered in automation
        // - data-refresh = reload triggered by refresh of data

        // Get duratiom. Diff between startTime and endTime properties of reloadInfo object
        const startTime = DateTime.fromISO(reloadInfo.startTime);
        const endTime = DateTime.fromISO(reloadInfo.endTime);
        const reloadDuration = endTime.diff(startTime);

        // Add duration as JSON
        reloadInfo.executionDuration = reloadDuration.shiftTo('hours', 'minutes', 'seconds').toObject();
        reloadInfo.executionDuration.seconds = Math.floor(reloadInfo.executionDuration.seconds);

        // Add reload created datetime in various formats
        let luxonDT = DateTime.fromISO(reloadInfo.creationTime);
        reloadInfo.executionCreationTime = {
            creationTimeUTC: reloadInfo.creationTime,
            creationTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
            creationTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
            creationTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
            creationTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            creationTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
        };

        // Add start datetime in various formats
        luxonDT = DateTime.fromISO(reloadInfo.startTime);
        reloadInfo.executionStartTime = {
            startTimeUTC: reloadInfo.startTime,
            startTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
            startTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
            startTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
            startTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            startTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
        };

        // Add end datetime in various formats
        luxonDT = DateTime.fromISO(reloadInfo.endTime);
        reloadInfo.executionStopTime = {
            stopTimeUTC: reloadInfo.endTime,
            stopTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
            stopTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
            stopTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
            stopTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            stopTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
        };

        return reloadInfo;
    } catch (err) {
        globals.logger.error(`[QSCLOUD] Qlik SENSE CLOUD GET RELOAD INFO: ${globals.getErrorMessage(err)}`);
        return false;
    }
}
