import QrsInteract from 'qrs-interact';
import globals from '../globals.js';

/**
 * Starts a Qlik Sense task given its task ID.
 *
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<boolean>} - Returns true if the task was started successfully, otherwise false.
 */
async function senseStartTask(taskId) {
    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        const qrsInstance = new QrsInteract({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        });

        const result = await qrsInstance.Post(`task/${taskId}/start`);
        globals.logger.debug(`STARTTASK: Got response: ${result.statusCode} for task ID ${taskId}`);

        if (result.statusCode === 204) {
            globals.logger.verbose(`STARTTASK: Started task ID ${taskId}`);
            return true;
        }

        globals.logger.error(`STARTTASK: Error while starting Sense task: ${JSON.stringify(result, null, 2)}`);
        return false;
    } catch (err) {
        if (err.message) {
            globals.logger.error(`STARTTASK: Error while starting Sense task: ${err.message}`);
            globals.logger.error('400 or 404 error most likely means that the task ID is incorrect');
        }

        if (err.stack) {
            globals.logger.error(`STARTTASK: Error while starting Sense task: ${err.stack}`);
        }
        return false;
    }
}

export default senseStartTask;
