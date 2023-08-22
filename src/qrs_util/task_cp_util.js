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
async function isCustomPropertyValueSet(taskId, cpName, cpValue) {
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
                return true;
            }

            // Value not set for the CP
            return false;
        } catch (err) {
            globals.logger.error(`ISCPVALUESET: Error while getting CP: ${err.message}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`ISCPVALUESET: Error while getting CP: ${err}`);
        return false;
    }
}

/**
 *
 * @param {*} taskId
 * @param {*} cpName
 * @returns
 */
async function getTaskCustomPropertyValues(taskId, cpName) {
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
            globals.logger.debug(`GETTASKCPVALUE: task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}'`);

            const result = await qrsInstance.Get(`task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}'`);
            globals.logger.debug(`GETTASKCPVALUE: Got response: ${result.statusCode} for CP ${cpName}`);

            if (result.body.length === 1) {
                // Yes, the CP exists for this task. Return all values present for this CP

                // Get array of all values for this CP, for this task
                const cpValues1 = result.body[0].customProperties.filter((cp) => cp.definition.name === cpName);

                // Get array of all CP values
                const cpValues2 = cpValues1.map((item) => item.value);

                return cpValues2;
            }

            // The task and/or the CP does not exist
            return [];
        } catch (err) {
            globals.logger.error(`GETTASKCPVALUE: Error while getting CP: ${err.message}`);
            return [];
        }
    } catch (err) {
        globals.logger.error(`GETTASKCPVALUE: Error while getting CP: ${err}`);
        return false;
    }
}

module.exports = {
    isCustomPropertyValueSet,
    getTaskCustomPropertyValues,
};
