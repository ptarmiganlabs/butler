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
 * /v4/schedules:
 *   get:
 *     description: |
 *       Get all information available for existing schedule(s).
 *
 *       If a schedule ID is specified using a query parameter (and there exists a schedule with that ID), information about that sschedule will be returned.
 *       If no schedule ID is specified, all schedules will be returned.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID
 *         in: query
 *         required: true
 *         type: string
 *         example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *     responses:
 *       200:
 *         description: Schedule successfully retrieved.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Schedule ID.
 *                 example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *               created:
 *                 type: string
 *                 description: Timestamp when schedule was created
 *                 example: "2020-09-29T14:29:12.283Z"
 *               name:
 *                 type: string
 *                 description: Schedule name.
 *                 example: "Reload sales metrics"
 *               cronSchedule:
 *                 type: string
 *                 description: |
 *                   5 or 6 position cron schedule.
 *
 *                   If 6 positions used, the leftmost position represent seconds.
 *                   If 5 positions used, leftmost position is minutes.
 *
 *                   The example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.
 *                 example: "0,30 6 * * 1-5"
 *               timezone:
 *                 type: string
 *                 description: Time zone the schedule should use. Ex "Europe/Stockholm".
 *                 example: "Europe/Stockholm"
 *               qlikSenseTaskId:
 *                 type: string
 *                 description: ID of Qlik Sense task that should be started when schedule triggers.
 *                 example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *               startupState:
 *                 type: string
 *                 enum: [start, started, stop, stopped]
 *                 description: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *                 example: "started"
 *               tags:
 *                 type: array
 *                 description: Can be used to categorise schedules.
 *                 items:
 *                   type: integer
 *                 minItems: 0
 *                 example: ["tag 1", "tag 2"]
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */

module.exports.respondGET_schedules = function (req, res, next) {
    logRESTCall(req);

    try {
        // Is there a schedule ID passed along?
        if (req.query.scheduleId !== undefined) {
            // Return specific schedule, if it exists
            if (scheduler.existsSchedule(req.query.scheduleId)) {
                let sched = scheduler.getAllSchedules().find(item => item.id == req.query.scheduleId);
                res.send(sched);
            } else {
                res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Schedule ID ${req.query.scheduleId} not found.`));
            }
        } else {
            // Return all schedules
            res.send(scheduler.getAllSchedules());
        }

        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed retrieving schedule with ID ${req.query.scheduleId}.`);
        res.send(new errors.InternalError({}, 'Failed retrieving schedule'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/schedules:
 *   post:
 *     description: |
 *       Create a new schedule.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: |
 *           Template used to create new schedule objects.
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
 *               example: "Reload sales metrics"
 *             cronSchedule:
 *               type: string
 *               description: 5 or 6 position cron schedule. If 6 positions used, the leftmost position represent seconds. If 5 positions used, leftmost position is minutes. Example will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.
 *               example: "0,30 6 * * 1-5"
 *             timezone:
 *               type: string
 *               description: Time zone the schedule should use. Ex "Europe/Stockholm".
 *               example: "Europe/Stockholm"
 *             qlikSenseTaskId:
 *               type: string
 *               description: ID of Qlik Sense task that should be started when schedule triggers.
 *               example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *             startupState:
 *               type: string
 *               enum: [start, started, stop, stopped]
 *               description: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *               example: "started"
 *             tags:
 *               type: array
 *               description: Can be used to categorise schedules.
 *               items:
 *                 type: integer
 *               minItems: 0
 *               example: ["tag 1", "tag 2"]
 *     responses:
 *       201:
 *         description: Schedule created.
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: ID of the created schedule.
 *               example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *             created:
 *               type: string
 *               description: Timestamp when the schedule was created
 *               example: "2020-09-29T14:29:12.283Z"
 *             name:
 *               type: string
 *               description: Descriptive name for the schedule
 *               example: "Reload sales metrics"
 *             cronSchedule:
 *               type: string
 *               description: 5 or 6 position cron schedule. If 6 positions used, the leftmost position represent seconds. If 5 positions used, leftmost position is minutes. Example will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.
 *               example: "0,30 6 * * 1-5"
 *             timezone:
 *               type: string
 *               description: Time zone the schedule should use. Ex "Europe/Stockholm".
 *               example: "Europe/Stockholm"
 *             qlikSenseTaskId:
 *               type: string
 *               description: ID of Qlik Sense task that should be started when schedule triggers.
 *               example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *             startupState:
 *               type: string
 *               enum: [start, started, stop, stopped]
 *               description: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *               example: "started"
 *             tags:
 *               type: array
 *               description: Can be used to categorise schedules.
 *               items:
 *                 type: integer
 *               minItems: 0
 *               example: ["tag 1", "tag 2"]
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPOST_schedules = function (req, res, next) {
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
        res.send(new errors.InternalError({}, 'Failed adding new schedule'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/schedules/{scheduleId}:
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
 *         example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *     responses:
 *       204:
 *         description: Schedule successfully deleted.
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondDELETE_schedules = function (req, res, next) {
    logRESTCall(req);

    try {
        globals.logger.debug('REST SCHEDULER: Deleting schdule with ID: ' + req.params.scheduleId);
        if (scheduler.deleteSchedule(req.params.scheduleId) == true) {
            // Delete succeeded
            res.send(204);
        } else {
            // Delete failed. Return error
            res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Delete for schedule ID ${req.params.scheduleId} failed.`));
        }
        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed deleting schedule ${req.params.scheduleId}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed deleting schedule'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/schedules/{scheduleId}/start:
 *   put:
 *     description: |
 *       Start a schedule.
 * 
 *       Skip the schedule ID and all schedules will be started.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID. If not provided, all schedules will be started.
 *         in: path
 *         required: false
 *         type: string
 *         example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *     responses:
 *       200:
 *         description: |
 *           Schedule successfully started.
 * 
 *           An array with all inforomation about all started schedules is returned.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Schedule ID.
 *                 example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *               created:
 *                 type: string
 *                 description: Timestamp when schedule was created
 *                 example: "2020-09-29T14:29:12.283Z"
 *               name:
 *                 type: string
 *                 description: Schedule name.
 *                 example: "Reload sales metrics"
 *               cronSchedule:
 *                 type: string
 *                 description: |
 *                   5 or 6 position cron schedule.
 *
 *                   If 6 positions used, the leftmost position represent seconds.
 *                   If 5 positions used, leftmost position is minutes.
 *
 *                   The example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.
 *                 example: "0,30 6 * * 1-5"
 *               timezone:
 *                 type: string
 *                 description: Time zone the schedule should use. Ex "Europe/Stockholm".
 *                 example: "Europe/Stockholm"
 *               qlikSenseTaskId:
 *                 type: string
 *                 description: ID of Qlik Sense task that should be started when schedule triggers.
 *                 example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *               startupState:
 *                 type: string
 *                 enum: [start, started, stop, stopped]
 *                 description: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *                 example: "started"
 *               tags:
 *                 type: array
 *                 description: Can be used to categorise schedules.
 *                 items:
 *                   type: integer
 *                 minItems: 0
 *                 example: ["tag 1", "tag 2"]
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_schedulesStart = function (req, res, next) {
    logRESTCall(req);

    try {
        // Is there a schedule ID passed along?
        if (req.params.scheduleId !== undefined) {
            globals.logger.debug('REST SCHEDULER: Starting schedule ID: ' + req.params.scheduleId);
            if (scheduler.startSchedule(req.params.scheduleId) == true) {
                // Start succeeded
                res.send(200, [scheduler.getSchedule(req.params.scheduleId)]);
                globals.logger.info('REST SCHEDULER: Started schedule ID: ' + req.params.scheduleId);
            } else {
                // Start failed. Return error
                res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Failed starting schedule ID ${req.params.scheduleId}.`));
                globals.logger.info('REST SCHEDULER: Failed starting schedule ID: ' + req.params.scheduleId);
            }
        } else {
            // Start all schedules
            globals.configSchedule.forEach(item => scheduler.startSchedule(item.id));
            res.send(200, scheduler.getAllSchedules());
            globals.logger.info('REST SCHEDULER: Started all schedules.');
        }

        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed starting schedule ${req.params.scheduleId}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed starting schedule'));
        next();
    }
};


/**
 * @swagger
 *
 * /v4/schedules{scheduleId}/stop:
 *   put:
 *     description: |
 *       Stop a schedule.

 *       Skip the schedule ID and all schedules will be stopped.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID. If not provided, all schedules will be stopped.
 *         in: path
 *         required: false
 *         type: string
 *         example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *     responses:
 *       200:
 *         description: |
 *           Schedule successfully stopped.
 * 
 *           An array with all inforomation about all stopped schedules is returned.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Schedule ID.
 *                 example: "e4b1c455-aa15-4a51-a9cf-c5e4cfc91339"
 *               created:
 *                 type: string
 *                 description: Timestamp when schedule was created
 *                 example: "2020-09-29T14:29:12.283Z"
 *               name:
 *                 type: string
 *                 description: Schedule name.
 *                 example: "Reload sales metrics"
 *               cronSchedule:
 *                 type: string
 *                 description: |
 *                   5 or 6 position cron schedule.
 *
 *                   If 6 positions used, the leftmost position represent seconds.
 *                   If 5 positions used, leftmost position is minutes.
 *
 *                   The example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.
 *                 example: "0,30 6 * * 1-5"
 *               timezone:
 *                 type: string
 *                 description: Time zone the schedule should use. Ex "Europe/Stockholm".
 *                 example: "Europe/Stockholm"
 *               qlikSenseTaskId:
 *                 type: string
 *                 description: ID of Qlik Sense task that should be started when schedule triggers.
 *                 example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *               startupState:
 *                 type: string
 *                 enum: [start, started, stop, stopped]
 *                 description: If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.
 *                 example: "started"
 *               tags:
 *                 type: array
 *                 description: Can be used to categorise schedules.
 *                 items:
 *                   type: integer
 *                 minItems: 0
 *                 example: ["tag 1", "tag 2"] 
 *       404:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_schedulesStop = function (req, res, next) {
    logRESTCall(req);

    try {
        // Is there a schedule ID passed along?
        if (req.params.scheduleId !== undefined) {
            globals.logger.debug('REST SCHEDULER: Stoping schedule ID: ' + req.params.scheduleId);
            if (scheduler.stopSchedule(req.params.scheduleId) == true) {
                // Start succeeded
                res.send(200, [scheduler.getSchedule(req.params.scheduleId)]);
                globals.logger.info('REST SCHEDULER: Stopped schedule ID: ' + req.params.scheduleId);
            } else {
                // Start failed. Return error
                res.send(new errors.ResourceNotFoundError({}, `REST SCHEDULER: Failed stopping schedule ID ${req.params.scheduleId}.`));
                globals.logger.error('REST SCHEDULER: Failed stopping schedule ID: ' + req.params.scheduleId);
            }
        } else {
            // Stop all schedules
            globals.configSchedule.forEach(item => scheduler.stopSchedule(item.id));
            res.send(200, scheduler.getAllSchedules());
            globals.logger.info('REST SCHEDULER: Stopped all schedules.');
        }

        next();
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed stopping schedule ${req.params.scheduleId}: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed stopping schedule'));
        next();
    }
};
