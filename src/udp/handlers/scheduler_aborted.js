// Load global variables and functions
import globals from '../../globals.js';
import getTaskMetadata from '../../qrs_util/task_metadata.js';
import doesTaskExist from '../../qrs_util/does_task_exist.js';
import { handleAbortedReloadTask } from './task_types/aborted_reload.js';
import { handleAbortedExternalProgramTask } from './task_types/aborted_externalprogram.js';
import { handleAbortedUserSyncTask } from './task_types/aborted_usersync.js';
import { handleAbortedDistributeTask } from './task_types/aborted_distribute.js';
import { handleAbortedPreloadTask } from './task_types/aborted_preload.js';

/**
 * Handler for aborted scheduler initiated tasks.
 *
 * This function processes UDP messages for aborted tasks from the Qlik Sense scheduler.
 * Tasks can be aborted manually via QMC, APIs, or other administrative actions.
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
 * @param {Array<string>} msg - UDP message array with task abort details:
 *   - msg[0]: Message type identifier (e.g., '/scheduler-reload-aborted/')
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
 * @returns {Promise<void|boolean>} Returns false if task doesn't exist, void otherwise
 */
const schedulerAborted = async (msg) => {
    try {
        const reloadTaskId = msg[5];

        // Does task ID exist in Sense?
        const taskExists = await doesTaskExist(reloadTaskId);
        if (taskExists.exists !== true) {
            globals.logger.warn(`[QSEOW] TASKABORTED: Task ID ${reloadTaskId} does not exist in Sense`);
            return false;
        }

        // Get task metadata to determine task type
        const taskMetadata = await getTaskMetadata(msg[5]);
        if (taskMetadata === false) {
            globals.logger.error(`[QSEOW] TASKABORTED: Could not get task metadata for task ${msg[5]}. Aborting further processing`);
            return;
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

        globals.logger.debug(`[QSEOW] TASKABORTED: Task type=${taskType}, taskTypeStr=${taskTypeStr}`);

        // Route to appropriate task type handler
        switch (taskTypeStr) {
            case 'reload':
                await handleAbortedReloadTask(msg, taskMetadata);
                break;
            case 'externalprogram':
                await handleAbortedExternalProgramTask(msg, taskMetadata);
                break;
            case 'usersync':
                await handleAbortedUserSyncTask(msg, taskMetadata);
                break;
            case 'distribute':
                await handleAbortedDistributeTask(msg, taskMetadata);
                break;
            case 'preload':
                await handleAbortedPreloadTask(msg, taskMetadata);
                break;
            default:
                globals.logger.warn(
                    `[QSEOW] TASKABORTED: Unknown task type ${taskType} for task ${msg[2]} (${msg[5]}). No handler available.`,
                );
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] TASKABORTED: Error processing task aborted event: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] TASKABORTED: Stack trace: ${err.stack}`);
    }
};

export default schedulerAborted;
