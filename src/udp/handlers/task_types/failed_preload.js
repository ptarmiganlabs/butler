// Load global variables and functions
import globals from '../../../globals.js';
import getPreloadTaskExecutionResults from '../../../qrs_util/preload_task_execution_results.js';
import { sendPreloadTaskFailureNotificationEmail } from '../../../lib/qseow/smtp/index.js';

/**
 * Handler for failed preload tasks.
 *
 * Processes failed preload task events by:
 * - Retrieving task execution results
 * - Sending email notifications (if configured)
 *
 * Preload tasks load apps into memory for improved user access performance.
 * Note: Preload tasks do not generate script logs.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with preload failure details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for preload tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for preload tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS containing:
 *   - taskType: Type of task (4=Preload)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<boolean>} Returns true if processing was successful, false otherwise
 */
export const handleFailedPreloadTask = async (msg, taskMetadata) => {
    try {
        const preloadTaskId = msg[5];

        globals.logger.verbose(
            `[QSEOW] PRELOAD TASK FAILURE: Preload task failed: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${preloadTaskId}`,
        );

        globals.logger.info(`[QSEOW] PRELOAD TASK FAILURE: Preload task ${msg[2]} (${preloadTaskId}) failed.`);

        // Get tags for the task that failed
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${preloadTaskId}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get preload task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Get results from last preload task execution
        const taskInfo = await getPreloadTaskExecutionResults(preloadTaskId);

        if (!taskInfo) {
            globals.logger.warn(
                `[QSEOW] PRELOAD TASK FAILURE: Unable to get task info for preload task ${preloadTaskId}. Will continue with email notification if configured.`,
            );
        } else {
            globals.logger.verbose(
                `[QSEOW] PRELOAD TASK FAILURE: Task info for preload task ${preloadTaskId}: ${JSON.stringify(taskInfo, null, 2)}`,
            );
        }

        // Send email notification for failed preload task
        if (
            globals.config.has('Butler.emailNotification.preloadTaskFailure.enable') &&
            globals.config.get('Butler.emailNotification.preloadTaskFailure.enable') === true
        ) {
            sendPreloadTaskFailureNotificationEmail({
                host: msg[1],
                user: msg[4].replace(/\\/g, '/'),
                taskName: msg[2],
                taskId: preloadTaskId,
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                taskInfo,
                qs_taskMetadata: taskMetadata,
            });
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] PRELOAD TASK FAILURE: Error handling failed preload task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] PRELOAD TASK FAILURE: Stack trace: ${err.stack}`);
        return false;
    }
};
