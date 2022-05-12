const path = require('path');
const QrsInteract = require('qrs-interact');

const globals = require('../globals');

/**
 *
 * @param {*} taskId
 * @param {*} cpName
 * @param {*} cpValue
 * @returns
 */
function isCustomPropertyValueSet(taskId, cpName, cpValue) {
    return new Promise(async (resolve, reject) => {
        globals.logger.debug(`Checking if value "${cpValue}" is set for custom property "${cpName}"`);

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
                globals.logger.debug(
                    `ISCPVALUESET: task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}' and customProperties.value eq '${cpValue}'`
                );

                const result = await qrsInstance.Get(
                    `task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}' and customProperties.value eq '${cpValue}'`
                );
                globals.logger.debug(`ISCPVALUESET: Got response: ${result.statusCode} for CP ${cpName}`);

                if (result.body.length === 1) {
                    // Yes, the CP/value exists for this task
                    resolve(true);
                } else {
                    // Value not set for the CP
                    resolve(false);
                }
            } catch (err) {
                globals.logger.error(`ISCPVALUESET: Error while getting CP: ${err.message}`);
                resolve(false);
            }
        } catch (err) {
            globals.logger.error(`ISCPVALUESET: Error while getting CP: ${err}`);
            reject();
        }
    });
}

/**
 *
 * @param {*} taskId
 * @param {*} cpName
 * @returns
 */
function getTaskCustomPropertyValues(taskId, cpName) {
    return new Promise(async (resolve, reject) => {
        globals.logger.debug(`GETTASKCPVALUE: Retrieving all values for custom property "${cpName}" of reload task ${taskId}`);

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
                globals.logger.debug(
                    `GETTASKCPVALUE: task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}'`
                );

                const result = await qrsInstance.Get(
                    `task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}'`
                );
                globals.logger.debug(`GETTASKCPVALUE: Got response: ${result.statusCode} for CP ${cpName}`);

                if (result.body.length === 1) {
                    // Yes, the CP exists for this task. Return all values present for this CP

                    // Get array of all values for this CP, for this task
                    const cpValues1 = result.body[0].customProperties.filter((cp) => cp.definition.name === cpName);

                    // Get array of all CP values
                    const cpValues2 = cpValues1.map((item) => item.value);

                    resolve(cpValues2);
                } else {
                    // The task and/or the CP does not exist
                    resolve([]);
                }
            } catch (err) {
                globals.logger.error(`GETTASKCPVALUE: Error while getting CP: ${err.message}`);
                resolve([]);
            }
        } catch (err) {
            globals.logger.error(`GETTASKCPVALUE: Error while getting CP: ${err}`);
            reject();
        }
    });
}

module.exports = {
    isCustomPropertyValueSet,
    getTaskCustomPropertyValues,
};
