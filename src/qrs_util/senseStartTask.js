const QrsInteract = require('qrs-interact');

const globals = require('../globals');

// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports.senseStartTask = (taskId) => {
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

        qrsInstance
            .Post(`task/${taskId}/start`)
            .then((result) => {
                globals.logger.debug(`STARTTASK: Got response: ${result.statusCode} for task ID ${taskId}`);
            })
            .catch((err) => {
                globals.logger.error(`STARTTASK: Error while starting Sense task: ${err.message}`);
            });
    } catch (err) {
        globals.logger.error(`STARTTASK: Error while starting Sense task: ${JSON.stringify(err, null, 2)}`);
    }
};
