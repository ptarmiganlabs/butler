import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Checks if a Qlik Sense task exists given its task ID.
 *
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<object>} - Returns an object indicating whether the task exists and its details.
 */
const doesTaskExist = async (taskId) => {
    let qrsConfig;
    const endpoint = `task?filter=id eq ${taskId}`;

    try {
        // Get http headers from Butler config file for QRS API authentication
        const httpHeaders = globals.getQRSHttpHeaders();

        // Create QRS API client instance with hostname, port, headers, and certificates
        qrsConfig = {
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        const qrsInstance = new QrsClient(qrsConfig);

        // Query QRS API to check if task exists
        try {
            globals.logger.debug(`TASKEXISTS 1: ${endpoint}`);

            // Use filter to find task by ID - returns array of matching tasks
            const result = await qrsInstance.Get(endpoint);
            globals.logger.debug(`TASKEXISTS: Got response: ${result.statusCode} for task ID ${taskId}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                globals.logger.error(
                    `TASKEXISTS: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );

                return {
                    exists: false,
                    task: {},
                };
            }

            if (result.statusCode === 200 && result.body.length > 0) {
                // Task was found - return existence flag and basic task info
                return {
                    exists: true,
                    task: {
                        taskId: result.body[0].id,
                        taskName: result.body[0].name,
                    },
                };
            }
            // Task doesn't exist or other error (e.g. couldn't contact QRS)
            return {
                exists: false,
                task: {},
            };
        } catch (err) {
            globals.logger.error(`TASKEXISTS: Error while getting task: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
        return false;
    }
};

export default doesTaskExist;
