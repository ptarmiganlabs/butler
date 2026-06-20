import path from 'path';
import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Retrieves all tags of a given reload task.
 *
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<Array<string>>} - Returns an array of tag names.
 */
async function getTaskTags(taskId) {
    globals.logger.debug(`GETTASKTAGS: Retrieving all tags of reload task ${taskId}`);

    let qrsConfig;
    const endpoint = `task/full?filter=id eq ${taskId}`;

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
            globals.logger.debug(`GETTASKTAGS: ${endpoint}`);

            const result = await qrsInstance.Get(endpoint);
            globals.logger.debug(`GETTASKTAGS: Got response: ${result.statusCode}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                globals.logger.error(
                    `GETTASKTAGS: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return false;
            }

            if (result.body.length === 1) {
                // Yes, the task exists. Return all tags for this task

                // Get array of all values for this CP, for this task
                const taskTags1 = result.body[0].tags;

                if (!Array.isArray(taskTags1)) {
                    globals.logger.error(`GETTASKTAGS: Unexpected task tag payload for task ${taskId}`);
                    return false;
                }

                // Get array of all CP values
                const taskTags2 = taskTags1.map((item) => item.name);

                return taskTags2;
            }
            // The task does not exist
            return [];
        } catch (err) {
            globals.logger.error(`GETTASKTAGS: Error while getting tags: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`GETTASKTAGS: Error while getting tags: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
        return false;
    }
}

export default getTaskTags;
