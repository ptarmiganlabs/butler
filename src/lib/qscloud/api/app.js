/* eslint-disable import/prefer-default-export */
import axios from 'axios';
import globals from '../../../globals.js';

// Function to get info about a specific Qlik Sense Cloud app
// Parameters:
// - appId: Qlik Sense Cloud app ID
export async function getQlikSenseCloudAppInfo(appId) {
    try {
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
        globals.logger.error(`Qlik SENSE CLOUD GET SCRIPT LOG: ${err}`);
        return false;
    }
}