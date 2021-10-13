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

        if (request.params.taskId === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter (task ID) missing'));
        } else {
            // Check if there is a message body. If there is, process all the items in it.
            if (request.body && Object.keys(request.body).length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of request.body) {
                    if (item.type === 'keyvaluestore') {
                        if (item.payload.namespace && item.payload.key && item.payload.value) {
                            // We have all data needed to create a KV pair in Butler's KV store.
                            // First make sure it's enabled...
                            if (
                                globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')
                            ) {
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
                    }
                }
            }

            // Use data in request to start Qlik Sense task
            globals.logger.verbose(`STARTTASK: Starting task: ${request.params.taskId}`);

            qrsUtil.senseStartTask.senseStartTask(request.params.taskId);

            reply.code(200).send({ taskId: request.params.taskId });
        }
    } catch (err) {
        globals.logger.error(
            `STARTTASK: Failed starting task: ${request.params.taskId}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
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
    }
};
