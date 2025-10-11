import axios from 'axios';
import globals from '../../../globals.js';
import { HTTP_TIMEOUT_MS } from '../../../constants.js';
import { verifyGuid } from '../../guid_util.js';

/**
 * Get info about a specific Qlik Sense Cloud app.
 *
 * @param {string} appId - Qlik Sense Cloud app ID
 * @returns {Promise<Object|boolean>} - Returns app info object if successful, otherwise false
 */
export async function getQlikSenseCloudAppInfo(appId) {
    try {
        // Make sure appId is valid GUID. If not, log error and return false
        if (verifyGuid(appId) === false) {
            globals.logger.error(`[QSCLOUD] SENSE CLOUD GET APP ITEMS: Invalid appId: ${appId}`);
            return false;
        }

        // Set up Qlik Sense Cloud API configuration
        const axiosConfig = {
            url: `/api/v1/apps/${appId}`,
            method: 'get',
            baseURL: `${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl')}`,
            headers: {
                Authorization: `Bearer ${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token')}`,
            },
            timeout: HTTP_TIMEOUT_MS,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appInfo = JSON.parse(result.data);

        return appInfo;
    } catch (err) {
        globals.logger.error(`[QSCLOUD] SENSE CLOUD GET APP INFO: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Get metadata for a specific Qlik Sense Cloud app.
 *
 * @param {string} appId - Qlik Sense Cloud app ID
 * @returns {Promise<Object|boolean>} - Returns app metadata object if successful, otherwise false
 */
export async function getQlikSenseCloudAppMetadata(appId) {
    try {
        // Make sure appId is valid GUID. If not, log error and return false
        if (verifyGuid(appId) === false) {
            globals.logger.error(`[QSCLOUD] SENSE CLOUD GET APP ITEMS: Invalid appId: ${appId}`);
            return false;
        }

        // Set up Qlik Sense Cloud API configuration
        const axiosConfig = {
            url: `/api/v1/apps/${appId}/data/metadata`,
            method: 'get',
            baseURL: `${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl')}`,
            headers: {
                Authorization: `Bearer ${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token')}`,
            },
            timeout: HTTP_TIMEOUT_MS,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appMetadata = JSON.parse(result.data);

        return appMetadata;
    } catch (err) {
        globals.logger.error(`[QSCLOUD] SENSE CLOUD GET APP METADATA: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Get app items for a specific Qlik Sense Cloud app.
 *
 * @param {string} appId - Qlik Sense Cloud app ID
 * @returns {Promise<Object|boolean>} - Returns app items object if successful, otherwise false
 */
export async function getQlikSenseCloudAppItems(appId) {
    try {
        // Make sure appId is valid GUID. If not, log error and return false
        if (verifyGuid(appId) === false) {
            globals.logger.error(`[QSCLOUD] SENSE CLOUD GET APP ITEMS: Invalid appId: ${appId}`);
            return false;
        }

        // Set up Qlik Sense Cloud API configuration
        // Query parameters are:
        // - resourceType = 'app'
        // - resourceId = <appId>
        // - noActions = true
        // - limit = 100
        const axiosConfig = {
            url: `/api/v1/items`,
            method: 'get',
            baseURL: `${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl')}`,
            params: {
                resourceType: 'app',
                resourceId: appId,
                noActions: true,
                limit: 100,
            },
            headers: {
                Authorization: `Bearer ${globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token')}`,
            },
            timeout: HTTP_TIMEOUT_MS,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appItems = JSON.parse(result.data);

        return appItems;
    } catch (err) {
        globals.logger.error(`[QSCLOUD] Qlik SENSE CLOUD GET SCRIPT LOG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}
