import path from 'path';
import QrsInteract from 'qrs-interact';
import globals from '../globals.js';

/**
 *
 * @param {*} taskId
 * @returns
 */
async function getTaskTags(taskId) {
    globals.logger.debug(`GETTASKTAGS: Retrieving all tags of reload task ${taskId}`);

    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        const qrsInstance = new QrsInteract({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: path.resolve(globals.configQRS.certPaths.certPath),
                keyFile: path.resolve(globals.configQRS.certPaths.keyPath),
            },
        });

        // Get info about the task
        try {
            globals.logger.debug(`GETTASKTAGS: task/full?filter=id eq ${taskId}`);

            const result = await qrsInstance.Get(`task/full?filter=id eq ${taskId}`);
            globals.logger.debug(`GETTASKTAGS: Got response: ${result.statusCode}`);

            if (result.body.length === 1) {
                // Yes, the task exists. Return all tags for this task

                // Get array of all values for this CP, for this task
                const taskTags1 = result.body[0].tags;

                // Get array of all CP values
                const taskTags2 = taskTags1.map((item) => item.name);

                return taskTags2;
            }
            // The task does not exist
            return [];
        } catch (err) {
            globals.logger.error(`GETTASKTAGS: Error while getting tags: ${err.message}`);
            return [];
        }
    } catch (err) {
        globals.logger.error(`GETTASKTAGS: Error while getting tags: ${err}`);
        return false;
    }
}

export default getTaskTags;
