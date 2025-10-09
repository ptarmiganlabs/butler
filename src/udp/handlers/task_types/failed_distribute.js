// Load global variables and functions
import globals from '../../../globals.js';
import { postDistributeTaskFailureNotificationInfluxDb } from '../../../lib/influxdb/task_failure.js';

/**
 * Handler for failed distribute tasks.
 *
 * Processes distribute task failures by:
 * - Extracting task metadata from QRS
 * - Posting metrics to InfluxDB (if enabled)
 *
 * Note: Distribute tasks do not have associated apps or script logs,
 * so app metadata and script log retrieval are not performed.
 * Additional notification channels (email, Slack, Teams, etc.) will be added in the future.
 *
 * @async
 * @param {Array<string>} msg - UDP message array with distribution failure details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for distribute tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for distribute tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS containing:
 *   - taskType: Type of task (3=Distribute)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<void>}
 */
export const handleFailedDistributeTask = async (msg, taskMetadata) => {
    try {
        globals.logger.verbose(
            `[QSEOW] TASKFAILURE: Distribute task failed: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${msg[5]}`,
        );

        // Get tags for the task that failed
        const taskTags = taskMetadata?.tags?.map((tag) => tag.name) || [];
        globals.logger.verbose(`[QSEOW] Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

        // Get distribute task custom properties
        const taskCustomProperties =
            taskMetadata?.customProperties?.map((cp) => ({
                name: cp.definition.name,
                value: cp.value,
            })) || [];

        // Post to InfluxDB when a distribute task has failed
        if (
            globals.config.has('Butler.influxDb.enable') &&
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.has('Butler.influxDb.distributeTaskFailure.enable') &&
            globals.config.get('Butler.influxDb.distributeTaskFailure.enable') === true
        ) {
            postDistributeTaskFailureNotificationInfluxDb({
                host: msg[1],
                user: msg[4].replace(/\\/g, '/'),
                taskName: msg[2],
                taskId: msg[5],
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_taskMetadata: taskMetadata,
            });
        }

        globals.logger.info(`[QSEOW] TASKFAILURE: Distribute task ${msg[2]} (${msg[5]}) failed.`);
    } catch (err) {
        globals.logger.error(`[QSEOW] TASKFAILURE: Error handling failed distribute task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] TASKFAILURE: Stack trace: ${err.stack}`);
    }
};
