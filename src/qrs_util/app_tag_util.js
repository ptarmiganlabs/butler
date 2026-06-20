import path from 'path';
import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Retrieves all tags of a given app.
 *
 * @param {string} appId - The ID of the app.
 * @returns {Promise<Array<string>>} - Returns an array of tag names.
 */
async function getAppTags(appId) {
    globals.logger.debug(`GETAPPTAGS: Retrieving all tags of app ${appId}`);

    let qrsConfig;
    const endpoint = `app/full?filter=id eq ${appId}`;

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

        // Get info about the task
        try {
            globals.logger.debug(`GETAPPTAGS: ${endpoint}`);

            const result = await qrsInstance.Get(endpoint);
            globals.logger.debug(`GETAPPTAGS: Got response: ${result.statusCode}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                globals.logger.error(
                    `GETAPPTAGS: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return [];
            }

            if (result.body.length === 1) {
                // Yes, the task exists. Return all tags for this task

                // Get array of all values for this CP, for this task
                const appTags1 = result.body[0].tags;

                if (!Array.isArray(appTags1)) {
                    globals.logger.error(`GETAPPTAGS: Unexpected app tag payload for app ${appId}`);
                    return [];
                }

                // Get array of all CP values
                const appTags2 = appTags1.map((item) => item.name);

                return appTags2;
            }

            // The task does not exist
            return [];
        } catch (err) {
            globals.logger.error(`GETAPPTAGS: Error while getting tags: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            return [];
        }
    } catch (err) {
        globals.logger.error(`GETAPPTAGS: Error while getting tags: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
        return false;
    }
}

export default getAppTags;
