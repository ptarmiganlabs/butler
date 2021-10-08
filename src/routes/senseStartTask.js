const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const qrsUtil = require('../qrs_util');
const { logRESTCall } = require('../lib/logRESTCall');
const { addKeyValuePair } = require('../lib/keyValueStore');

/**
 * @swagger
 *
 * /v4/reloadtask/{taskId}/start:
 *   put:
 *     description: |
 *       Start a Qlik Sense task
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: taskId
 *         description: ID of Qlik Sense task
 *         in: path
 *         required: true
 *         type: string
 *         example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *       - name: extraInfo
 *         description: |
 *           Object used to pass additional info related to the reload task being started.
 *           Currently it's possible to pass in a key-value pair that will be stored in Butler's KV store.
 *           If Butler's key-value store is not enabled, any key-value information passed in this parameter will simply be ignored.
 *           Use type=keyvaluestore to send one or more KV pairs to the KV store.
 *           Setting TTL=0 disables the TTL feature, i.e. the KV pair will not expire.
 *
 *           This parameter uses a generic JSON/object format (type + payload).
 *           It's thus possible to add new integrations in future Butler versions.
 *         in: body
 *         type: array
 *         items:
 *           type: object
 *           minItems: 0
 *           properties:
 *             type:
 *               type: string
 *             payload:
 *               type: object
 *         example:
 *           - type: keyvaluestore
 *             payload: {namespace: MyFineNamespace, key: AnImportantKey, value: TheValue, ttl: 1000}
 *     responses:
 *       201:
 *         description: Task successfully started.
 *         schema:
 *           type: object
 *           properties:
 *             taskId:
 *               type: string
 *               description: Task ID of started task.
 *       400:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
async function handler(request, reply) {
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

        fastify.put('/v4/reloadtask/:taskId/start', handler);
    }
};
