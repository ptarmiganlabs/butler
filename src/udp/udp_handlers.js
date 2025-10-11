// Load global variables and functions
import globals from '../globals.js';
import schedulerAborted from './handlers/scheduler_aborted.js';
import schedulerFailed from './handlers/scheduler_failed.js';
import schedulerTaskSuccess from './handlers/scheduler_success.js';
import distributeTaskCompletion from './handlers/distribute_task_completion.js';
import { validateAndSanitizeMessage, validateCriticalFields } from '../lib/udp_message_validation.js';

/**
 * Set up UDP server handlers for acting on Sense failed task events.
 */
const udpInitTaskErrorServer = () => {
    // Handler for UDP server startup event

    globals.udpServerTaskResultSocket.on('listening', (message, remote) => {
        const address = globals.udpServerTaskResultSocket.address();

        globals.logger.info(`[QSEOW] TASKFAILURE: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
            } else {
                globals.logger.warn(
                    `[QSEOW] UDP SERVER INIT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskFailureServerStatusTopic',
                    )}`,
                );
            }
        }
    });

    // Handler for UDP error event

    globals.udpServerTaskResultSocket.on('error', (message, remote) => {
        try {
            const address = globals.udpServerTaskResultSocket.address();
            globals.logger.error(`[QSEOW] TASKFAILURE: UDP server error on ${address.address}:${address.port}`);

            // Publish MQTT message that UDP server has reported an error
            if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
                if (globals?.mqttClient?.connected) {
                    globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
                } else {
                    globals.logger.warn(
                        `[QSEOW] UDP SERVER ERROR: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                            'Butler.mqttConfig.taskFailureServerStatusTopic',
                        )}`,
                    );
                }
            }
        } catch (err) {
            globals.logger.error(`[QSEOW] TASKFAILURE: Error in UDP error handler: ${globals.getErrorMessage(err)}`);
        }
    });

    // Main handler for UDP messages relating to failed tasks

    globals.udpServerTaskResultSocket.on('message', async (message, remote) => {
        // ---------------------------------------------------------
        // === Message from Scheduler reload failed log appender ===
        //
        // String used in log appender xml file:
        // /scheduler-reload-failed/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level%property{ExecutionId};%message
        // msg[0]  : Identifies the message as coming from scheduler reload failed appender
        // msg[1]  : Host name
        // msg[2]  : Task name
        // msg[3]  : App name
        // msg[4]  : User
        // msg[5]  : Task ID
        // msg[6]  : App ID
        // msg[7]  : Log timestamp
        // msg[8]  : Level of log event
        // msg[9]  : Execution ID
        // msg[10]  : Message

        // ----------------------------------------------------------
        // === Message from Scheduler reload aborted log appender ===
        //
        // String used in log appender xml file:
        // /scheduler-reload-aborted/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level%property{ExecutionId};%message
        // msg[0]  : Identifies the message as coming from scheduler reload aborted appender
        // msg[1]  : Host name
        // msg[2]  : Task name
        // msg[3]  : App name
        // msg[4]  : User
        // msg[5]  : Task ID
        // msg[6]  : App ID
        // msg[7]  : Log timestamp
        // msg[8]  : Level of log event
        // msg[9]  : Execution ID
        // msg[10] : Message

        // ----------------------------------------------------------
        // === Message from Scheduler reload task success log appender ===
        //
        // String used in log appender xml file:
        // /scheduler-reloadtask-success/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level;%property{ExecutionId};%message
        // msg[0]  : Identifies the message as coming from scheduler reload task success appender
        // msg[1]  : Host name
        // msg[2]  : Task name
        // msg[3]  : App name
        // msg[4]  : User
        // msg[5]  : Task ID
        // msg[6]  : App ID
        // msg[7]  : Log timestamp
        // msg[8]  : Level of log event
        // msg[9]  : Execution ID
        // msg[10] : Message

        // ----------------------------------------
        // === Message from Engine log appender ===
        //
        // String used in log appender xml file:
        // /engine-reload-failed/;%hostname;%property{AppId};%property{SessionId};%property{ActiveUserDirectory};%property{ActiveUserId};%date;%level;%message
        // mag[0]  : Identifies the message as coming from engine reload failedlog appender
        // mag[1]  : Host name
        // mag[2]  : App ID
        // mag[3]  : Session ID
        // mag[4]  : Active user directory
        // mag[5]  : Active user ID
        // mag[6]  : Log timestamp
        // mag[7]  : Level of log event
        // mag[8]  : Message

        try {
            globals.logger.debug(`[QSEOW] UDP HANDLER: UDP message received: ${message.toString()}`);
            globals.logger.info(`[QSEOW] UDP HANDLER: UDP message received: ${message.toString()}`);

            // Validate and parse message - initial split to check message type
            const msgInitial = message.toString('utf8').split(';');
            const messageType = msgInitial[0] ? msgInitial[0].toLowerCase() : '';

            if (messageType === '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users
                // Validate and sanitize the message
                const validationResult = validateAndSanitizeMessage(message, 9);
                if (!validationResult.valid) {
                    globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Invalid UDP message. Aborting processing.`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    return;
                }

                const msg = validationResult.msg;

                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Received reload failed UDP message from engine: Host=${msg[1]}, AppID=${msg[2]}, User directory=${msg[4]}, User=${msg[5]}`,
                );
            } else if (messageType === '/scheduler-distribute/') {
                // Scheduler log appender detecting distribute task event (success, failed)
                // Validate and sanitize the message (at least 11 fields expected)
                const msgParts = message.toString('utf8').split(';');
                if (msgParts.length < 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Invalid number of fields in UDP message. Expected at least 11, got ${msgParts.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Aborting processing of this message.`);
                    return;
                }

                // Use the actual message length for validation
                const validationResult = validateAndSanitizeMessage(message, msgParts.length);
                if (!validationResult.valid) {
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Invalid UDP message. Aborting processing.`);
                    return;
                }

                const msg = validationResult.msg;

                // Validate critical fields - distribute tasks may not have app IDs
                // Don't fail on invalid IDs, just log warnings
                validateCriticalFields(msg, { taskIdIndex: 5, appIdIndex: 6, requireAppId: false, strict: false });

                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Received distribute task UDP message from scheduler: Host=${msg[1]}, TaskName=${msg[2]}, AppName=${msg[3]}, User=${msg[4]}, TaskID=${msg[5]}, AppID=${msg[6]}, ExecutionID=${msg[9]}, Message=${msg[10]}`,
                );

                distributeTaskCompletion(msg);
            } else if (
                messageType === '/scheduler-reload-failed/' ||
                messageType === '/scheduler-task-failed/' ||
                messageType === '/scheduler-reloadtask-failed/'
            ) {
                // Scheduler log appender detecting failed tasks
                // Validate and sanitize the message
                const validationResult = validateAndSanitizeMessage(message, 11);
                if (!validationResult.valid) {
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Invalid UDP message. Aborting processing.`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    return;
                }

                const msg = validationResult.msg;

                // Validate critical fields (task ID and app ID required)
                // Don't fail on invalid IDs, just log warnings
                validateCriticalFields(msg, { taskIdIndex: 5, appIdIndex: 6, requireAppId: true, strict: false });

                schedulerFailed(msg);
            } else if (messageType === '/scheduler-reload-aborted/' || messageType === '/scheduler-task-aborted/') {
                // Scheduler log appender detecting aborted tasks
                // Validate and sanitize the message
                const validationResult = validateAndSanitizeMessage(message, 11);
                if (!validationResult.valid) {
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Invalid UDP message. Aborting processing.`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Incoming log message was:\n${message.toString()}`);
                    return;
                }

                const msg = validationResult.msg;

                // Validate critical fields (task ID and app ID required)
                // Don't fail on invalid IDs, just log warnings
                validateCriticalFields(msg, { taskIdIndex: 5, appIdIndex: 6, requireAppId: true, strict: false });

                schedulerAborted(msg);
            } else if (messageType === '/scheduler-reloadtask-success/' || messageType === '/scheduler-task-success/') {
                // Scheduler log appender detecting successful tasks
                // Support both legacy /scheduler-reloadtask-success/ and new generic /scheduler-task-success/ message types
                // Validate and sanitize the message
                const validationResult = validateAndSanitizeMessage(message, 11);
                if (!validationResult.valid) {
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Invalid UDP message. Aborting processing.`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Incoming log message was:\n${message.toString()}`);
                    return;
                }

                const msg = validationResult.msg;

                // Validate critical fields (task ID and app ID - app ID may be empty for some task types)
                // Don't fail on invalid IDs, just log warnings
                validateCriticalFields(msg, { taskIdIndex: 5, appIdIndex: 6, requireAppId: false, strict: false });

                schedulerTaskSuccess(msg);
            } else {
                globals.logger.warn(`[QSEOW] UDP HANDLER: Unknown UDP message type: "${messageType}"`);
            }
        } catch (err) {
            globals.logger.error(
                `[QSEOW] UDP HANDLER: Failed processing log event. No action will be taken for this event. Error: ${globals.getErrorMessage(err)}`,
            );
            globals.logger.error(`[QSEOW] UDP HANDLER: Incoming log message was\n${message}`);
        }
    });
};

export default udpInitTaskErrorServer;
