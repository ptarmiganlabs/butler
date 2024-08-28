/* eslint-disable import/prefer-default-export */
import axios from 'axios';
import globals from '../../../globals.js';

// Function to get info about a specific Qlik Sense Cloud user
// Documentation: https://qlik.dev/apis/rest/users/#get-v1-users-userId
// Parameters:
// - userId: Qlik Sense Cloud user ID
export async function getQlikSenseCloudUserInfo(userId) {
    try {
        // Set up Qlik Sense Cloud API configuration
        const axiosConfig = {
            url: `/api/v1/users/${userId}`,
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