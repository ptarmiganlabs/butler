const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const qrsUtil = require('../qrs_util');
const { logRESTCall } = require('../lib/logRESTCall');
const { addKeyValuePair } = require('../lib/keyValueStore');
const { apiPutStartTask } = require('../api/senseStartTask');

async function handlerPutStartTask(request, reply) {
    try {
        logRESTCall(request);
        // TODO: Add task exists test. Return error if not.

        const tasksToStartTaskId = [];
        const tasksToStartTags = [];
        const tasksToStartCPs = [];
        const tasksInvalid = [];

        // Check if taskId is the magic '-' (dash).
        // If that's the case only the body should be used to determine what tasks should be started.
        // If taskId is NOT '-' it is assumed to be a proper tas ID, which will then be started.
        if (request.params.taskId === undefined) {
            // Required parameter is missing
            reply.send(
                httpErrors(
                    400,
                    'Required parameter (task ID) missing. Should be a task ID or "-" if task info is passed in body'
                )
            );
        } else if (request.params.taskId !== '-') {
            // One task should be started, it's ID is specied by the taskId URL parameter

            // Handle taskId passed in URL
            // Verify task exists
            const taskExists = await qrsUtil.doesTaskExist.doesTaskExist(request.params.taskId);
            if (taskExists) {
                tasksToStartTaskId.push({ taskId: request.params.taskId });
                globals.logger.silly(
                    `STARTTASK: Added task to taskId start array, now ${tasksToStartTaskId.length} entries in that array`
                );
            } else {
                tasksInvalid.push({ taskId: request.params.taskId });
                globals.logger.silly(
                    `STARTTASK: Added task to invalid taskId array, now ${tasksInvalid.length} entries in that array`
                );
            }

            // Handle data passed in body, if any
        } else if (request.body && Object.keys(request.body).length > 0) {
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
                            await addKeyValuePair(
                                item.payload.namespace,
                                item.payload.key,
                                item.payload.value,
                                item.payload.ttl
                            );
                        } else {
                            globals.logger.warn(
                                'STARTTASK: Trying to store key-value data, but KV store is not enabled.'
                            );
                        }
                    } else {
                        // Missing KV data
                        globals.logger.warn(
                            'STARTTASK: Trying to store key-value data, but method call is missing some KV fields..'
                        );
                    }
                } else if (item.type === 'starttaskid') {
                    // ID of a task that should be started

                    // Verify task exists
                    // payload: { taskId: 'abc' }
                    // eslint-disable-next-line no-await-in-loop
                    const taskExists = await qrsUtil.doesTaskExist.doesTaskExist(item.payload.taskId);
                    if (taskExists) {
                        tasksToStart.push({ taskId: item.payload.taskId });
                        globals.logger.silly(
                            `STARTTASK: Added task to start array, now ${tasksToStart.length} entries in that array`
                        );
                    } else {
                        tasksInvalid.push({ taskId: item.payload.taskId });
                        globals.logger.silly(
                            `STARTTASK: Added task to invalid taskId array, now ${tasksInvalid.length} entries in that array`
                        );
                    }
                } else if (item.type === 'starttasktag') {
                    // All tasks with this tag should be started
                    // Use QRS to search for all tasks with the given tag
                    // payload: { tagName: 'abc' }
                } else if (item.type === 'starttaskcustomproperty') {
                    // All tasks with this starttaskcustomproperty should be started
                    // Use QRS to search for all tasks with the given custom property
                    // payload: { customPropertyName: 'abc', customPropertyValue: 'def }
                }
            }
        }

        const res = { tasksStarted: [], tasksInvalid: [] };

        // Look at the query parameter allTaskIdsMustExist to determine if tasks should be started even though some taskIds are missing/invalid
        if (request.query.allTaskIdsMustExist === true) {
            // All taskIds must exist. If that's not the case, no tasks will be started
            if (tasksInvalid.length === 0) {
                // No invalid tasks detected. Start all tasks!
                // eslint-disable-next-line no-restricted-syntax
                for (const item of tasksToStart) {
                    globals.logger.verbose(`STARTTASK: Starting task: ${item.taskId}`);
                    qrsUtil.senseStartTask.senseStartTask(item.taskId);
                }
                res.tasksStarted.push(tasksToStart);
                res.tasksInvalid = [];
            } else {
                res.tasksInvalid = tasksInvalid;
            }
        } else {
            // Start all tasks that exists
            // eslint-disable-next-line no-restricted-syntax
            for (const item of tasksToStart) {
                globals.logger.verbose(`STARTTASK: Starting task: ${item.taskId}`);
                qrsUtil.senseStartTask.senseStartTask(item.taskId);
            }
            res.tasksStarted = tasksToStart;
            res.tasksInvalid = tasksInvalid;
        }

        reply.code(200).send(res);
    } catch (err) {
        globals.logger.error(
            `STARTTASK: Failed starting task: ${request.params.taskId}, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed starting task'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseStartTask') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseStartTask')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/sensestarttask');
        fastify.put('/v4/reloadtask/:taskId/start', apiPutStartTask, handlerPutStartTask);
        fastify.post('/v4/reloadtask/:taskId/start', apiPutStartTask, handlerPutStartTask);
    }
};
