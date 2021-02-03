/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var qrsUtil = require('../qrs_util');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

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
module.exports.respondPUT_senseStartTask = function (req, res, next) {
    logRESTCall(req);
    // TODO: Add task exists test. Return error if not.

    try {
        if (req.params.taskId == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            // Use data in request to start Qlik Sense task
            globals.logger.verbose(`STARTTASK: Starting task: ${req.params.taskId}`);

            qrsUtil.senseStartTask.senseStartTask(req.params.taskId);
            res.send(201, {'taskId': req.params.taskId});
            next();
        }
    } catch (err) {
        globals.logger.error(`STARTTASK: Failed starting task: ${req.params.taskId}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed starting task'));
        next();
    }
};
