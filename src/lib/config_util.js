import globals from '../globals.js';

// Construct a new RegExp object matching guids
const guidRegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const configVerifyAllTaskId = () => {
    try {
        // Only verify allowed task IDs if that feature is turned on
        if (globals.config.has('Butler.startTaskFilter.enable') && globals.config.get('Butler.startTaskFilter.enable') === true) {
            globals.logger.info('CONFIG VERIFY: Verifying that task IDs are valid...');

            if (
                globals.config.has('Butler.startTaskFilter.allowTask.taskId') === true &&
                globals.config.get('Butler.startTaskFilter.allowTask.taskId')
            ) {
                globals.config.get('Butler.startTaskFilter.allowTask.taskId').forEach((taskId) => {
                    if (guidRegExp.test(taskId) === true) {
                        globals.logger.verbose(`CONFIG VERIFY: Allowed task ID is valid: ${taskId}`);
                    } else {
                        globals.logger.warn(`CONFIG VERIFY: Allowed task ID not valid: ${taskId}`);
                    }
                });
            }
        }
    } catch (err) {
        globals.logger.error(`CONFIG VERIFY: Error verifying all task IDs: ${err}`);
    }
};

export const verifyTaskId = (taskId) => {
    try {
        if (guidRegExp.test(taskId) === true) {
            globals.logger.verbose(`TASK ID VERIFY: Task ID is valid: ${taskId}`);
            return true;
        }
        globals.logger.warn(`TASK ID VERIFY: Task ID not valid: ${taskId}`);
    } catch (err) {
        globals.logger.error(`TASK ID VERIFY: Error verifying task ID: ${err}`);
    }
    return false;
};
