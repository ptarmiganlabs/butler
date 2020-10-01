
// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

const errors = require('restify-errors');


/**
 * @swagger
 *
 * /v4/schedule/{scheduleId}:
 *   post:
 *     description: |
 *       Create a new schedule.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: |
 *           Template used to create new schedule objects
 * 
 *           __name__: Descriptive name for the schedule
 *           __cronSchedule__: 5 or 6 position cron schedule. Ex "*\/30 * * * *" will run every 30 minutes. 
 *           __timezone__: Time zone the schedule should use. Ex "Europe/Stockholm".
 *           __qlikSenseTaskId__: ID of Qlik Sense task that should be started when schedule triggers.
 *           __startupState__: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *           __tags__: Can be used to categorise schedules.
 *         in: body
 *         schema: 
 *           type: object
 *           required: 
 *             - name
 *             - cronSchedule
 *             - timezone
 *             - qlikSenseTaskId
 *             - startupState
 *           properties:
 *             name:
 *               type: string
 *               description: Descriptive name for the schedule
 *               example: Reload sales metrics
 *             cronSchedule:
 *               type: string
 *               description: 5 or 6 position cron schedule. If 6 positions used, the leftmost position represent seconds. If 5 positions used, leftmost position is minutes. Example will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.
 *               example: 0,30 6 * * 1-5
 *             timezone:
 *               type: string
 *               description: Time zone the schedule should use.
 *               example: Europe/Stockholm
 *             qlikSenseTaskId:
 *               type: string
 *               description: ID of Qlik Sense task that should be started when schedule triggers.
 *               example: 210832b5-6174-4572-bd19-3e61eda675ef
 *             startupState:
 *               type: string
 *               enum: [start, started, stop, stopped]
 *               description: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *               example: started
 *             tags:
 *               type: array
 *               items:
 *                 type: integer
 *               minItems: 0
 *               example: [tag 1, tag 2]
 *     responses:
 *       201:
 *         description: Schedule created.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_fileMove = function (req, res, next) {
    logRESTCall(req);

    try {

        res.send(201, newSchedule);
        next();
    } catch (err) {
        globals.logger.error(`FILEMOVE: Failed moving file ${JSON.stringify(req.body, null, 2)}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed moving file'));
        next();
    }

};



module.exports.respondPUT_fileDelete = function (req, res, next) {
    logRESTCall(req);

    try {

        res.send(201, newSchedule);
        next();
    } catch (err) {
        globals.logger.error(`FILEDELETE: Failed deleting file ${JSON.stringify(req.body, null, 2)}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed deleting file'));
        next();
    }

};