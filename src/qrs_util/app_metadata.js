import path from 'path';
import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Function to get metadata for a specific app from QSEoW.
 *
 * @param {string} appId - The ID of the app.
 * @returns {Promise<object>} - Returns the metadata of the app, empty object if app doesn't exist, or false on error.
 */
async function getAppMetadata(appId) {
    let qrsConfig;
    const endpoint = `app/full?filter=id eq ${appId}`;

    // Validate appId parameter
    if (!appId || typeof appId !== 'string' || appId.trim() === '') {
        globals.logger.warn(`[QSEOW] GET APP METADATA: Invalid or empty appId parameter: "${appId}"`);
        return {};
    }

    globals.logger.debug(`[QSEOW] GET APP METADATA: Retrieving metadata for app ${appId}`);

    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        qrsConfig = {
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: path.resolve(globals.configQRS.certPaths.certPath),
                keyFile: path.resolve(globals.configQRS.certPaths.keyPath),
            },
        };

        const qrsInstance = new QrsClient(qrsConfig);

        // Get app metadata
        try {
            globals.logger.debug(`[QSEOW] GET APP METADATA: ${endpoint}`);

            const result = await qrsInstance.Get(endpoint);
            globals.logger.debug(`[QSEOW] GET APP METADATA: Got response: ${result.statusCode}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                globals.logger.error(
                    `[QSEOW] GET APP METADATA: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return false;
            }

            if (result.body.length === 1) {
                // Yes, the app exists. Return metadata for this app
                return result.body[0];
            }

            // The task does not exist
            return {};
        } catch (err) {
            globals.logger.error(
                `[QSEOW] GET APP METADATA: Error while getting app metadata: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`,
            );
            return false;
        }
    } catch (err) {
        globals.logger.error(
            `[QSEOW] GET APP METADATA: Error while getting app metadata: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`,
        );
        return false;
    }
}

export default getAppMetadata;
