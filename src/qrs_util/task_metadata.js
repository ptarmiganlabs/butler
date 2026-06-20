import path from 'path';
import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Retrieves metadata for a given task from Qlik Sense QRS API.
 *
 * Uses the task/full endpoint to retrieve comprehensive task metadata including:
 * - Task type, name, and ID
 * - Tags and custom properties
 * - Operational details (last execution result, etc.)
 *
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<object>} - Returns the metadata of the task, or false on error.
 */
async function getTaskMetadata(taskId) {
    globals.logger.debug(`GETTASKMETADATA: Retrieving metadata for task ${taskId}`);

    let qrsConfig;
    const endpoint = `task/full?filter=id eq ${taskId}`;

    try {
        // Get http headers from Butler config file for QRS API authentication
        const httpHeaders = globals.getQRSHttpHeaders();

        // Create QRS API client instance with hostname, port, headers, and certificates
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

        // Query task metadata from QRS API
        try {
            globals.logger.debug(`GETTASKMETADATA: ${endpoint}`);

            // Use task/full endpoint for comprehensive task information including operational details
            const result = await qrsInstance.Get(endpoint);
            globals.logger.debug(`GETTASKMETADATA: Got response: ${result.statusCode}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                globals.logger.error(
                    `GETTASKMETADATA: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return false;
            }

            if (result.body.length === 1) {
                // Task exists - return the full task metadata object
                return result.body[0];
            }

            // Task does not exist (filter returned no results)
            return [];
        } catch (err) {
            globals.logger.error(
                `GETTASKMETADATA: Error while getting task metadata: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`,
            );
            return false;
        }
    } catch (err) {
        globals.logger.error(`GETTASKMETADATA: Error while getting task metadata: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
        return false;
    }
}

export default getTaskMetadata;
