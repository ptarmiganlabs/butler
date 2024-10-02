import path from 'path';
import QrsInteract from 'qrs-interact';
import globals from '../globals.js';

async function getTaskMetadata(taskId) {
    globals.logger.debug(`GETTASKMETADATA: Retrieving metadata for task ${taskId}`);

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

        // Get task metadata
        try {
            globals.logger.debug(`GETTASKMETADATA: task/full?filter=id eq ${taskId}`);

            const result = await qrsInstance.Get(`task/full?filter=id eq ${taskId}`);
            globals.logger.debug(`GETTASKMETADATA: Got response: ${result.statusCode}`);

            if (result.body.length === 1) {
                // Yes, the task exists. Return metadata for this task
                return result.body[0];
            }

            // The task does not exist
            return [];
        } catch (err) {
            globals.logger.error(`GETTASKMETADATA: Error while getting task metadata: ${err.message}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`GETTASKMETADATA: Error while getting task metadata: ${err}`);
        return false;
    }
}

export default getTaskMetadata;
