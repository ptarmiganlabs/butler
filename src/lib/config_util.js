import globals from '../globals.js';

// RegExp matching standard GUID format: 8-4-4-4-12 hex digits
const guidRegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Verify that all task IDs in the Butler configuration are valid GUIDs.
 *
 * This function checks if the startTaskFilter feature is enabled in the config,
 * and if so, validates that all allowed task IDs conform to GUID format.
 * Invalid task IDs are logged as warnings.
 */
export const configVerifyAllTaskId = () => {
    try {
        // Only verify allowed task IDs if that feature is turned on in config
        if (globals.config.has('Butler.startTaskFilter.enable') && globals.config.get('Butler.startTaskFilter.enable') === true) {
            globals.logger.info('CONFIG VERIFY: Verifying that task IDs are valid...');

            // Check if there are allowed task IDs configured
            if (
                globals.config.has('Butler.startTaskFilter.allowTask.taskId') === true &&
                globals.config.get('Butler.startTaskFilter.allowTask.taskId')
            ) {
                // Iterate through each configured task ID and validate format
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
        globals.logger.error(`CONFIG VERIFY: Error verifying all task IDs: ${globals.getErrorMessage(err)}`);
    }
};

/**
 * Verify if a specific task ID is a valid GUID.
 *
 * @param {string} taskId - The task ID to verify.
 * @returns {boolean} - True if the task ID is valid, false otherwise.
 */
export const verifyTaskId = (taskId) => {
    try {
        if (guidRegExp.test(taskId) === true) {
            globals.logger.verbose(`TASK ID VERIFY: Task ID is valid: ${taskId}`);
            return true;
        }
        globals.logger.warn(`TASK ID VERIFY: Task ID not valid: ${taskId}`);
    } catch (err) {
        globals.logger.error(`TASK ID VERIFY: Error verifying task ID: ${globals.getErrorMessage(err)}`);
    }
    return false;
};
