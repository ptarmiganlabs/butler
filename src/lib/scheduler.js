var globals = require('../globals');
var qrsUtil = require('../qrsUtil');
const fs = require('fs');
const yaml = require('js-yaml');

const CronJobManager = require('cron-job-manager');
var cronManager = new CronJobManager();
// const cron = require('node-cron');

function loadSchedulesFromDisk() {
    // Load scheduler config, if available
    try {
        if (globals.config.has('Butler.scheduler')) {
            if (globals.config.get('Butler.scheduler.enable') == true) {
                let scheduleFile = globals.config.get('Butler.scheduler.configfile');
                let tmpScheduleArray = yaml.safeLoad(fs.readFileSync(scheduleFile, 'utf8'))
                    .butlerSchedule;

                // Create schedules, incl cron jobs for all schedules
                tmpScheduleArray.forEach(element => {
                    addSchedule(element);
                });

                globals.logger.info('SCHEDULER: Successfully loaded schedule from file.');
                globals.logger.debug(
                    `SCHEDULER: Loaded schedules: ${JSON.stringify(
                        globals.configSchedule,
                        null,
                        2,
                    )}`,
                );
            }
        }
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed loading schedules from file: ${err}`);
    }
}

// Launch all schedules that are currently defined
function launchAllSchedules() {
    globals.logger.debug('SCHEDULER: Launching all schedules');

    try {
        globals.configSchedule.forEach(element => {
            cronManager.start(element.id.toString());
        });
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed starting all schedules: ${err}`);
    }
}

// Get list of all schedules
function getAllSchedules() {
    globals.logger.debug('SCHEDULER: Getting all schedules');

    return globals.configSchedule;
}

// Add new schedule
function addSchedule(newSchedule) {
    try {
        globals.logger.debug(
            `SCHEDULER: Adding new schedule: ${JSON.stringify(newSchedule, null, 2)}`,
        );

        globals.configSchedule.push(newSchedule);

        // Persist schedule to disk
        // First add a top level for readability
        let diskSchedule = yaml.safeDump({ butlerSchedule: globals.configSchedule }, 4);
        fs.writeFileSync(globals.config.get('Butler.scheduler.configfile'), diskSchedule, 'utf8');

        startSchedule(newSchedule.id.toString());
        newSchedule.stateStarted = newSchedule.stateStartupStarted == true ? true : false;
    
        // Add schedule to cron manager
        cronManager.add(
            newSchedule.id.toString(),
            newSchedule.cronSchedule,
            () => {
                let schedule = newSchedule;
                qrsUtil.senseStartTask.senseStartTask(schedule.qlikSenseTaskId);
        
                globals.logger.info(`SCHEDULER: Firing schedule ID ${schedule.id.toString()}: ${schedule.name}`);
            },
            {
                start: newSchedule.stateStarted,
                timeZone: newSchedule.timeZone,
            },
        );

        globals.logger.verbose(`SCHEDULER: Added new schedule: ${diskSchedule}`);
    } catch (err) {
        globals.logger.error(
            `SCHEDULER: Failed adding new schedule ${JSON.stringify(
                newSchedule,
                null,
                2,
            )}: ${JSON.stringify(err, null, 2)}`,
        );
    }
}

// Delete a schedule
function deleteSchedule(deleteScheduleId) {
    try {
        globals.logger.debug(`SCHEDULER: Deleting schedule with ID: ${deleteScheduleId}`);

        // Does the schedule ID exist?
        if (existsSchedule(deleteScheduleId)) {
            // Remove the  schedule
            let newSchedules = globals.configSchedule.filter(item => item.id != deleteScheduleId);

            globals.logger.debug(
                'SCHEDULER: Schedules after delete: ' + JSON.stringify(newSchedules, null, 2),
            );

            globals.configSchedule = newSchedules;

            // Stop and delete cron job
            cronManager.deleteJob(deleteScheduleId.toString());

            // Persist schedule to disk
            // First add a top level for readability
            let diskSchedule = yaml.safeDump({ butlerSchedule: globals.configSchedule }, 4);
            fs.writeFileSync(
                globals.config.get('Butler.scheduler.configfile'),
                diskSchedule,
                'utf8',
            );

            return true;
        } else {
            return false;
        }
    } catch (err) {
        globals.logger.error(
            `SCHEDULER: Failed deleting schedule ${deleteScheduleId}: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
    }
}

// Does a particular schedule exist?
function existsSchedule(scheduleId) {
    // Does the schedule ID exist?
    let idExists =
        globals.configSchedule.find(item => item.id == scheduleId) == undefined ? false : true;
    globals.logger.debug(
        `SCHEDULER: Does schedule id ${scheduleId} exist: ${JSON.stringify(idExists, null, 2)}`,
    );

    if (idExists) {
        // Id exists among current schedules
        return true;
    } else {
        return false;
    }
}

function startSchedule(scheduleId) {
    try {
        cronManager.start(scheduleId.toString());

        // Set schedule status
        globals.configSchedule.find(item => item.id == scheduleId).stateStarted = true;

        return true;
    } catch (err) {
        globals.logger.error(
            `SCHEDULER: Failed starting schedule ID ${scheduleId}: ${JSON.stringify(err, null, 2)}`,
        );
    }
}

function stopSchedule(scheduleId) {
    try {
        cronManager.stop(scheduleId.toString());

        // Set schedule status
        globals.configSchedule.find(item => item.id == scheduleId).stateStarted = false;

        return true;
    } catch (err) {
        globals.logger.error(
            `SCHEDULER: Failed stopping schedule ID ${scheduleId}: ${JSON.stringify(err, null, 2)}`,
        );
    }
}

module.exports = {
    loadSchedulesFromDisk,
    launchAllSchedules,
    getAllSchedules,
    addSchedule,
    deleteSchedule,
    existsSchedule,
    startSchedule,
    stopSchedule,
};
