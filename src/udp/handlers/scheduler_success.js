// Load global variables and functions
import globals from '../../globals.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';
import doesTaskExist from '../../qrs_util/does_task_exist.js';
import { handleSuccessReloadTask } from './task_types/success_reload.js';
import { handleSuccessExternalProgramTask } from './task_types/success_externalprogram.js';
import { handleSuccessUserSyncTask } from './task_types/success_usersync.js';
import { handleSuccessDistributeTask } from './task_types/success_distribute.js';
import { handleSuccessPreloadTask } from './task_types/success_preload.js';

/**
 * Handler for successful scheduler initiated tasks.
 *
 * This function processes UDP messages for successfully completed tasks from the Qlik Sense scheduler.
 * It validates the task exists, retrieves task metadata to determine the task type,
 * and routes to the appropriate task type-specific handler for processing.
 *
 * Supported task types:
 * - Reload (type 0): App reload tasks
 * - External Program (type 1): External program execution tasks
 * - User Sync (type 2): User directory sync tasks
 * - Distribute (type 3): App distribution tasks
 * - Preload (type 4): App preload tasks
 *
 * @async
 * @param {Array<string>} msg - UDP message array with task success details:
 *   - msg[0]: Message type identifier (e.g., '/scheduler-reloadtask-success/')
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: App name
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: App ID
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @returns {Promise<boolean>} Returns true if processing was successful, false otherwise
 */
const schedulerTaskSuccess = async (msg) => {
    try {
        const reloadTaskId = msg[5];

        // Does task ID exist in Sense?
        const taskExists = await doesTaskExist(reloadTaskId);
        if (taskExists.exists !== true) {
            globals.logger.warn(`[QSEOW] RELOAD TASK SUCCESS: Task ID ${reloadTaskId} does not exist in Sense`);
            return false;
        }

        // Get task metadata to determine task type
        const taskMetadata = await getTaskMetadata(msg[5]);
        if (taskMetadata === false) {
            globals.logger.error(
                `[QSEOW] RELOAD TASK SUCCESS: Could not get task metadata for task ${msg[5]}. Aborting further processing`,
            );
            return false;
        }

        // Determine task type based on taskMetadata
        // Task types: 0=Reload, 1=ExternalProgram, 2=UserSync, 3=Distribute, 4=Preload
        const taskType = taskMetadata?.taskType || 0;
        const taskTypeStr =
            taskType === 0
                ? 'reload'
                : taskType === 1
                  ? 'externalprogram'
                  : taskType === 2
                    ? 'usersync'
                    : taskType === 3
                      ? 'distribute'
                      : taskType === 4
                        ? 'preload'
                        : 'unknown';

        globals.logger.debug(`[QSEOW] RELOAD TASK SUCCESS: Task type=${taskType}, taskTypeStr=${taskTypeStr}`);

        // Route to appropriate task type handler
        let result = false;
        switch (taskTypeStr) {
            case 'reload':
                result = await handleSuccessReloadTask(msg, taskMetadata);
                break;
            case 'externalprogram':
                result = await handleSuccessExternalProgramTask(msg, taskMetadata);
                break;
            case 'usersync':
                result = await handleSuccessUserSyncTask(msg, taskMetadata);
                break;
            case 'distribute':
                result = await handleSuccessDistributeTask(msg, taskMetadata);
                break;
            case 'preload':
                result = await handleSuccessPreloadTask(msg, taskMetadata);
                break;
            default:
                globals.logger.warn(
                    `[QSEOW] RELOAD TASK SUCCESS: Unknown task type ${taskType} for task ${msg[2]} (${msg[5]}). No handler available.`,
                );
        }

        return result;
    } catch (err) {
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Error processing task success event: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: Stack trace: ${err.stack}`);
        return false;
    }
};

export default schedulerTaskSuccess;
