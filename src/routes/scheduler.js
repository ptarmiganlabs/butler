'use strict';

const httpErrors = require('http-errors');
const uuid = require('uuid');

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
var scheduler = require('../lib/scheduler.js');



module.exports = async function (fastify, options) {
    if (globals.config.has('Butler.scheduler.enable') && globals.config.get('Butler.scheduler.enable')) {
        if (
            globals.config.has('Butler.restServerEndpointsEnable.scheduler.createNewSchedule') &&
            globals.config.get('Butler.restServerEndpointsEnable.scheduler.createNewSchedule')
        ) {
            globals.logger.debug('Registering REST endpoint POST /v4/schedules');
            fastify.post('/v4/schedules', handlerPOSTSchedules);
        }

        if (
            globals.config.has('Butler.restServerEndpointsEnable.scheduler.getSchedule') &&
            globals.config.get('Butler.restServerEndpointsEnable.scheduler.getSchedule')
        ) {
            globals.logger.debug('Registering REST endpoint GET /v4/schedules');
            fastify.get('/v4/schedules', handlerGETSchedules);
        }

        if (
            globals.config.has('Butler.restServerEndpointsEnable.scheduler.deleteSchedule') &&
            globals.config.get('Butler.restServerEndpointsEnable.scheduler.deleteSchedule')
        ) {
            globals.logger.debug('Registering REST endpoint DELETE /v4/schedules');
            fastify.delete('/v4/schedules/:scheduleId', handlerDELETESchedules);
        }

        if (
            globals.config.has('Butler.restServerEndpointsEnable.scheduler.startSchedule') &&
            globals.config.get('Butler.restServerEndpointsEnable.scheduler.startSchedule')
        ) {
            globals.logger.debug('Registering REST endpoint POST /v4/schedulestart');
            fastify.put('/v4/schedules/:scheduleId/start', handlerPUTSchedulesStart);
        }

        if (
            globals.config.has('Butler.restServerEndpointsEnable.scheduler.stopSchedule') &&
            globals.config.get('Butler.restServerEndpointsEnable.scheduler.stopSchedule')
        ) {
            globals.logger.debug('Registering REST endpoint POST /v4/schedulestop');
            fastify.put('/v4/schedules/:scheduleId/stop', handlerPUTSchedulesStop);
        }
    }
}




/**
 * @swagger
 *
 * /v4/schedules:
 *   get:
 *     description: |
 *       Get all information available for existing schedule(s).
 *
 *       If a schedule ID is specified using a query parameter (and there exists a schedule with that ID), information about that schedule will be returned.
 *       If no schedule ID is specified, all schedules will be returned.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: id
 *         description: Schedule ID
 *         in: query
 *         required: false
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
 *               lastKnownState:
 *                 type: string
 *                 description: Last known state (started/stopped) for the schedule.
 *                 example: started
 *       400:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerGETSchedules(request, reply) {
    try {
        logRESTCall(request);

        // Is there a schedule ID passed along?
        if (request.query.id !== undefined) {
            // Return specific schedule, if it exists
            if (scheduler.existsSchedule(request.query.id)) {
                let sched = scheduler.getAllSchedules().find(item => item.id == request.query.id);

                reply
                    .code(200)
                    .send(sched);
            } else {
                reply.send(httpErrors(400, `REST SCHEDULER: Schedule ID ${request.query.id} not found.`));
            }
        } else {
            // Return all schedules
            reply
                .code(200)
                .send(scheduler.getAllSchedules());
        }
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed retrieving schedule with ID ${request.query.id}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed retrieving schedule'));
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
async function handlerPOSTSchedules(request, reply) {
    try {
        logRESTCall(request);

        let newSchedule = request.body;

        newSchedule.id = uuid.v4();
        newSchedule.created = new Date().toISOString();

        scheduler.addSchedule(newSchedule);

        reply
            .code(200)
            .send(newSchedule);
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed adding new schedule ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed adding new schedule'));
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
 *       400:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerDELETESchedules(request, reply) {
    try {
        logRESTCall(request);

        globals.logger.debug('REST SCHEDULER: Deleting schdule with ID: ' + request.params.scheduleId);
        if (scheduler.deleteSchedule(request.params.scheduleId) == true) {
            // Delete succeeded
            reply
                .code(204)
                .send();
        } else {
            // Delete failed. Return error
            reply.send(httpErrors(400, `REST SCHEDULER: Delete for schedule ID ${request.params.scheduleId} failed.`));
        }
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed deleting schedule ${request.params.scheduleId}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed deleting schedule'));
    }
};

/**
 * @swagger
 *
 * /v4/schedules/{scheduleId}/start:
 *   put:
 *     description: |
 *       Start a schedule, i.e. have the scheduler run the associated reload task according to the schedule's cron settings.
 * 
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID.
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
 *       400:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerPUTSchedulesStart(request, reply) {
    try {
        logRESTCall(request);

        // Is there a schedule ID passed along?
        if (request.params.scheduleId !== undefined) {
            globals.logger.debug('REST SCHEDULER: Starting schedule ID: ' + request.params.scheduleId);

            if (scheduler.startSchedule(request.params.scheduleId) == true) {
                // Start succeeded
                globals.logger.info('REST SCHEDULER: Started schedule ID: ' + request.params.scheduleId);
                reply
                    .code(200)
                    .send([scheduler.getSchedule(request.params.scheduleId)]);
            } else {
                // Start failed. Return error
                globals.logger.info('REST SCHEDULER: Failed starting schedule ID: ' + request.params.scheduleId);
                reply.send(httpErrors(400, `REST SCHEDULER: Failed starting schedule ID ${request.params.scheduleId}.`));
            }
        } else {
            // Start all schedules
            globals.configSchedule.forEach(item => scheduler.startSchedule(item.id));

            globals.logger.info('REST SCHEDULER: Started all schedules.');
            reply
                .code(200)
                .send(scheduler.getAllSchedules());
        }
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed starting schedule ${request.params.scheduleId}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed starting schedule'));
    }
};


/**
 * @swagger
 *
 * /v4/schedules/{scheduleId}/stop:
 *   put:
 *     description: |
 *       Stop a schedule, i.e. tell the scheduler to no longer execute the schedule according to its cron settings.
 *
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: scheduleId
 *         description: Schedule ID.
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
 *       400:
 *         description: Schedule not found.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerPUTSchedulesStop(request, reply) {
    try {
        logRESTCall(request);

        // Is there a schedule ID passed along?
        if (request.params.scheduleId !== undefined) {
            globals.logger.debug('REST SCHEDULER: Stoping schedule ID: ' + request.params.scheduleId);

            if (scheduler.stopSchedule(request.params.scheduleId) == true) {
                // Stop succeeded
                globals.logger.info('REST SCHEDULER: Stopped schedule ID: ' + request.params.scheduleId);
                reply
                    .code(200)
                    .send([scheduler.getSchedule(request.params.scheduleId)]);
            } else {
                // Stop failed. Return error
                globals.logger.error('REST SCHEDULER: Failed stopping schedule ID: ' + request.params.scheduleId);
                reply.send(httpErrors(400, `REST SCHEDULER: Failed stopping schedule ID ${request.params.scheduleId}.`));
            }
        } else {
            // Stop all schedules
            globals.configSchedule.forEach(item => scheduler.stopSchedule(item.id));

            globals.logger.info('REST SCHEDULER: Stopped all schedules.');
            reply
                .code(200)
                .send(scheduler.getAllSchedules());
        }
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed stopping schedule ${request.params.scheduleId}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed stopping schedule'));
    }
};
