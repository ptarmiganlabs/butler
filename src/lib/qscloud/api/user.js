import axios from 'axios';
import globals from '../../../globals.js';
import { HTTP_TIMEOUT_MS } from '../../../constants.js';

/**
 * Get info about a specific Qlik Sense Cloud user.
 * Documentation: https://qlik.dev/apis/rest/users/#get-v1-users-userId
 *
 * @param {string} userId - Qlik Sense Cloud user ID
 * @returns {Promise<Object|boolean>} - Returns user info object if successful, otherwise false
 */
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
            timeout: HTTP_TIMEOUT_MS,
            responseType: 'application/json',
        };
        const result = await axios.request(axiosConfig);
        const appInfo = JSON.parse(result.data);

        return appInfo;
    } catch (err) {
        globals.logger.error(`[QSCLOUD] Qlik SENSE CLOUD GET SCRIPT LOG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}
