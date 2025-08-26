import fs from 'fs';
import yaml from 'js-yaml';
import CronJobManager from 'cron-job-manager';
import globals from '../globals.js';
import senseStartTask from '../qrs_util/sense_start_task.js';

const cronManager = new CronJobManager();

/**
 * Saves the current schedules to disk.
 */
function saveSchedulesToDisk() {
    // First add a top level for readability
    const diskSchedule = yaml.dump({ butlerSchedule: globals.configSchedule }, 4);
    fs.writeFileSync(globals.config.get('Butler.scheduler.configfile'), diskSchedule, 'utf8');
}

/**
 * Adds a cron entry for a new schedule.
 *
 * @param {Object} newSchedule - The new schedule to add.
 */
function addCronEntry(newSchedule) {
    cronManager.add(
        newSchedule.id.toString(),
        newSchedule.cronSchedule,
        () => {
            globals.logger.info(`SCHEDULER: Cron event for schedule ID ${newSchedule.id.toString()}: ${newSchedule.name}`);
            senseStartTask(newSchedule.qlikSenseTaskId);
        },
        {
            start: newSchedule.startupState === 'started' || newSchedule.startupState === 'start' ? true : false,
            timeZone: newSchedule.timeZone,
        },
    );
}

/**
 * Adds a new schedule.
 *
 * @param {Object} newSchedule - The new schedule to add.
 */
export function addSchedule(newSchedule) {
    try {
        globals.logger.debug(`SCHEDULER: Adding new schedule: ${JSON.stringify(newSchedule, null, 2)}`);

        globals.configSchedule.push(newSchedule);

        newSchedule.lastKnownState = newSchedule.startupState === 'started' || newSchedule.startupState === 'start' ? 'started' : 'stopped';

        // Persist schedule to disk
        saveSchedulesToDisk();

        // Add schedule to cron manager
        addCronEntry(newSchedule);
        // startSchedule(newSchedule.id);

        globals.logger.verbose(`SCHEDULER: Added new schedule: ${JSON.stringify(newSchedule, null, 2)}`);
    } catch (err) {
        globals.logger.error(
            `SCHEDULER: Failed adding new schedule ${JSON.stringify(newSchedule, null, 2)}: ${JSON.stringify(err, null, 2)}`,
        );
    }
}

/**
 * Loads schedules from disk.
 */
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

/**
 * Starts all currently defined schedules.
 *
 * @returns {Promise<void>}
 */
export function startAllSchedules() {
    return new Promise((resolve, reject) => {
        globals.logger.debug('SCHEDULER: Starting all schedules');

        try {
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

/**
 * Stops all currently defined schedules.
 *
 * @returns {Promise<void>}
 */
export function stopAllSchedules() {
    return new Promise((resolve, reject) => {
        globals.logger.debug('SCHEDULER: Stopping all schedules');

        try {
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

/**
 * Gets the status of all schedules.
 *
 * @returns {Object} The status of all schedules.
 */
export function getSchedulesStatus() {
    globals.logger.debug('SCHEDULER: Getting all crons');

    const cronList = cronManager.listCrons();
    globals.logger.debug(`SCHEDULER: Cron list: ${JSON.stringify(cronList, null, 2)}`);

    return cronList;
}

/**
 * Gets an array with all schedules.
 *
 * @returns {Array} An array of all schedules.
 */
export function getAllSchedules() {
    globals.logger.debug('SCHEDULER: Getting all schedules');

    return globals.configSchedule;
}

/**
 * Gets a single schedule by its ID.
 *
 * @param {number} scheduleId - The ID of the schedule to get.
 * @returns {Object} The schedule with the specified ID.
 */
export function getSchedule(scheduleId) {
    globals.logger.debug('SCHEDULER: Getting schedule');

    return globals.configSchedule.find((item) => item.id === scheduleId);
}

/**
 * Checks if a particular schedule exists.
 *
 * @param {number} scheduleId - The ID of the schedule to check.
 * @returns {boolean} True if the schedule exists, false otherwise.
 */
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

/**
 * Deletes a schedule by its ID.
 *
 * @param {number} deleteScheduleId - The ID of the schedule to delete.
 * @returns {boolean} True if the schedule was deleted, false otherwise.
 */
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

/**
 * Starts a schedule by its ID.
 *
 * @param {number} scheduleId - The ID of the schedule to start.
 * @returns {boolean} True if the schedule was started, false otherwise.
 */
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

/**
 * Stops a schedule by its ID.
 *
 * @param {number} scheduleId - The ID of the schedule to stop.
 * @returns {boolean} True if the schedule was stopped, false otherwise.
 */
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
