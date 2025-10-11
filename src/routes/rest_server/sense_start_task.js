import httpErrors from 'http-errors';

// Load global variables and functions
import globals from '../../globals.js';

import doesTaskExist from '../../qrs_util/does_task_exist.js';
import senseStartTask from '../../qrs_util/sense_start_task.js';
import getTasks from '../../qrs_util/get_tasks.js';
import { logRESTCall } from '../../lib/log_rest_call.js';
import { addKeyValuePair } from '../../lib/key_value_store.js';
import apiPutStartTask from '../../api/sense_start_task.js';
import { verifyTaskId } from '../../lib/config_util.js';

// Get array of allowed task IDs
/**
 * Get array of allowed task IDs.
 * @returns {Array} Array of allowed task IDs.
 */
function getTaskIdAllowed() {
    if (
        globals.config.has('Butler.startTaskFilter.allowTask.taskId') === true &&
        globals.config.get('Butler.startTaskFilter.allowTask.taskId')
    ) {
        return globals.config.get('Butler.startTaskFilter.allowTask.taskId');
    }
    return [];
}

// Get array of allowed task tags
/**
 * Get array of allowed task tags.
 * @returns {Array} Array of allowed task tags.
 */
function getTaskTagAllowed() {
    if (globals.config.has('Butler.startTaskFilter.allowTask.tag') === true && globals.config.get('Butler.startTaskFilter.allowTask.tag')) {
        return globals.config.get('Butler.startTaskFilter.allowTask.tag');
    }
    return [];
}

// Get array of allowed task custom properties
/**
 * Get array of allowed task custom properties.
 * @returns {Array} Array of allowed task custom properties.
 */
function getTaskCPAllowed() {
    if (
        globals.config.has('Butler.startTaskFilter.allowTask.customProperty') === true &&
        globals.config.get('Butler.startTaskFilter.allowTask.customProperty')
    ) {
        return globals.config.get('Butler.startTaskFilter.allowTask.customProperty');
    }
    return [];
}

/**
 * Check if the task ID is allowed.
 * @param {string} taskId - The task ID to check.
 * @returns {boolean} True if the task ID is allowed, false otherwise.
 */
function isTaskIdAllowed(taskId) {
    const allowedTaskId = getTaskIdAllowed();
    const tmp = allowedTaskId.find((item) => item === taskId);
    if (tmp === undefined) {
        return false;
    }
    return true;
}

/**
 * Check if the task tag is allowed.
 * @param {string} taskTag - The task tag to check.
 * @returns {boolean} True if the task tag is allowed, false otherwise.
 */
function isTaskTagAllowed(taskTag) {
    const allowedTaskTag = getTaskTagAllowed();
    const tmp = allowedTaskTag.find((item) => item === taskTag);
    if (tmp === undefined) {
        return false;
    }
    return true;
}

/**
 * Check if the task custom property is allowed.
 * @param {string} taskCustomPropertyName - The custom property name.
 * @param {string} taskCustomPropertyValue - The custom property value.
 * @returns {boolean} True if the custom property is allowed, false otherwise.
 */
function isTaskCPAllowed(taskCustomPropertyName, taskCustomPropertyValue) {
    const allowedTaskCP = getTaskCPAllowed();
    const tmp = allowedTaskCP.find((item) => {
        if (item.name === taskCustomPropertyName && item.value === taskCustomPropertyValue) {
            return true;
        }
        return false;
    });
    if (tmp === undefined) {
        return false;
    }
    return true;
}

/**
 * Handles the PUT request to start a Qlik Sense task.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerPutStartTask(request, reply) {
    try {
        logRESTCall(request);

        const tasksToStartTaskId = [];
        const tasksToStartTags = [];
        const tasksToStartCPs = [];
        const tasksInvalid = [];
        const tasksIdDenied = [];
        const tasksTagDenied = [];
        const tasksCPDenied = [];

        let taskFilterEnabled;
        let taskExists;

        // Check if task filtering is enabled
        // If it's enabled, get the arrays of allowed task IDs, tags and custom properties
        if (globals.config.has('Butler.startTaskFilter.enable') && globals.config.get('Butler.startTaskFilter.enable') === true) {
            taskFilterEnabled = true;

            globals.logger.debug(`STARTTASK: Allowed task IDs: ${JSON.stringify(getTaskIdAllowed(), null, 2)}`);
            globals.logger.debug(`STARTTASK: Allowed task tags: ${JSON.stringify(getTaskTagAllowed(), null, 2)}`);
            globals.logger.debug(`STARTTASK: Allowed task custom properties: ${JSON.stringify(getTaskCPAllowed(), null, 2)}`);
        } else {
            taskFilterEnabled = false;
        }

        // Check if taskId is the magic '-' (dash).
        // If that's the case only the body should be used to determine what tasks should be started.
        // If taskId is NOT '-' it is assumed to be a proper tas ID, which will then be started.
        if (request.params.taskId === undefined || request.params.taskId === '') {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter (task ID) missing. Should be a task ID or "-" if task info is passed in body'));
        } else {
            // Handle taskId passed in URL
            // Is task ID a valid guid?
            if (request.params.taskId === '-') {
                // "Magic guid" is used to tel Butler that all parameters are sent in message body.
                // Just disregard this task ID.
            } else if (verifyTaskId(request.params.taskId)) {
                // Check if a) task filtering is enabled, and if so b) if task ID is in allow list
                if (
                    request.params.taskId !== '-' &&
                    (taskFilterEnabled === false || (taskFilterEnabled === true && isTaskIdAllowed(request.params.taskId)))
                ) {
                    // Task ID is allowed
                    // Verify task exists
                    taskExists = await doesTaskExist(request.params.taskId);
                    if (taskExists.exists) {
                        tasksToStartTaskId.push(taskExists.task);
                        globals.logger.silly(
                            `STARTTASK: Added task to taskId start array, now ${tasksToStartTaskId.length} entries in that array`,
                        );
                    } else {
                        tasksInvalid.push({ taskId: request.params.taskId });
                        globals.logger.silly(
                            `STARTTASK: Added task to invalid taskId array, now ${tasksInvalid.length} entries in that array`,
                        );
                    }
                } else {
                    // Task filtering is enabled and task ID is not on allowed list
                    // Don't warn if the task Id is '-', as that is used in the URL parameter when task IDs are passed in the body instead
                    // eslint-disable-next-line no-lonely-if
                    if (request.params.taskId !== '-') {
                        globals.logger.warn(`STARTTASK: Task ID in URL path is not allowed: ${request.params.taskId}`);
                        tasksIdDenied.push({ taskId: request.params.taskId });
                    }
                }
            } else {
                tasksInvalid.push({ taskId: request.params.taskId });
            }

            // Handle data passed in body, if any
            if (request.body && Object.keys(request.body).length > 0) {
                // Check if there is a message body (there should be at this point..). If there is, process all the items in it.
                // eslint-disable-next-line no-restricted-syntax
                for (const item of request.body) {
                    if (item.type === 'keyvaluestore') {
                        if (item.payload.namespace && item.payload.key && item.payload.value) {
                            // We have all data needed to create a KV pair in Butler's KV store.
                            // First make sure it's enabled...
                            if (globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')) {
                                // Store KV pair
                                // eslint-disable-next-line no-await-in-loop
                                await addKeyValuePair(item.payload.namespace, item.payload.key, item.payload.value, item.payload.ttl);
                            } else {
                                globals.logger.warn('STARTTASK: Trying to store key-value data, but KV store is not enabled.');
                            }
                        } else {
                            // Missing KV data
                            globals.logger.warn('STARTTASK: Trying to store key-value data, but method call is missing some KV fields..');
                        }
                    } else if (item.type === 'starttaskid') {
                        // ID of a task that should be started

                        // Is task ID a valid guid?
                        if (verifyTaskId(item.payload.taskId)) {
                            // Check if a) task filtering is enabled, and if so b) if task ID is in allow list
                            if (taskFilterEnabled === false || (taskFilterEnabled === true && isTaskIdAllowed(item.payload.taskId))) {
                                // Task ID is allowed
                                // Verify task exists
                                // payload: { taskId: 'abc' }
                                // eslint-disable-next-line no-await-in-loop
                                taskExists = await doesTaskExist(item.payload.taskId);
                                if (taskExists.exists) {
                                    tasksToStartTaskId.push(taskExists.task);
                                    globals.logger.silly(
                                        `STARTTASK: Added task to start array, now ${tasksToStartTaskId.length} entries in that array`,
                                    );
                                } else {
                                    tasksInvalid.push({ taskId: item.payload.taskId });
                                    globals.logger.silly(
                                        `STARTTASK: Added task to invalid taskId array, now ${tasksInvalid.length} entries in that array`,
                                    );
                                }
                            } else {
                                // Task filtering is enabled and task ID is not on allowed list
                                globals.logger.warn(`STARTTASK: Task ID in msg body is not allowed: ${item.payload.taskId}`);
                                tasksIdDenied.push({ taskId: item.payload.taskId });
                            }
                        } else {
                            tasksInvalid.push({ taskId: item.payload.taskId });
                        }
                    } else if (item.type === 'starttasktag') {
                        // All tasks with this tag should be started

                        // Check if a) task filtering is enabled, and if so b) if task tag is in allow list
                        if (taskFilterEnabled === false || (taskFilterEnabled === true && isTaskTagAllowed(item.payload.tag))) {
                            // Task tag is allowed
                            // Use QRS to search for all tasks with the given tag
                            // payload: { tag: 'abc' }

                            // eslint-disable-next-line no-await-in-loop
                            const tagTasks = await getTasks({ tag: item.payload.tag });
                            // eslint-disable-next-line no-restricted-syntax
                            for (const task of tagTasks) {
                                tasksToStartTags.push(task);
                            }
                        } else {
                            // Task filtering is enabled and task ID is not on allowed list
                            globals.logger.warn(`STARTTASK: Task tag is not allowed: ${item.payload.tag}`);
                            tasksTagDenied.push({ tag: item.payload.tag });
                        }
                    } else if (item.type === 'starttaskcustomproperty') {
                        // All tasks with this starttaskcustomproperty should be started

                        // Check if a) task filtering is enabled, and if so b) if task custom property is in allow list
                        if (
                            taskFilterEnabled === false ||
                            (taskFilterEnabled === true &&
                                isTaskCPAllowed(item.payload.customPropertyName, item.payload.customPropertyValue))
                        ) {
                            // Task custom property is allowed
                            // Use QRS to search for all tasks with the given custom property
                            // payload: { customPropertyName: 'abc', customPropertyValue: 'def }

                            // eslint-disable-next-line no-await-in-loop
                            const cpTasks = await getTasks({
                                customProperty: {
                                    name: item.payload.customPropertyName,
                                    value: item.payload.customPropertyValue,
                                },
                            });

                            // eslint-disable-next-line no-restricted-syntax
                            for (const task of cpTasks) {
                                tasksToStartCPs.push(task);
                            }
                        } else {
                            // Task filtering is enabled and task ID is not on allowed list
                            globals.logger.warn(
                                `STARTTASK: Task custom property is not allowed. Name: ${item.payload.customPropertyName}, value: ${item.payload.customPropertyValue}`,
                            );
                            tasksCPDenied.push({
                                name: item.payload.customPropertyName,
                                value: item.payload.customPropertyValue,
                            });
                        }
                    }
                }
            }
        }

        const res = {
            tasksId: { started: [], invalid: [], denied: tasksIdDenied },
            tasksTag: [],
            tasksTagDenied,
            tasksCP: [],
            tasksCPDenied,
        };

        // Look at the query parameter allTaskIdsMustExist to determine if tasks should be started even though some taskIds are missing/invalid
        if (request.query.allTaskIdsMustExist === true) {
            // All taskIds must exist. If that's not the case, no tasks will be started
            if (tasksInvalid.length === 0) {
                // No invalid tasks detected. Start all tasks!
                // eslint-disable-next-line no-restricted-syntax
                for (const item of tasksToStartTaskId) {
                    globals.logger.verbose(`STARTTASK: Starting task: ${item.taskId}`);
                    senseStartTask(item.taskId);
                    res.tasksId.started.push({ taskId: item.taskId, taskName: item.taskName });
                }
            } else {
                // One or more invalid task IDs => Don't start any task
                res.tasksId.invalid = tasksInvalid;
                // eslint-disable-next-line no-restricted-syntax
                for (const item of tasksToStartTaskId) {
                    res.tasksId.denied.push({ taskId: item.taskId });
                }
            }
        } else {
            // Start all tasks that exists
            // eslint-disable-next-line no-restricted-syntax
            for (const item of tasksToStartTaskId) {
                globals.logger.verbose(`STARTTASK: Starting task: ${item.taskId}`);
                senseStartTask(item.taskId);
                res.tasksId.started.push({ taskId: item.taskId, taskName: item.taskName });
            }
            res.tasksId.invalid = tasksInvalid;
        }

        // Start tasks matching the specified tags
        if (tasksToStartTags.length > 0) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of tasksToStartTags) {
                globals.logger.verbose(`STARTTASK: Starting task: ${item.taskId}`);
                senseStartTask(item.taskId);
            }
            res.tasksTag = tasksToStartTags;
        }

        // Start tasks matching the specified custom properties
        if (tasksToStartCPs.length > 0) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of tasksToStartCPs) {
                globals.logger.verbose(`STARTTASK: Starting task: ${item.taskId}`);
                senseStartTask(item.taskId);
            }
            res.tasksCP = tasksToStartCPs;
        }

        reply.code(200).send(JSON.stringify(res, null, 2));
    } catch (err) {
        globals.logger.error(`STARTTASK: Failed starting task: ${request.params.taskId}, error is: ${globals.getErrorMessage(err)}`);
        reply.send(httpErrors(500, 'Failed starting task'));
    }
}

// eslint-disable-next-line no-unused-vars
/**
 * Registers the start task endpoint if enabled in the configuration.
 * @param {Object} fastify - The Fastify instance.
 * @param {Object} options - The options object.
 */
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseStartTask') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseStartTask')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/sensestarttask');
        fastify.put('/v4/reloadtask/:taskId/start', apiPutStartTask, handlerPutStartTask);
        fastify.post('/v4/reloadtask/:taskId/start', apiPutStartTask, handlerPutStartTask);
    }
};
