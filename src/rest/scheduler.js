// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const uuid = require('uuid');
// const { configSchedule } = require('../globals');
const errors = require('restify-errors');
var scheduler = require('../lib/scheduler.js');

/**
 * @swagger
 *
 * /v4/schedule:
 *   get:
 *     description: |
 *       Get all schedules.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Schedules successfully retrieved.
 *       500:
 *         description: Internal error.
 *
 */

/**
 * @swagger
 *
 * /v4/schedule/{scheduleId}:
 *   get:
 *     description: |
 *       Get a specific schedule.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID
 *         in: path
 *         required: true
 *         type: string
 *         example: e4b1c455-aa15-4a51-a9cf-c5e4cfc91339
 *     responses:
 *       200:
 *         description: Schedule successfully retrieved.
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondGET_schedule = function (req, res, next) {
    logRESTCall(req);

    // Is there a schedule ID passed along?
    if (req.params.scheduleId !== undefined) {
        // Return specific schedule, if it exists
        if (scheduler.existsSchedule(req.params.scheduleId)) {
            let sched = scheduler.getAllSchedules().find(item => item.id == req.params.scheduleId);
            res.send(sched);
        } else {
            res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Schedule ID ${req.params.scheduleId} not found.`));
        }
    } else {
        // Return all schedules
        res.send(scheduler.getAllSchedules());
    }

    next();
};


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
module.exports.respondPOST_schedule = function (req, res, next) {
    logRESTCall(req);

    try {
        let newSchedule = req.body;

        newSchedule.id = uuid.v4();
        newSchedule.created = new Date().toISOString();

        scheduler.addSchedule(newSchedule);
        res.send(201, newSchedule);
        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed adding new schedule ${JSON.stringify(req.body, null, 2)}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
    }

};

/**
 * @swagger
 *
 * /v4/schedule/{scheduleId}:
 *   delete:
 *     description: |
 *       Delete a schedule.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID
 *         in: path
 *         required: true
 *         type: string
 *         example: e4b1c455-aa15-4a51-a9cf-c5e4cfc91339
 *     responses:
 *       200:
 *         description: Schedule successfully deleted.
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondDELETE_schedule = function (req, res, next) {
    logRESTCall(req);

    try {
        globals.logger.debug('REST SCHEDULER: Deleting schdule with ID: ' + req.params.scheduleId);
        if (scheduler.deleteSchedule(req.params.scheduleId) == true) {
            // Delete succeeded
            res.send(`Deleted schedule ${req.params.scheduleId}`);
        } else {
            // Delete failed. Return error
            res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Delete for schedule ID ${req.params.scheduleId} failed.`));
        }
        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed deleting schedule ${req.params.scheduleId}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/schedulestart/{scheduleId}:
 *   post:
 *     description: |
 *       Start a schedule.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID
 *         in: path
 *         required: true
 *         type: string
 *         example: e4b1c455-aa15-4a51-a9cf-c5e4cfc91339
 *     responses:
 *       200:
 *         description: Schedule successfully started.
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPOST_scheduleStart = function (req, res, next) {
    logRESTCall(req);

    try {
        // Is there a schedule ID passed along?
        if (req.params.scheduleId !== undefined) {
            globals.logger.debug('REST SCHEDULER: Starting schedule ID: ' + req.params.scheduleId);
            if (scheduler.startSchedule(req.params.scheduleId) == true) {
                // Start succeeded
                res.send(`Started schedule ${req.params.scheduleId}`);
                globals.logger.info('REST SCHEDULER: Started schedule ID: ' + req.params.scheduleId);
            } else {
                // Start failed. Return error
                res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Failed starting schedule ID ${req.params.scheduleId}.`));
                globals.logger.info('REST SCHEDULER: Failed starting schedule ID: ' + req.params.scheduleId);
            }
        } else {
            // Start all schedules
            globals.configSchedule.forEach(item => scheduler.startSchedule(item.id));
            res.send('Started all schedules');
            globals.logger.info('REST SCHEDULER: Started all schedules.');
        }

        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed starting schedule ${req.params.scheduleId}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/schedulestop/{scheduleId}:
 *   post:
 *     description: |
 *       Stop a schedule.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID
 *         in: path
 *         required: true
 *         type: string
 *         example: e4b1c455-aa15-4a51-a9cf-c5e4cfc91339
 *     responses:
 *       200:
 *         description: Schedule successfully stopped.
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPOST_scheduleStop = function (req, res, next) {
    logRESTCall(req);

    try {
        // Is there a schedule ID passed along?
        if (req.params.scheduleId !== undefined) {
            globals.logger.debug('REST SCHEDULER: Stoping schedule ID: ' + req.params.scheduleId);
            if (scheduler.stopSchedule(req.params.scheduleId) == true) {
                // Start succeeded
                res.send(`Stopped schedule ${req.params.scheduleId}`);
                globals.logger.info('REST SCHEDULER: Stopped schedule ID: ' + req.params.scheduleId);
            } else {
                // Start failed. Return error
                res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Failed stopping schedule ID ${req.params.scheduleId}.`));
                globals.logger.error('REST SCHEDULER: Failed stopping schedule ID: ' + req.params.scheduleId);
            }
        } else {
            // Stop all schedules
            globals.configSchedule.forEach(item => scheduler.stopSchedule(item.id));
            res.send('Stopped all schedules');
            globals.logger.info('REST SCHEDULER: Stopped all schedules.');
        }

        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed stopping schedule ${req.params.scheduleId}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
    }
};
