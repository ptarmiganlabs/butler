import QrsInteract from 'qrs-interact';
import globals from '../globals.js';

// Function for getting info about owner of Qlik Sense apps
const doesTaskExist = async (taskId) => {
    // eslint-disable-next-line no-unused-vars
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

        // Get info about the task
        try {
            globals.logger.debug(`TASKEXISTS 1: task?filter=id eq ${taskId}`);

            const result = await qrsInstance.Get(`task?filter=id eq ${taskId}`);
            globals.logger.debug(`TASKEXISTS: Got response: ${result.statusCode} for task ID ${taskId}`);

            if (result.statusCode === 200 && result.body.length > 0) {
                // Task exists
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
            globals.logger.error(`TASKEXISTS: Error while getting task: ${err.message}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${JSON.stringify(err, null, 2)}`);
        return false;
    }
};

export default doesTaskExist;
