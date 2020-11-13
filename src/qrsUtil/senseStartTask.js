/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

let qrsInteract = require('qrs-interact');
var globals = require('../globals.js');

// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports.senseStartTask = function (taskId) {
    try {
        let qrsInstance = new qrsInteract({
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
            .then(result => {
                globals.logger.verbose(`STARTTASK: Got response: ${result.statusCode}`);
            })
            .catch(err => {
                globals.logger.error(`STARTTASK: Error while starting Sense task: ${err.message}`);
            });
    } catch (err) {
        globals.logger.error(`STARTTASK: Error while starting Sense task: ${JSON.stringify(err, null, 2)}`);
    }
};
