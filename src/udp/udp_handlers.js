/**
 * UDP Server Handlers for Qlik Sense Task Events.
 *
 * This module sets up a UDP server to receive task failure, abort, and success
 * notifications from the Qlik Sense scheduler via custom log appenders.
 *
 * The UDP server receives messages from the following Qlik Sense log appenders:
 * - /scheduler-reload-failed/ - Reload task failures
 * - /scheduler-reload-aborted/ - Reload task aborts
 * - /scheduler-reloadtask-success/ - Reload task success
 * - /scheduler-distribute/ - Distribution task events
 * - /engine-reload-failed/ - Engine-level reload failures
 */

// Load global variables and functions
import globals from '../globals.js';
import schedulerAborted from './handlers/scheduler_aborted.js';
import schedulerFailed from './handlers/scheduler_failed.js';
import schedulerTaskSuccess from './handlers/scheduler_success.js';
import distributeTaskCompletion from './handlers/distribute_task_completion.js';
import { parseAllowedSources, isIpAllowed } from '../lib/udp_ip_validator.js';
import { verifyGuid } from '../lib/guid_util.js';
import { sanitizeMessage } from '../lib/udp_sanitizer.js';

/**
 * Set up UDP server handlers for acting on Qlik Sense task events.
 *
 * Registers event handlers for:
 * - 'listening': UDP server started successfully
 * - 'error': UDP server error occurred
 * - 'message': UDP message received from scheduler
 */
const udpInitTaskErrorServer = async () => {
    // Handler for UDP server startup event
    // Called when UDP server successfully binds to its port
    globals.udpServerTaskResultSocket.on('listening', (message, remote) => {
        try {
            const address = globals.udpServerTaskResultSocket.address();

            globals.logger.info(`[QSEOW] TASKFAILURE: UDP server listening on ${address.address}:${address.port}`);

            // Publish MQTT message that UDP server has started
            // This allows external systems to know the UDP server is operational
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
        } catch (err) {
            globals.logger.error(`[QSEOW] TASKFAILURE: Error in UDP listening handler: ${globals.getErrorMessage(err)}`);
        }
    });

    // Handler for UDP error event
    // Called when an error occurs with the UDP server
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

    // Parse and resolve allowed source IPs if source validation is enabled
    if (globals.udpEnableSourceValidation && globals.udpAllowedSourcesConfig.length > 0) {
        try {
            const { allowedIPs, errors } = await parseAllowedSources(globals.udpAllowedSourcesConfig);
            if (errors.length > 0) {
                errors.forEach((err) => globals.logger.error(`[QSEOW] UDP INIT: ${err}`));
                globals.logger.warn('[QSEOW] UDP INIT: Source validation will be disabled due to config errors');
                globals.udpEnableSourceValidation = false;
            } else {
                globals.udpAllowedIPs = allowedIPs;
                globals.logger.info(`[QSEOW] UDP INIT: Source IP validation enabled, ${allowedIPs.length} IPs loaded`);
            }
        } catch (err) {
            globals.logger.error(`[QSEOW] UDP INIT: Error parsing allowed sources: ${globals.getErrorMessage(err)}`);
            globals.udpEnableSourceValidation = false;
        }
    }

    // Main handler for UDP messages relating to failed tasks
    // Called when a UDP message is received from the scheduler
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
            // --- PAYLOAD SIZE VALIDATION ---
            const maxSize = globals.udpMaxMessageSize || 65507;
            const messageSize = Buffer.isBuffer(message) ? message.length : Buffer.byteLength(message);
            if (messageSize > maxSize) {
                globals.logger.warn(
                    `[QSEOW] UDP HANDLER: Message size (${messageSize} bytes) exceeds maximum allowed (${maxSize} bytes). Rejecting.`,
                );
                return;
            }

            // --- SOURCE IP VALIDATION ---
            if (globals.udpEnableSourceValidation && remote?.address) {
                if (!isIpAllowed(remote.address, globals.udpAllowedIPs)) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER: Message from unauthorized source ${remote.address}:${remote.port}. Rejecting.`,
                    );
                    return;
                }
            }

            globals.logger.verbose(`[QSEOW] UDP HANDLER: UDP message received: ${message.toString()}`);

            const msg = message.toString().split(';');
            const originalMsgForCompare = JSON.stringify(msg);

            // --- INPUT SANITIZATION ---
            const sanitizedMsg = sanitizeMessage(msg, 500);

            // Log warning if any field was modified
            if (JSON.stringify(sanitizedMsg) !== originalMsgForCompare) {
                globals.logger.warn(
                    `[QSEOW] UDP HANDLER: Message sanitized (control chars removed/length truncated). Original: ${message.toString().substring(0, 200)}...`,
                );
            }

            // Use sanitized message for all subsequent processing
            const sanitized = sanitizedMsg;

            // --- UUID VALIDATION FOR TASK ID ---
            if (sanitized[5] && !verifyGuid(sanitized[5])) {
                globals.logger.warn(`[QSEOW] UDP HANDLER: Invalid Task ID format: ${sanitized[5]}. Rejecting message.`);
                return;
            }

            // --- UUID VALIDATION FOR APP ID (if present) ---
            if (sanitized[6] && sanitized[6] !== '' && !verifyGuid(sanitized[6])) {
                globals.logger.warn(`[QSEOW] UDP HANDLER: Invalid App ID format: ${sanitized[6]}. Rejecting message.`);
                return;
            }

            if (sanitized[0].toLowerCase() === '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (sanitized.length !== 9) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Invalid number of fields in UDP message. Expected 9, got ${sanitized.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Aborting processing of this message.`);
                    return;
                }

                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Received reload failed UDP message from engine: Host=${sanitized[1]}, AppID=${sanitized[2]}, User directory=${sanitized[4]}, User=${sanitized[5]}`,
                );
            } else if (sanitized[0].toLowerCase() === '/scheduler-distribute/') {
                // Scheduler log appender detecting distribute task event (success, failed)

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (sanitized.length < 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Invalid number of fields in UDP message. Expected at least 11, got ${sanitized.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Aborting processing of this message.`);
                    return;
                }

                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Received distribute task UDP message from scheduler: Host=${sanitized[1]}, TaskName=${sanitized[2]}, AppName=${sanitized[3]}, User=${sanitized[4]}, TaskID=${sanitized[5]}, AppID=${sanitized[6]}, ExecutionID=${sanitized[9]}, Message=${sanitized[10]}`,
                );

                await distributeTaskCompletion(sanitized);
            } else if (
                sanitized[0].toLowerCase() === '/scheduler-reload-failed/' ||
                sanitized[0].toLowerCase() === '/scheduler-task-failed/' ||
                sanitized[0].toLowerCase() === '/scheduler-reloadtask-failed/'
            ) {
                // Scheduler log appender detecting failed tasks

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (sanitized.length !== 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Invalid number of fields in UDP message. Expected 11, got ${sanitized.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Aborting processing of this message.`);
                    return;
                }

                await schedulerFailed(sanitized);
            } else if (
                sanitized[0].toLowerCase() === '/scheduler-reload-aborted/' ||
                sanitized[0].toLowerCase() === '/scheduler-task-aborted/'
            ) {
                // Scheduler log appender detecting aborted tasks

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (sanitized.length !== 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Invalid number of fields in UDP message. Expected 11, got ${sanitized.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Aborting processing of this message.`);
                    return;
                }

                await schedulerAborted(sanitized);
            } else if (
                sanitized[0].toLowerCase() === '/scheduler-reloadtask-success/' ||
                sanitized[0].toLowerCase() === '/scheduler-task-success/'
            ) {
                // Scheduler log appender detecting successful tasks
                // Support both legacy /scheduler-reloadtask-success/ and new generic /scheduler-task-success/ message types

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (sanitized.length !== 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Invalid number of fields in UDP message. Expected 11, got ${sanitized.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Aborting processing of this message.`);
                    return;
                }
                await schedulerTaskSuccess(sanitized);
            } else {
                globals.logger.warn(`[QSEOW] UDP HANDLER: Unknown UDP message type: "${sanitized[0]}"`);
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
