import fs from 'fs';
import yaml from 'js-yaml';
import CronJobManager from 'cron-job-manager';
import globals from '../globals.js';
import senseStartTask from '../qrs_util/sense_start_task.js';

const cronManager = new CronJobManager();

function saveSchedulesToDisk() {
    // First add a top level for readability
    const diskSchedule = yaml.dump({ butlerSchedule: globals.configSchedule }, 4);
    fs.writeFileSync(globals.config.get('Butler.scheduler.configfile'), diskSchedule, 'utf8');
}

// Add cron entry for schedule
function addCronEntry(newSchedule) {
    cronManager.add(
        newSchedule.id.toString(),
        newSchedule.cronSchedule,
        () => {
            globals.logger.info(`SCHEDULER: Cron event for schedule ID ${newSchedule.id.toString()}: ${newSchedule.name}`);
            senseStartTask(newSchedule.qlikSenseTaskId);
        },
        {
            start:
                // eslint-disable-next-line no-unneeded-ternary
                newSchedule.startupState === 'started' || newSchedule.startupState === 'start' ? true : false,
            timeZone: newSchedule.timeZone,
        }
    );
}

// Add new schedule
export function addSchedule(newSchedule) {
    try {
        globals.logger.debug(`SCHEDULER: Adding new schedule: ${JSON.stringify(newSchedule, null, 2)}`);

        globals.configSchedule.push(newSchedule);

        // eslint-disable-next-line no-param-reassign
        newSchedule.lastKnownState = newSchedule.startupState === 'started' || newSchedule.startupState === 'start' ? 'started' : 'stopped';

        // Persist schedule to disk
        saveSchedulesToDisk();

        // Add schedule to cron manager
        addCronEntry(newSchedule);
        // startSchedule(newSchedule.id);

        globals.logger.verbose(`SCHEDULER: Added new schedule: ${JSON.stringify(newSchedule, null, 2)}`);
    } catch (err) {
        globals.logger.error(
            `SCHEDULER: Failed adding new schedule ${JSON.stringify(newSchedule, null, 2)}: ${JSON.stringify(err, null, 2)}`
        );
    }
}

export function loadSchedulesFromDisk() {
    // Load scheduler config, if available
    try {
        if (globals.config.has('Butler.scheduler')) {
            if (globals.config.get('Butler.scheduler.enable') === true) {
                const scheduleFile = globals.config.get('Butler.scheduler.configfile');
                const tmpScheduleArray = yaml.load(fs.readFileSync(scheduleFile, 'utf8')).butlerSchedule;

                // Create schedules, incl cron jobs for all schedules
                tmpScheduleArray.forEach((element) => {
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
export function startAllSchedules() {
    return new Promise((resolve, reject) => {
        globals.logger.debug('SCHEDULER: Starting all schedules');

        try {
            // eslint-disable-next-line no-restricted-syntax
            for (const element of globals.configSchedule) {
                cronManager.start(element.id.toString());
                element.lastKnownState = 'started'; // Set schedule status
            }

            // Persist schedule to disk
            saveSchedulesToDisk();
            resolve();
        } catch (err) {
            globals.logger.error(`SCHEDULER: Failed starting all schedules: ${err}`);
            reject();
        }
    });
}

// Stop all currently defined schedules
export function stopAllSchedules() {
    return new Promise((resolve, reject) => {
        globals.logger.debug('SCHEDULER: Stopping all schedules');

        try {
            // eslint-disable-next-line no-restricted-syntax
            for (const element of globals.configSchedule) {
                cronManager.stop(element.id.toString());
                element.lastKnownState = 'stopped'; // Set schedule status
            }

            // Persist schedule to disk
            saveSchedulesToDisk();
            resolve();
        } catch (err) {
            globals.logger.error(`SCHEDULER: Failed stopping all schedules: ${err}`);
            reject();
        }
    });
}

// Get schedule statuses
export function getSchedulesStatus() {
    globals.logger.debug('SCHEDULER: Getting all crons');

    const cronList = cronManager.listCrons();
    globals.logger.debug(`SCHEDULER: Cron list: ${JSON.stringify(cronList, null, 2)}`);

    return cronList;
}

// Get array with all schedules
export function getAllSchedules() {
    globals.logger.debug('SCHEDULER: Getting all schedules');

    return globals.configSchedule;
}

// Get object with a single schedule
export function getSchedule(scheduleId) {
    globals.logger.debug('SCHEDULER: Getting schedule');

    return globals.configSchedule.find((item) => item.id === scheduleId);
}

// Does a particular schedule exist?
export function existsSchedule(scheduleId) {
    // Does the schedule ID exist?
    const idExists = globals.configSchedule.find((item) => item.id === scheduleId) !== undefined;
    globals.logger.debug(`SCHEDULER: Does schedule id ${scheduleId} exist: ${JSON.stringify(idExists, null, 2)}`);

    if (idExists) {
        // Id exists among current schedules
        return true;
    }
    return false;
}

// Delete a schedule
export function deleteSchedule(deleteScheduleId) {
    try {
        globals.logger.debug(`SCHEDULER: Deleting schedule with ID: ${deleteScheduleId}`);

        // Does the schedule ID exist?
        if (existsSchedule(deleteScheduleId)) {
            // Remove the  schedule
            const newSchedules = globals.configSchedule.filter((item) => item.id !== deleteScheduleId);

            globals.logger.debug(`SCHEDULER: Schedules after delete: ${JSON.stringify(newSchedules, null, 2)}`);

            globals.configSchedule = newSchedules;

            // Stop and delete cron job
            cronManager.deleteJob(deleteScheduleId.toString());

            // Persist schedule to disk
            saveSchedulesToDisk();

            return true;
        }
        return false;
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed deleting schedule ${deleteScheduleId}: ${JSON.stringify(err, null, 2)}`);
        return false;
    }
}

export function startSchedule(scheduleId) {
    try {
        cronManager.start(scheduleId.toString());

        // Set schedule status
        globals.configSchedule.find((item) => item.id === scheduleId).lastKnownState = 'started';

        // Persist schedule to disk
        saveSchedulesToDisk();

        return true;
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed starting schedule ID ${scheduleId}: ${JSON.stringify(err, null, 2)}`);
        return false;
    }
}

export function stopSchedule(scheduleId) {
    try {
        cronManager.stop(scheduleId.toString());

        // Set schedule status
        globals.configSchedule.find((item) => item.id === scheduleId).lastKnownState = 'stopped';

        // Persist schedule to disk
        saveSchedulesToDisk();

        return true;
    } catch (err) {
        globals.logger.error(`SCHEDULER: Failed stopping schedule ID ${scheduleId}: ${JSON.stringify(err, null, 2)}`);
        return false;
    }
}
