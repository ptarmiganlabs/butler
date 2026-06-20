import path from 'path';
import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
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
    let qrsConfig;
    const customPropertyName = String(cpName).replaceAll("'", "''");
    const customPropertyValue = String(cpValue).replaceAll("'", "''");
    const endpoint = `task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${customPropertyName}' and customProperties.value eq '${customPropertyValue}'`;

    localLogger.debug(`Checking if value "${cpValue}" is set for custom property "${cpName}"`);

    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        qrsConfig = {
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: path.resolve(globals.configQRS.certPaths.certPath),
                keyFile: path.resolve(globals.configQRS.certPaths.keyPath),
            },
        };

        const qrsInstance = new QrsClient(qrsConfig);

        // Get info about the task
        try {
            localLogger.debug(`ISCPVALUESET: ${endpoint}`);

            const result = await qrsInstance.Get(endpoint);
            localLogger.debug(`ISCPVALUESET: Got response: ${result.statusCode} for CP ${cpName}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                localLogger.error(
                    `ISCPVALUESET: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return false;
            }

            if (result.body.length === 1) {
                // Yes, the CP/value exists for this task
                return true;
            }

            // Value not set for the CP
            return false;
        } catch (err) {
            localLogger.error(`ISCPVALUESET: Error while getting CP: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            return false;
        }
    } catch (err) {
        localLogger.error(`ISCPVALUESET: Error while getting CP: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
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

    let qrsConfig;
    const customPropertyName = String(cpName).replaceAll("'", "''");
    const endpoint = `task/full?filter=id eq ${taskId} and customProperties.definition.name eq '${customPropertyName}'`;

    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        qrsConfig = {
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: path.resolve(globals.configQRS.certPaths.certPath),
                keyFile: path.resolve(globals.configQRS.certPaths.keyPath),
            },
        };

        const qrsInstance = new QrsClient(qrsConfig);

        // Get info about the task
        try {
            globals.logger.debug(`GETTASKCPVALUE: ${endpoint}`);

            const result = await qrsInstance.Get(endpoint);
            globals.logger.debug(`GETTASKCPVALUE: Got response: ${result.statusCode} for CP ${cpName}`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                globals.logger.error(
                    `GETTASKCPVALUE: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return [];
            }

            if (result.body.length === 1) {
                // Yes, the CP exists for this task. Return all values present for this CP

                // Get array of all values for this CP, for this task
                if (!Array.isArray(result.body[0]?.customProperties)) {
                    globals.logger.error(`GETTASKCPVALUE: Unexpected custom property payload for task ${taskId}`);
                    return [];
                }

                const cpValues1 = result.body[0].customProperties.filter((cp) => cp.definition.name === cpName);

                // Get array of all CP values
                const cpValues2 = cpValues1.map((item) => item.value);

                return cpValues2;
            }

            // The task and/or the CP does not exist
            return [];
        } catch (err) {
            globals.logger.error(`GETTASKCPVALUE: Error while getting CP: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            return [];
        }
    } catch (err) {
        globals.logger.error(`GETTASKCPVALUE: Error while getting CP: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
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

    let cfg;
    const endpoint = `custompropertydefinition/full?filter=objectTypes eq 'ReloadTask'`;

    try {
        // Get http headers from Butler config file and merge with hardcoded headers
        const httpHeaders = {
            ...globals.getQRSHttpHeaders(),
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        cfg = {
            hostname: config.get('Butler.configQRS.host'),
            portNumber: config.get('Butler.configQRS.port'),
            headers: httpHeaders,
            certificates: {
                certFile: configQRS.certPaths.certPath,
                keyFile: configQRS.certPaths.keyPath,
            },
        };

        const qrsInstance = new QrsClient(cfg);

        // Get info about the task
        try {
            logger.debug('GETRELOADTASKSCP: custompropertydefinition/full?filter=objectTypes eq ReloadTask');

            const result = await qrsInstance.Get(endpoint);
            logger.debug(`GETRELOADTASKSCP: Got response: ${result.statusCode} for CP`);

            if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                logger.error(
                    `GETRELOADTASKSCP: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, cfg, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return [];
            }

            if (result.body.length > 0) {
                // At least one CP exists for reload tasks.
                return result.body;
            }

            // The task and/or the CP does not exist
            return [];
        } catch (err) {
            logger.error(`GETRELOADTASKSCP: Error while getting CP: ${formatQrsErrorWithContext(err, endpoint, cfg)}`);
            return [];
        }
    } catch (err) {
        logger.error(`GETRELOADTASKSCP: Error while getting CP: ${formatQrsErrorWithContext(err, endpoint, cfg)}`);
        return false;
    }
}
