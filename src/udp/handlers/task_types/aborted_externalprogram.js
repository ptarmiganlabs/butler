// Load global variables and functions
import globals from '../../../globals.js';

/**
 * Handler for aborted external program tasks.
 *
 * Placeholder handler for External Program task aborts.
 * External Program tasks execute external programs or scripts from the Qlik Sense scheduler.
 *
 * TODO: Implement comprehensive handling for aborted external program tasks including:
 * - Abort reason logging
 * - Notification sending (email, Slack, Teams, etc.)
 * - Metrics collection for InfluxDB
 * - Incident management integration
 *
 * @async
 * @param {Array<string>} msg - UDP message array with external program abort details:
 *   - msg[0]: Message type identifier
 *   - msg[1]: Host name
 *   - msg[2]: Task name
 *   - msg[3]: (Not used for external program tasks - app name only present in reload tasks)
 *   - msg[4]: User (directory/username format)
 *   - msg[5]: Task ID
 *   - msg[6]: (Not used for external program tasks - app ID only present in reload tasks)
 *   - msg[7]: Log timestamp
 *   - msg[8]: Log level
 *   - msg[9]: Execution ID
 *   - msg[10]: Log message
 * @param {Object} taskMetadata - Task metadata retrieved from Qlik Sense QRS (currently not used in this handler):
 *   - taskType: Type of task (1=ExternalProgram)
 *   - tags: Array of tag objects with id and name
 *   - customProperties: Array of custom property objects
 * @returns {Promise<void>}
 */
export const handleAbortedExternalProgramTask = async (msg, taskMetadata) => {
    try {
        globals.logger.verbose(
            `[QSEOW] TASKABORTED: External program task aborted: UDP msg=${msg[0]}, Host=${msg[1]}, Task name=${msg[2]}, Task ID=${msg[5]}`,
        );

        // TODO: Implement handling for aborted external program tasks
        // This is a placeholder for future implementation
        globals.logger.info(
            `[QSEOW] TASKABORTED: External program task ${msg[2]} (${msg[5]}) was aborted. No processing configured yet for this task type.`,
        );
    } catch (err) {
        globals.logger.error(`[QSEOW] TASKABORTED: Error handling aborted external program task: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] TASKABORTED: Stack trace: ${err.stack}`);
    }
};
