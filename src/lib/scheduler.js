var globals = require('../globals');
var qrsUtil = require('../qrsUtil');
const fs = require('fs');
const yaml = require('js-yaml');

const CronJobManager = require('cron-job-manager');
var cronManager = new CronJobManager();
// const cron = require('node-cron');

function saveSchedulesToDisk() {
    // First add a top level for readability
    let diskSchedule = yaml.safeDump({ butlerSchedule: globals.configSchedule }, 4);
    fs.writeFileSync(globals.config.get('Butler.scheduler.configfile'), diskSchedule, 'utf8');
}

function loadSchedulesFromDisk() {
    // Load scheduler config, if available
    try {
        if (globals.config.has('Butler.scheduler')) {
            if (globals.config.get('Butler.scheduler.enable') == true) {
                let scheduleFile = globals.config.get('Butler.scheduler.configfile');
                let tmpScheduleArray = yaml.safeLoad(fs.readFileSync(scheduleFile, 'utf8')).butlerSchedule;

                // Create schedules, incl cron jobs for all schedules
                tmpScheduleArray.forEach(element => {
                    addSchedule(element);
                });

                globals.logger.info('SCHEDULER: Successfully loaded schedule from file.');
                globals.logger.debug(`SCHEDULER: Loaded schedules: ${JSON.stringify(globals.configSchedule, null, 2)}`);
            }
        }
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed loading schedules from file: ${err}`);
    }
}

// Start all currently defined schedules
function startAllSchedules() {
    globals.logger.debug('SCHEDULER: Starting all schedules');

    try {
        globals.configSchedule.forEach(element => {
            cronManager.start(element.id.toString());
        });
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed starting all schedules: ${err}`);
    }
}

// Stop all currently defined schedules
function stopAllSchedules() {
    globals.logger.debug('SCHEDULER: Stopping all schedules');

    try {
        globals.configSchedule.forEach(element => {
            cronManager.stop(element.id.toString());
        });
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed stopping all schedules: ${err}`);
    }
}

// Get array with all schedules
function getAllSchedules() {
    globals.logger.debug('SCHEDULER: Getting all schedules');

    return globals.configSchedule;
}

// Get object with a single schedule
function getSchedule(scheduleId) {
    globals.logger.debug('SCHEDULER: Getting schedule');

    return globals.configSchedule.find(item => item.id == scheduleId);
}

// Add cron entry for schedule
function addCronEntry(newSchedule) {
    cronManager.add(
        newSchedule.id.toString(),
        newSchedule.cronSchedule,
        () => {
            qrsUtil.senseStartTask.senseStartTask(newSchedule.qlikSenseTaskId);

            globals.logger.info(`SCHEDULER: Cron event for schedule ID ${newSchedule.id.toString()}: ${newSchedule.name}`);
        },
        {
            start: newSchedule.startupState == 'started' || newSchedule.startupState == 'start' ? true : false,
            timeZone: newSchedule.timeZone,
        },
    );
}

// Add new schedule
function addSchedule(newSchedule) {
    try {
        globals.logger.debug(`SCHEDULER: Adding new schedule: ${JSON.stringify(newSchedule, null, 2)}`);

        globals.configSchedule.push(newSchedule);

        newSchedule.lastKnownState = newSchedule.startupState == 'started' || newSchedule.startupState == 'start' ? 'started' : 'stopped';

        // Persist schedule to disk
        saveSchedulesToDisk();

        // Add schedule to cron manager
        addCronEntry(newSchedule);
        // startSchedule(newSchedule.id);

        globals.logger.verbose(`SCHEDULER: Added new schedule: ${JSON.stringify(newSchedule, null, 2)}`);
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed adding new schedule ${JSON.stringify(newSchedule, null, 2)}: ${JSON.stringify(err, null, 2)}`);
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

            globals.logger.debug('SCHEDULER: Schedules after delete: ' + JSON.stringify(newSchedules, null, 2));

            globals.configSchedule = newSchedules;

            // Stop and delete cron job
            cronManager.deleteJob(deleteScheduleId.toString());

            // Persist schedule to disk
            saveSchedulesToDisk();

            return true;
        } else {
            return false;
        }
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed deleting schedule ${deleteScheduleId}: ${JSON.stringify(err, null, 2)}`);
    }
}

// Does a particular schedule exist?
function existsSchedule(scheduleId) {
    // Does the schedule ID exist?
    let idExists = globals.configSchedule.find(item => item.id == scheduleId) == undefined ? false : true;
    globals.logger.debug(`SCHEDULER: Does schedule id ${scheduleId} exist: ${JSON.stringify(idExists, null, 2)}`);

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
        globals.configSchedule.find(item => item.id == scheduleId).lastKnownState = 'started';

        // Persist schedule to disk
        saveSchedulesToDisk();

        return true;
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed starting schedule ID ${scheduleId}: ${JSON.stringify(err, null, 2)}`);
    }
}

function stopSchedule(scheduleId) {
    try {
        cronManager.stop(scheduleId.toString());

        // Set schedule status
        globals.configSchedule.find(item => item.id == scheduleId).lastKnownState = 'stopped';

        // Persist schedule to disk
        saveSchedulesToDisk();

        return true;
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed stopping schedule ID ${scheduleId}: ${JSON.stringify(err, null, 2)}`);
    }
}

module.exports = {
    loadSchedulesFromDisk,
    startAllSchedules,
    stopAllSchedules,
    startSchedule,
    stopSchedule,
    getAllSchedules,
    addSchedule,
    getSchedule,
    deleteSchedule,
    existsSchedule,
};
