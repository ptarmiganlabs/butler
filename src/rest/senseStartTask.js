/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var qrsUtil = require('../qrs_util');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

var kvstore = require('../rest/keyValueStore');

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
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_senseStartTask = async function (req, res, next) {
    logRESTCall(req);
    // TODO: Add task exists test. Return error if not.

    try {
        if (req.params.taskId == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            // Check if there is a message body. If there is, process all the items in it.
            if (req.body) {
                for (const item of req.body) {
                    if (item.type == 'keyvaluestore') {
                        if (item.payload.namespace && item.payload.key && item.payload.value) {
                            // We have all data needed to create a KV pair in Butler's KV store.
                            // First make sure it's enabled...
                            if (globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')) {
                                // Store KV pair
                                await kvstore.addKeyValuePair(item.payload.namespace, item.payload.key, item.payload.value, item.payload.ttl);
                            } else {
                                globals.logger.warn('STARTTASK: Trying to store key-value data, but KV store is not enabled.');
                            }
                        } else {
                            // Missing KV data
                            globals.logger.warn('STARTTASK: Trying to store key-value data, but method call is missing some KV fields..');
                        }
                    }
                }
            }

            // Use data in request to start Qlik Sense task
            globals.logger.verbose(`STARTTASK: Starting task: ${req.params.taskId}`);

            qrsUtil.senseStartTask.senseStartTask(req.params.taskId);
            res.send(201, { taskId: req.params.taskId });
            next();
        }
    } catch (err) {
        globals.logger.error(`STARTTASK: Failed starting task: ${req.params.taskId}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed starting task'));
        next();
    }
};
