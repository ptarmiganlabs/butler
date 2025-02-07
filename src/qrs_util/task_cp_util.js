import path from 'path';
import QrsInteract from 'qrs-interact';
import globals from '../globals.js';

/**
 * Checks if a custom property value is set for a given task.
 *
 * @param {string} taskId - The ID of the task.
 * @param {string} cpName - The name of the custom property.
 * @param {string} cpValue - The value of the custom property.
 * @param {object} [logger] - Optional logger object.
 * @returns {Promise<boolean>} - Returns true if the custom property value is set, otherwise false.
 */
export async function isCustomPropertyValueSet(taskId, cpName, cpValue, logger) {
    const localLogger = logger !== undefined ? logger : globals.logger;

    localLogger.debug(`Checking if value "${cpValue}" is set for custom property "${cpName}"`);

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
            localLogger.debug(
                `ISCPVALUESET: task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}' and customProperties.value eq '${cpValue}'`,
            );

            const result = await qrsInstance.Get(
                `task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${cpName}' and customProperties.value eq '${cpValue}'`,
            );
            localLogger.debug(`ISCPVALUESET: Got response: ${result.statusCode} for CP ${cpName}`);

            if (result.body.length === 1) {
                // Yes, the CP/value exists for this task
                return true;
            }

            // Value not set for the CP
            return false;
        } catch (err) {
            localLogger.error(`ISCPVALUESET: Error while getting CP: ${err.message}`);
            return false;
        }
    } catch (err) {
        localLogger.error(`ISCPVALUESET: Error while getting CP: ${err}`);
        return false;
    }
}

/**
 * Retrieves all values for a custom property of a given task.
 *
 * @param {string} taskId - The ID of the task.
 * @param {string} cpName - The name of the custom property.
 * @returns {Promise<Array<string>>} - Returns an array of custom property values.
 */
export async function getTaskCustomPropertyValues(taskId, cpName) {
    globals.logger.debug(`GETTASKCPVALUE: Retrieving all values for custom property "${cpName}" of reload task ${taskId}`);

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

// Function to get all custom properties that are available for reload tasks
/**
 * Retrieves all custom properties that are available for reload tasks.
 *
 * @param {object} config - The configuration object.
 * @param {object} configQRS - The QRS configuration object.
 * @param {object} logger - The logger object.
 * @returns {Promise<Array<object>>} - Returns an array of custom property definitions.
 */
export async function getReloadTasksCustomProperties(config, configQRS, logger) {
    logger.debug('GETRELOADTASKSCP: Retrieving all custom properties that are available for reload tasks');

    try {
        const cfg = {
            hostname: config.get('Butler.configQRS.host'),
            portNumber: 4242,
            certificates: {
                certFile: configQRS.certPaths.certPath,
                keyFile: configQRS.certPaths.keyPath,
            },
        };

        cfg.headers = {
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsInteract(cfg);

        // Get info about the task
        try {
            logger.debug('GETRELOADTASKSCP: custompropertydefinition/full?filter=objectType eq ReloadTask');

            const result = await qrsInstance.Get(`custompropertydefinition/full?filter=objectTypes eq 'ReloadTask'`);
            logger.debug(`GETRELOADTASKSCP: Got response: ${result.statusCode} for CP`);

            if (result.body.length > 0) {
                // At least one CP exists for reload tasks.
                return result.body;
            }

            // The task and/or the CP does not exist
            return [];
        } catch (err) {
            logger.error(`GETRELOADTASKSCP: Error while getting CP: ${err.message}`);
            return [];
        }
    } catch (err) {
        logger.error(`GETRELOADTASKSCP: Error while getting CP: ${err}`);
        return false;
    }
}
