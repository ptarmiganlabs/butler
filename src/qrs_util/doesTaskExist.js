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

                if (result.statusCode === 200 && result.body.length > 0) {
                    // Task exists
                    resolve({
                        exists: true,
                        task: {
                            taskId: result.body[0].id,
                            taskName: result.body[0].name,
                        },
                    });
                } else {
                    // Task doesn't exist or other error (e.g. couldn't contact QRS)
                    resolve({
                        exists: false,
                        task: {},
                    });
                }
            } catch (err) {
                globals.logger.error(`TASKEXISTS: Error while getting task: ${err.message}`);
                resolve(false);
            }
        } catch (err) {
            globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${JSON.stringify(err, null, 2)}`);
            resolve(false);
        }
    });
