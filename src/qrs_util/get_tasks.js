import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Retrieves information about Qlik Sense tasks based on a filter.
 *
 * Queries the Qlik Sense QRS API to find tasks matching either:
 * - A specific tag name
 * - A custom property name and value combination
 *
 * @param {object} filter - The filter object containing tag or custom property.
 *                 Example: { tag: 'abc', customProperty: { name: 'def', value: 'ghi' } }
 * @returns {Promise<Array<object>>} - Returns an array of tasks matching the filter.
 */
const getTasks = async (filter) => {
    let qrsConfig;
    let endpoint;

    try {
        // Get http headers from Butler config file for QRS API authentication
        const httpHeaders = globals.getQRSHttpHeaders();

        // Create QRS API client instance with hostname, port, headers, and certificates
        qrsConfig = {
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        const qrsInstance = new QrsClient(qrsConfig);

        // Array to hold matching tasks
        const tasks = [];

        try {
            // Handle tag filter - search for tasks with a specific tag
            if (filter.tag) {
                endpoint = `task/full?filter=tags.name eq '${filter.tag}'`;
                globals.logger.debug(`GETTASKS 1: ${endpoint}`);

                // Query QRS API for tasks with the specified tag
                const result = await qrsInstance.Get(endpoint);
                globals.logger.debug(`GETTASKS: Got response: ${result.statusCode} for tag filter ${filter.tag}`);

                if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                    globals.logger.error(
                        `GETTASKS: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                            method: 'GET',
                            expectedStatusCodes: [200],
                        })}`,
                    );
                    return [];
                }

                if (result.statusCode === 200 && result.body.length > 0) {
                    // At least one task matches the tag - extract task ID and name
                    for (const task of result.body) {
                        tasks.push({ taskId: task.id, taskName: task.name });
                    }
                }
                // Return found tasks (may be empty)
                return tasks;
            }

            // Handle custom properties filter - search for tasks with a specific custom property
            if (filter.customProperty) {
                endpoint = `task/full?filter=(customProperties.definition.name eq '${filter.customProperty.name}') and (customProperties.value eq '${filter.customProperty.value}')`;
                globals.logger.debug(`GETTASKS 2: ${endpoint}`);

                // Query QRS API for tasks with the specified custom property name and value
                const result = await qrsInstance.Get(endpoint);
                globals.logger.debug(`GETTASKS: Got response: ${result.statusCode} for tag filter ${filter.customProperty.name}`);

                if (!hasExpectedQrsStatus(result) || !Array.isArray(result.body)) {
                    globals.logger.error(
                        `GETTASKS: Unexpected QRS response: ${formatQrsResultWithContext(result, endpoint, qrsConfig, {
                            method: 'GET',
                            expectedStatusCodes: [200],
                        })}`,
                    );
                    return [];
                }

                if (result.statusCode === 200 && result.body.length > 0) {
                    // At least one task matches the custom property - extract task ID and name
                    for (const task of result.body) {
                        tasks.push({ taskId: task.id, taskName: task.name });
                    }
                }
                // Return found tasks (may be empty)
                return tasks;
            }
        } catch (err) {
            globals.logger.error(`GETTASKS: Error while getting task: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
            return false;
        }

        // No filter provided or filter not recognized
        return false;
    } catch (err) {
        globals.logger.error(`GETTASKS: Error while checking if task exists: ${formatQrsErrorWithContext(err, endpoint, qrsConfig)}`);
        return false;
    }
};

export default getTasks;
