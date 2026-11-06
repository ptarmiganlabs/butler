import axios from 'axios';
import globals from '../../../globals.js';
import { HTTP_TIMEOUT_MS, QS_CLOUD_USER_INFO_REUSE_MS } from '../../../constants.js';

// Qlik Sense Cloud user reads, by user ID: the read, and when it started.
// The alerts about a failed app reload show its app owner and the user who triggered it, who are often the same few users.
// A read from the last few minutes is reused, also while it is still under way, so that many reloads failing at once
// don't read the same user many times. A failed read isn't kept, so the next alert tries again.
const userInfoReads = new Map();

/**
 * Read info about a specific Qlik Sense Cloud user from the users API.
 *
 * @param {string} userId - Qlik Sense Cloud user ID
 * @returns {Promise<Object|boolean>} - Returns user info object if successful, otherwise false
 */
async function readQlikSenseCloudUserInfo(userId) {
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
        globals.logger.error(`[QSCLOUD] QLIK SENSE CLOUD GET USER INFO: Could not get user "${userId}": ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Get info about a specific Qlik Sense Cloud user.
 * Documentation: https://qlik.dev/apis/rest/users/#get-v1-users-userId
 *
 * A read of the same user that started less than QS_CLOUD_USER_INFO_REUSE_MS ago is reused, also while it is under way.
 *
 * @param {string} userId - Qlik Sense Cloud user ID
 * @returns {Promise<Object|boolean>} - Returns user info object if successful, otherwise false
 */
export async function getQlikSenseCloudUserInfo(userId) {
    const now = Date.now();

    // Forget the reads that are too old to reuse
    for (const [readUserId, { startedAt }] of userInfoReads) {
        if (now - startedAt >= QS_CLOUD_USER_INFO_REUSE_MS) {
            userInfoReads.delete(readUserId);
        }
    }

    if (!userInfoReads.has(userId)) {
        const read = readQlikSenseCloudUserInfo(userId);
        userInfoReads.set(userId, { read, startedAt: now });

        // Forget a failed read, so that the next alert tries again
        read.then((userInfo) => {
            if (userInfo === false && userInfoReads.get(userId)?.read === read) {
                userInfoReads.delete(userId);
            }
        });
    }

    return userInfoReads.get(userId).read;
}

/**
 * Forget the Qlik Sense Cloud users read so far, so that the next read of each user goes to the users API.
 * The tests use it, to start each test without the users earlier tests read.
 */
export function clearQlikSenseCloudUserInfoReads() {
    userInfoReads.clear();
}
