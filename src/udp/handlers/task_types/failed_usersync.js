// Load global variables and functions
import globals from '../../../globals.js';
import { postUserSyncTaskFailureNotificationInfluxDb } from '../../../lib/influxdb/task_failure.js';

/**
 * Handler for failed user sync tasks.
 *
 * - Processes failed user sync task events by:
 * - Extracting task metadata (tags, custom properties)
 * - Sending notifications to configured destinations:
 * - InfluxDB metrics (if enabled)
 *
 * User Sync tasks synchronize user directories with Qlik Sense.
 * Note: User sync tasks do not generate script logs.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with user sync failure details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for user sync tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for user sync tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS:
 *   - taskType: Type of task (2=UserSync)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<void>}
 */
export const handleFailedUserSyncTask = async (msg, taskMetadata) => {
    try {
        const userSyncTaskId = msg[5];

        globals.logger.verbose(
            `[QSEOW] USER SYNC TASK FAILURE: User sync task failed: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${userSyncTaskId}`,
        );

        globals.logger.info(`[QSEOW] USER SYNC TASK FAILURE: User sync task ${msg[2]} (${userSyncTaskId}) failed.`);

        // Get tags for the task that failed
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${userSyncTaskId}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get user sync task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Post to InfluxDB when a user sync task has failed
        if (
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.userSyncTaskFailure.enable') === true
        ) {
            postUserSyncTaskFailureNotificationInfluxDb({
                host: msg[1],
                user: msg[4].replace(/\\/g, '/'),
                taskName: msg[2],
                taskId: userSyncTaskId,
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_taskMetadata: taskMetadata,
            });
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] USER SYNC TASK FAILURE: Error handling failed user sync task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] USER SYNC TASK FAILURE: Stack trace: ${err.stack}`);
    }
};
