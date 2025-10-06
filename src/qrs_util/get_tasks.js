import QrsClient from '../lib/qrs_client.js';
import globals from '../globals.js';

/**
 * Retrieves information about Qlik Sense tasks based on a filter.
 *
 * @param {object} filter - The filter object containing tag or custom property.
 *                 Example: { tag: 'abc', customProperty: { name: 'def', value: 'ghi' } }
 * @returns {Promise<Array<object>>} - Returns an array of tasks matching the filter.
 */
const getTasks = async (filter) => {
    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        const qrsInstance = new QrsClient({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        });

        const tasks = [];

        try {
            // Handle tag filter
            if (filter.tag) {
                globals.logger.debug(`GETTASKS 1: task/full?filter=tags.name eq '${filter.tag}'`);
                const result = await qrsInstance.Get(`task/full?filter=tags.name eq '${filter.tag}'`);
                globals.logger.debug(`GETTASKS: Got response: ${result.statusCode} for tag filter ${filter.tag}`);

                if (result.statusCode === 200 && result.body.length > 0) {
                    // At least one task matches the tag
                    for (const task of result.body) {
                        tasks.push({ taskId: task.id, taskName: task.name });
                    }
                } else {
                    // No task matches the tag
                }
                return tasks;
            }

            // Handle custom properties filter
            if (filter.customProperty) {
                globals.logger.debug(
                    `GETTASKS 2: task/full?filter=(customProperties.definition.name eq '${filter.customProperty.name}') and (customProperties.value eq '${filter.customProperty.value}')`,
                );
                const result = await qrsInstance.Get(
                    `task/full?filter=(customProperties.definition.name eq '${filter.customProperty.name}') and (customProperties.value eq '${filter.customProperty.value}')`,
                );
                globals.logger.debug(`GETTASKS: Got response: ${result.statusCode} for tag filter ${filter.customProperty.name}`);

                if (result.statusCode === 200 && result.body.length > 0) {
                    // At least one task matches the tag
                    for (const task of result.body) {
                        tasks.push({ taskId: task.id, taskName: task.name });
                    }
                } else {
                    // No task matches the custom property
                }
                return tasks;
            }
        } catch (err) {
            globals.logger.error(`TASKEXISTS: Error while getting task: ${globals.getErrorMessage(err)}`);
            return false;
        }

        return false;
    } catch (err) {
        globals.logger.error(`TASKEXISTS: Error while checking if task exists: ${globals.getErrorMessage(err)}`);
        return false;
    }
};

export default getTasks;
