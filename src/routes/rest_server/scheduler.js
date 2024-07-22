import httpErrors from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import {
    getSchedulesStatus,
    existsSchedule,
    getAllSchedules,
    addSchedule,
    deleteSchedule,
    startSchedule,
    stopSchedule,
    getSchedule,
    startAllSchedules,
    stopAllSchedules,
} from '../../lib/scheduler.js';

import {
    apiGETSchedules,
    apiPOSTSchedules,
    apiDELETESchedules,
    apiPUTSchedulesStart,
    apiPUTSchedulesStartAll,
    apiPUTSchedulesStop,
    apiPUTSchedulesStopAll,
    apiGETSchedulerStatus,
} from '../../api/scheduler.js';

async function handlerGETSchedules(request, reply) {
    try {
        logRESTCall(request);

        // Is there a schedule ID passed along?
        if (request.query.id !== undefined) {
            // Return specific schedule, if it exists
            // Schedule should be returned in array, even though only one schedule is returned
            if (existsSchedule(request.query.id)) {
                const sched = getAllSchedules().find((item) => item.id === request.query.id);

                reply.code(200).send(JSON.stringify([sched]));
            } else {
                reply.send(httpErrors(400, `REST SCHEDULER: Schedule ID ${request.query.id} not found.`));
            }
        } else {
            // Return all schedules
            reply.code(200).send(getAllSchedules());
        }
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed retrieving schedule with ID ${request.query.id}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed retrieving schedule'));
    }
}

async function handlerPOSTSchedules(request, reply) {
    try {
        logRESTCall(request);

        const newSchedule = request.body;

        newSchedule.id = uuidv4();
        newSchedule.created = new Date().toISOString();

        addSchedule(newSchedule);

        reply.code(201).send(JSON.stringify(newSchedule));
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed adding new schedule ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed adding new schedule'));
    }
}

async function handlerDELETESchedules(request, reply) {
    try {
        logRESTCall(request);

        globals.logger.debug(`REST SCHEDULER: Deleting schdule with ID: ${request.params.scheduleId}`);
        if (deleteSchedule(request.params.scheduleId) === true) {
            // Delete succeeded
            reply.code(204).send();
        } else {
            // Delete failed. Return error
            reply.send(httpErrors(400, `REST SCHEDULER: Delete for schedule ID ${request.params.scheduleId} failed.`));
        }
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed deleting schedule ${request.params.scheduleId}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed deleting schedule'));
    }
}

async function handlerPUTSchedulesStart(request, reply) {
    try {
        logRESTCall(request);

        // Is there a schedule ID passed along?
        if (request.params.scheduleId !== undefined && request.params.scheduleId !== '') {
            globals.logger.debug(`REST SCHEDULER: Starting schedule ID: ${request.params.scheduleId}`);

            if (startSchedule(request.params.scheduleId) === true) {
                // Start succeeded

                const schedule = getSchedule(request.params.scheduleId);
                globals.logger.info(`REST SCHEDULER: Started schedule ID: ${request.params.scheduleId}`);
                // reply.code(200).send(JSON.stringify([request.params.scheduleId]));
                reply.code(200).send(JSON.stringify([schedule]));
            } else {
                // Start failed. Return error
                globals.logger.info(`REST SCHEDULER: Failed starting schedule ID: ${request.params.scheduleId}`);
                reply.send(httpErrors(400, `REST SCHEDULER: Failed starting schedule ID ${request.params.scheduleId}.`));
            }
        } else {
            // Start all schedules
            await startAllSchedules();

            globals.logger.info('REST SCHEDULER: Started all schedules.');
            reply.code(200).send(JSON.stringify(getAllSchedules()));
        }
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed starting schedule ${request.params.scheduleId}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed starting schedule'));
    }
}

async function handlerPUTSchedulesStop(request, reply) {
    try {
        logRESTCall(request);

        // Is there a schedule ID passed along?
        if (request.params.scheduleId !== undefined && request.params.scheduleId !== '') {
            globals.logger.debug(`REST SCHEDULER: Stopping schedule ID: ${request.params.scheduleId}`);

            if (stopSchedule(request.params.scheduleId) === true) {
                // Stop succeeded
                globals.logger.info(`REST SCHEDULER: Stopped schedule ID: ${request.params.scheduleId}`);
                reply.code(200).send(JSON.stringify([getSchedule(request.params.scheduleId)]));
            } else {
                // Stop failed. Return error
                globals.logger.error(`REST SCHEDULER: Failed stopping schedule ID: ${request.params.scheduleId}`);
                reply.send(httpErrors(400, `REST SCHEDULER: Failed stopping schedule ID ${request.params.scheduleId}.`));
            }
        } else {
            // Stop all schedules
            await stopAllSchedules();

            globals.logger.info('REST SCHEDULER: Stopped all schedules.');
            reply.code(200).send(JSON.stringify(getAllSchedules()));
        }
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed stopping schedule ${request.params.scheduleId}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed stopping schedule'));
    }
}

async function handlerGETSchedulesStatus(request, reply) {
    try {
        logRESTCall(request);

        // const status = scheduler.cronManager.listCrons();
        const status = getSchedulesStatus();
        reply.code(200).send(status);
    } catch (err) {
        globals.logger.error(`REST SCHEDULER: Failed retrieving scheduler status, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed retrieving scheduler status'));
    }
}

// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.getSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.getSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/schedules');
        fastify.get('/v4/schedules', apiGETSchedules, handlerGETSchedules);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.createNewSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.createNewSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/schedules');
        fastify.post('/v4/schedules', apiPOSTSchedules, handlerPOSTSchedules);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.deleteSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.deleteSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint DELETE /v4/schedules/:scheduleId');
        fastify.delete('/v4/schedules/:scheduleId', apiDELETESchedules, handlerDELETESchedules);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.startSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.startSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/schedules/:scheduleId/start');
        fastify.put('/v4/schedules/:scheduleId/start', apiPUTSchedulesStart, handlerPUTSchedulesStart);

        // Start all schedules
        fastify.put('/v4/schedules/startall', apiPUTSchedulesStartAll, handlerPUTSchedulesStart);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.stopSchedule') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.stopSchedule')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/schedules/:scheduleId/stop');
        fastify.put('/v4/schedules/:scheduleId/stop', apiPUTSchedulesStop, handlerPUTSchedulesStop);

        // Stop all schedules
        fastify.put('/v4/schedules/stopall', apiPUTSchedulesStopAll, handlerPUTSchedulesStop);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.scheduler.getScheduleStatusAll') &&
        globals.config.get('Butler.restServerEndpointsEnable.scheduler.getScheduleStatusAll')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/schedules/status');
        fastify.get('/v4/schedules/status', apiGETSchedulerStatus, handlerGETSchedulesStatus);
    }
};
