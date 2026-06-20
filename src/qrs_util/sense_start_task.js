import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Starts a Qlik Sense task given its task ID.
 *
 * Sends a POST request to the QRS API to trigger an immediate start
 * of the specified task.
 *
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<boolean>} - Returns true if the task was started successfully, otherwise false.
 */
async function senseStartTask(taskId) {
    let qrsConfig;
    const endpoint = `task/${taskId}/start`;

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

        // Send POST request to start the task
        // The QRS API returns 204 No Content on successful task start
        const result = await qrsInstance.Post(endpoint);
        globals.logger.debug(`STARTTASK: Got response: ${result.statusCode} for task ID ${taskId}`);

        // Check for successful response (204 No Content)
        if (result.statusCode === 204) {
            globals.logger.verbose(`STARTTASK: Started task ID ${taskId}`);
            return true;
        }

        // Non-204 response indicates an error
        globals.logger.error(
            `STARTTASK: Error while starting Sense task: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                method: 'POST',
                expectedStatusCodes: [204],
            })}`,
        );
        return false;
    } catch (err) {
        // Handle errors during task start
        if (globals.isSea) {
            globals.logger.error(`STARTTASK: Error while starting Sense task: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            globals.logger.error('400 or 404 error most likely means that the task ID is incorrect');
        } else {
            globals.logger.error(`STARTTASK: Error while starting Sense task: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
        }
        return false;
    }
}

export default senseStartTask;
