import QrsClient from '../lib/qrs_client.js';
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
    try {
        // Get http headers from Butler config file for QRS API authentication
        const httpHeaders = globals.getQRSHttpHeaders();

        // Create QRS API client instance with hostname, port, headers, and certificates
        const qrsInstance = new QrsClient({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        });

        // Array to hold matching tasks
        const tasks = [];

        try {
            // Handle tag filter - search for tasks with a specific tag
            if (filter.tag) {
                globals.logger.debug(`GETTASKS 1: task/full?filter=tags.name eq '${filter.tag}'`);

                // Query QRS API for tasks with the specified tag
                const result = await qrsInstance.Get(`task/full?filter=tags.name eq '${filter.tag}'`);
                globals.logger.debug(`GETTASKS: Got response: ${result.statusCode} for tag filter ${filter.tag}`);

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
                globals.logger.debug(
                    `GETTASKS 2: task/full?filter=(customProperties.definition.name eq '${filter.customProperty.name}') and (customProperties.value eq '${filter.customProperty.value}')`,
                );

                // Query QRS API for tasks with the specified custom property name and value
                const result = await qrsInstance.Get(
                    `task/full?filter=(customProperties.definition.name eq '${filter.customProperty.name}') and (customProperties.value eq '${filter.customProperty.value}')`,
                );
                globals.logger.debug(`GETTASKS: Got response: ${result.statusCode} for tag filter ${filter.customProperty.name}`);

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
            globals.logger.error(`TASKEXISTS: Error while getting task: ${globals.getErrorMessage(err)}`);
            return false;
        }

        // No filter provided or filter not recognized
        return false;
    } catch (err) {
        globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${globals.getErrorMessage(err)}`);
        return false;
    }
};

export default getTasks;
