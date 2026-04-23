import QrsClient from '../lib/qrs_client.js';
import globals from '../globals.js';

/**
 * Checks if a Qlik Sense task exists given its task ID.
 *
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<object>} - Returns an object indicating whether the task exists and its details.
 */
const doesTaskExist = async (taskId) => {
    try {
        // Get http headers from Butler config file for QRS API authentication
        const httpHeaders = globals.getQRSHttpHeaders();

        // Create QRS API client instance with hostname, port, headers, and certificates
        const qrsInstance = new QrsClient({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        });

        // Query QRS API to check if task exists
        try {
            globals.logger.debug(`TASKEXISTS 1: task?filter=id eq ${taskId}`);

            // Use filter to find task by ID - returns array of matching tasks
            const result = await qrsInstance.Get(`task?filter=id eq ${taskId}`);
            globals.logger.debug(`TASKEXISTS: Got response: ${result.statusCode} for task ID ${taskId}`);

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
            globals.logger.error(`TASKEXISTS: Error while getting task: ${globals.getErrorMessage(err)}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${globals.getErrorMessage(err)}`);
        return false;
    }
};

export default doesTaskExist;
