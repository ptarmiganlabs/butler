/* eslint-disable import/prefer-default-export */
import axios from 'axios';
import globals from '../../../globals.js';
import { verifyGuid } from '../../guid_util.js';    

// Function to get info about a specific Qlik Sense Cloud app
// Parameters:
// - appId: Qlik Sense Cloud app ID
export async function getQlikSenseCloudAppInfo(appId) {
    try {
        // Make sure appId is valid GUID. If not, log error and return false
        if (verifyGuid(appId) === false) {
            globals.logger.error(`SENSE CLOUD GET APP ITEMS: Invalid appId: ${appId}`);
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
            timeout: 30000,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appInfo = JSON.parse(result.data);

        return appInfo;
    } catch (err) {
        globals.logger.error(`SENSE CLOUD GET APP INFO: ${err}`);
        return false;
    }
}

// Function to get metadata for a specific Qlik Sense Cloud app
// Parameters:
// - appId: Qlik Sense Cloud app ID
export async function getQlikSenseCloudAppMetadata(appId) {
    try {
        // Make sure appId is valid GUID. If not, log error and return false
        if (verifyGuid(appId) === false) {
            globals.logger.error(`SENSE CLOUD GET APP ITEMS: Invalid appId: ${appId}`);
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
            timeout: 30000,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appMetadata = JSON.parse(result.data);

        return appMetadata;
    } catch (err) {
        globals.logger.error(`SENSE CLOUD GET APP METADATA: ${err}`);
        return false;
    }
}

// Function to get app items for a specific Qlik Sense Cloud app
// Parameters:
// - appId: Qlik Sense Cloud app ID
export async function getQlikSenseCloudAppItems(appId) {
    try {
        // Make sure appId is valid GUID. If not, log error and return false
        if (verifyGuid(appId) === false) {
            globals.logger.error(`SENSE CLOUD GET APP ITEMS: Invalid appId: ${appId}`);
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
            timeout: 30000,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appItems = JSON.parse(result.data);

        return appItems;
    } catch (err) {
        globals.logger.error(`Qlik SENSE CLOUD GET SCRIPT LOG: ${err}`);
        return false;
    }
}
