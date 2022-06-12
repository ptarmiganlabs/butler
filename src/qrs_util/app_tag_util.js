const path = require('path');
const QrsInteract = require('qrs-interact');

const globals = require('../globals');

/**
 *
 * @param {*} appId
 * @returns
 */
function getAppTags(appId) {
    return new Promise(async (resolve, reject) => {
        globals.logger.debug(`GETAPPTAGS: Retrieving all tags of app ${appId}`);

        try {
            const qrsInstance = new QrsInteract({
                hostname: globals.configQRS.host,
                portNumber: globals.configQRS.port,
                headers: {
                    'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
                },
                certificates: {
                    certFile: path.resolve(globals.configQRS.certPaths.certPath),
                    keyFile: path.resolve(globals.configQRS.certPaths.keyPath),
                },
            });

            // Get info about the task
            try {
                globals.logger.debug(`GETAPPTAGS: app/full?filter=id eq ${appId}`);

                const result = await qrsInstance.Get(`app/full?filter=id eq ${appId}`);
                globals.logger.debug(`GETAPPTAGS: Got response: ${result.statusCode}`);

                if (result.body.length === 1) {
                    // Yes, the task exists. Return all tags for this task

                    // Get array of all values for this CP, for this task
                    const appTags1 = result.body[0].tags;

                    // Get array of all CP values
                    const appTags2 = appTags1.map((item) => item.name);

                    resolve(appTags2);
                } else {
                    // The task does not exist
                    resolve([]);
                }
            } catch (err) {
                globals.logger.error(`GETAPPTAGS: Error while getting tags: ${err.message}`);
                resolve([]);
            }
        } catch (err) {
            globals.logger.error(`GETAPPTAGS: Error while getting tags: ${err}`);
            reject();
        }
    });
}

module.exports = {
    getAppTags,
};
