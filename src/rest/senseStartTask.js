// Load global variables and functions
var globals = require('../globals');
// const errors = require('restify-errors');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

/**
 * @swagger
 *
 * /v4/sensestarttask:
 *   put:
 *     description: |
 *       Start a Qlik Sense task
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: taskId
 *         description: ID of Qlik Sense task
 *         in: body
 *         required: true
 *         type: string
 *         example: {taskId: 210832b5-6174-4572-bd19-3e61eda675ef}
 *     responses:
 *       201:
 *         description: Task successfully started.
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
        if (req.body.taskId == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            // Use data in request to start Qlik Sense task
            globals.logger.verbose(`STARTTASK: Starting task: ${req.body.taskId}`);

            globals.qrsUtil.senseStartTask.senseStartTask(req.body.taskId);
            res.send(201, req.body);
            next();
        }
    } catch (err) {
        globals.logger.error(`STARTTASK: Failed starting task: ${req.body.taskId}`);
        res.send(new errors.InternalError({}, 'Failed starting task'));
        next();
    }
};
