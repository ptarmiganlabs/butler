// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const uuid = require('uuid');
// const { configSchedule } = require('../globals');
const errors = require('restify-errors');
var scheduler = require('../lib/scheduler.js');


// Function for handling GET /schedule REST endpoint
module.exports.respondGET_schedule = function (req, res, next) {
    logRESTCall(req);

    // Is there a schedule ID passed along?
    if (req.params.scheduleId !== undefined) {
        // Return specific schedule, if it exists
        if (scheduler.existsSchedule(req.params.scheduleId)) {
            let sched = scheduler.getAllSchedules().find(item => item.id == req.params.scheduleId);
            res.send(sched);
        } else {
            res.send(
                new errors.ResourceNotFoundError(
                    {},
                    `REST SCHEDULER: Schedule ID ${req.params.scheduleId} not found.`,
                ),
            );
        }
    } else {
        // Return all schedules
        res.send(scheduler.getAllSchedules());
    }

    next();
};

// Function for handling POST /schedule REST endpoint
module.exports.respondPOST_schedule = function (req, res, next) {
    logRESTCall(req);

    let newSchedule = req.body;
    try {
        newSchedule.id = uuid.v4();
        newSchedule.created = new Date().toISOString();

        scheduler.addSchedule(newSchedule);
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed adding new schedule ${JSON.stringify(
                req.body,
                null,
                2,
            )}: ${JSON.stringify(err, null, 2)}`,
        );
    }

    res.send(newSchedule);
    next();
};

// Function for handling DELETE /schedule REST endpoint
module.exports.respondDELETE_schedule = function (req, res, next) {
    logRESTCall(req);

    try {
        globals.logger.debug('REST SCHEDULER: Deleting schdule with ID: ' + req.params.scheduleId);
        if (scheduler.deleteSchedule(req.params.scheduleId) == true) {
            // Delete succeeded
            res.send(`Deleted schedule ${req.params.scheduleId}`);
        } else {
            // Delete failed. Return error
            res.send(
                new errors.ResourceNotFoundError(
                    {},
                    `REST SCHEDULER: Delete for schedule ID ${req.params.scheduleId} failed.`,
                ),
            );
        }
        next();
    } catch (err) {
        globals.logger.error(
            `REST SCHEDULER: Failed deleting schedule ${req.params.scheduleId}: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
        next();
    }
};

// Function for handling POST /schedulestart REST endpoint
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
                res.send(
                    new errors.ResourceNotFoundError(
                        {},
                        `REST SCHEDULER: Failed starting schedule ID ${req.params.scheduleId}.`,
                    ),
                );
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
        globals.logger.error(
            `REST SCHEDULER: Failed starting schedule ${req.params.scheduleId}: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
        next();
    }
};

// Function for handling POST /schedulestop REST endpoint
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
                res.send(
                    new errors.ResourceNotFoundError(
                        {},
                        `REST SCHEDULER: Failed stopping schedule ID ${req.params.scheduleId}.`,
                    ),
                );
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
        globals.logger.error(
            `REST SCHEDULER: Failed stopping schedule ${req.params.scheduleId}: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
        next();
    }
};
