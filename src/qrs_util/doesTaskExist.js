const QrsInteract = require('qrs-interact');
const globals = require('../globals');

// Function for getting info about owner of Qlik Sense apps
module.exports.doesTaskExist = (taskId) =>
    // eslint-disable-next-line no-unused-vars
    new Promise(async (resolve, reject) => {
        try {
            const qrsInstance = new QrsInteract({
                hostname: globals.configQRS.host,
                portNumber: globals.configQRS.port,
                headers: {
                    'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
                },
                certificates: {
                    certFile: globals.configQRS.certPaths.certPath,
                    keyFile: globals.configQRS.certPaths.keyPath,
                },
            });

            // Get info about the task
            try {
                const result = await qrsInstance.Get(`task?filter=id eq ${taskId}`);
                globals.logger.debug(`TASKEXISTS: Got response: ${result.statusCode} for task ID ${taskId}`);

                if (result.statusCode === 200) {
                    // Task exists
                    resolve(true);
                } else {
                    // Task doesn't exist or other error (e.g. couldn't contact QRS)
                    resolve(false);
                }
            } catch (err) {
                globals.logger.error(`TASKEXISTS: Error while getting task: ${JSON.stringify(err, null, 2)}`);
                resolve(false);
            }
        } catch (err) {
            globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${JSON.stringify(err, null, 2)}`);
            resolve(false);
        }
    });
