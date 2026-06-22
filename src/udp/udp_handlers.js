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
import { parseAllowedSources, isIpAllowed, createRejectThrottle } from '../lib/udp_ip_validator.js';
import { guidRegex } from '../lib/guid_util.js';
import { sanitizeField, sanitizeMessage } from '../lib/udp_sanitizer.js';
import { UdpQueueManager } from '../lib/udp_queue_manager.js';
import { startUdpQueueMetricsTimer } from '../lib/influxdb/udp_queue_metrics.js';

// Per-source throttle for reject warnings (avoids log flooding from spamming hosts)
const rejectThrottle = createRejectThrottle();

const schedulerMessageTypesWithExecutionId = new Set([
    '/scheduler-distribute/',
    '/scheduler-reload-failed/',
    '/scheduler-task-failed/',
    '/scheduler-reloadtask-failed/',
    '/scheduler-reload-aborted/',
    '/scheduler-task-aborted/',
    '/scheduler-reloadtask-success/',
    '/scheduler-task-success/',
]);

/**
 * Validate task and app IDs for scheduler messages.
 *
 * @param {string} taskId - Task ID to validate
 * @param {string} appId - App ID to validate
 * @returns {boolean} True when both IDs are valid
 */
function validateTaskAndAppId(taskId, appId) {
    if (taskId && !guidRegex.test(taskId)) {
        globals.logger.warn(`[QSEOW] UDP HANDLER: Invalid Task ID format: ${taskId}. Rejecting message.`);
        return false;
    }
    if (appId && appId !== '' && !guidRegex.test(appId)) {
        globals.logger.warn(`[QSEOW] UDP HANDLER: Invalid App ID format: ${appId}. Rejecting message.`);
        return false;
    }
    return true;
}

/**
 * Extract the minimal sanitized envelope needed for routing and deduplication.
 *
 * @param {string[]} msg - Raw UDP message split into fields
 * @returns {{ executionId: string, messageType: string, usesExecutionId: boolean }} Sanitized routing envelope
 */
function getMessageEnvelope(msg) {
    const messageType = sanitizeField(msg[0] ?? '', 500).toLowerCase();
    const usesExecutionId = schedulerMessageTypesWithExecutionId.has(messageType);

    return {
        messageType,
        executionId: usesExecutionId ? sanitizeField(msg[9] ?? '', 500) : '',
        usesExecutionId,
    };
}

/**
 * Process engine reload failed UDP messages.
 *
 * @param {string[]} sanitizedMsg - Fully sanitized UDP message
 * @param {string} sanitizedMessageText - Sanitized message joined for logging
 * @returns {Promise<boolean>} True when processing succeeded, false when validation failed
 */
async function handleEngineReloadFailedMessage(sanitizedMsg, sanitizedMessageText) {
    if (sanitizedMsg.length !== 9) {
        globals.logger.warn(
            `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Invalid number of fields in UDP message. Expected 9, got ${sanitizedMsg.length}.`,
        );
        globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Incoming log message was:\n${sanitizedMessageText}`);
        globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Aborting processing of this message.`);
        return false;
    }

    if (sanitizedMsg[2] && !guidRegex.test(sanitizedMsg[2])) {
        globals.logger.warn(`[QSEOW] UDP HANDLER: Invalid App ID format: ${sanitizedMsg[2]}. Rejecting message.`);
        return false;
    }

    globals.logger.verbose(
        `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Received reload failed UDP message from engine: Host=${sanitizedMsg[1]}, AppID=${sanitizedMsg[2]}, User directory=${sanitizedMsg[4]}, User=${sanitizedMsg[5]}`,
    );

    return true;
}

/**
 * Process scheduler distribute UDP messages.
 *
 * @param {string[]} sanitizedMsg - Fully sanitized UDP message
 * @param {string} sanitizedMessageText - Sanitized message joined for logging
 * @returns {Promise<boolean>} True when processing succeeded, false when validation failed
 */
async function handleSchedulerDistributeMessage(sanitizedMsg, sanitizedMessageText) {
    if (sanitizedMsg.length < 11) {
        globals.logger.warn(
            `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Invalid number of fields in UDP message. Expected at least 11, got ${sanitizedMsg.length}.`,
        );
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Incoming log message was:\n${sanitizedMessageText}`);
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Aborting processing of this message.`);
        return false;
    }
    if (!validateTaskAndAppId(sanitizedMsg[5], sanitizedMsg[6])) return false;

    globals.logger.verbose(
        `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Received distribute task UDP message from scheduler: Host=${sanitizedMsg[1]}, TaskName=${sanitizedMsg[2]}, AppName=${sanitizedMsg[3]}, User=${sanitizedMsg[4]}, TaskID=${sanitizedMsg[5]}, AppID=${sanitizedMsg[6]}, ExecutionID=${sanitizedMsg[9]}, Message=${sanitizedMsg[10]}`,
    );

    await distributeTaskCompletion(sanitizedMsg);
    return true;
}

/**
 * Process scheduler failed UDP messages.
 *
 * @param {string[]} sanitizedMsg - Fully sanitized UDP message
 * @param {string} sanitizedMessageText - Sanitized message joined for logging
 * @returns {Promise<boolean>} True when processing succeeded, false when validation failed
 */
async function handleSchedulerReloadFailedMessage(sanitizedMsg, sanitizedMessageText) {
    if (sanitizedMsg.length !== 11) {
        globals.logger.warn(
            `[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Invalid number of fields in UDP message. Expected 11, got ${sanitizedMsg.length}.`,
        );
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Incoming log message was:\n${sanitizedMessageText}`);
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Aborting processing of this message.`);
        return false;
    }
    if (!validateTaskAndAppId(sanitizedMsg[5], sanitizedMsg[6])) return false;

    await schedulerFailed(sanitizedMsg);
    return true;
}

/**
 * Process scheduler aborted UDP messages.
 *
 * @param {string[]} sanitizedMsg - Fully sanitized UDP message
 * @param {string} sanitizedMessageText - Sanitized message joined for logging
 * @returns {Promise<boolean>} True when processing succeeded, false when validation failed
 */
async function handleSchedulerReloadAbortedMessage(sanitizedMsg, sanitizedMessageText) {
    if (sanitizedMsg.length !== 11) {
        globals.logger.warn(
            `[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Invalid number of fields in UDP message. Expected 11, got ${sanitizedMsg.length}.`,
        );
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Incoming log message was:\n${sanitizedMessageText}`);
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Aborting processing of this message.`);
        return false;
    }
    if (!validateTaskAndAppId(sanitizedMsg[5], sanitizedMsg[6])) return false;

    await schedulerAborted(sanitizedMsg);
    return true;
}

/**
 * Process scheduler success UDP messages.
 *
 * @param {string[]} sanitizedMsg - Fully sanitized UDP message
 * @param {string} sanitizedMessageText - Sanitized message joined for logging
 * @returns {Promise<boolean>} True when processing succeeded, false when validation failed
 */
async function handleSchedulerTaskSuccessMessage(sanitizedMsg, sanitizedMessageText) {
    if (sanitizedMsg.length !== 11) {
        globals.logger.warn(
            `[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Invalid number of fields in UDP message. Expected 11, got ${sanitizedMsg.length}.`,
        );
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Incoming log message was:\n${sanitizedMessageText}`);
        globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Aborting processing of this message.`);
        return false;
    }
    if (!validateTaskAndAppId(sanitizedMsg[5], sanitizedMsg[6])) return false;

    await schedulerTaskSuccess(sanitizedMsg);
    return true;
}

/**
 * Process a fully sanitized UDP message.
 *
 * @param {string} messageType - Sanitized message type
 * @param {string[]} sanitizedMsg - Fully sanitized UDP message
 * @param {string} sanitizedMessageText - Sanitized message joined for logging
 * @returns {Promise<boolean>} True when processing succeeded, false when validation failed
 */
async function processSanitizedUdpMessage(messageType, sanitizedMsg, sanitizedMessageText) {
    if (messageType === '/engine-reload-failed/') {
        return handleEngineReloadFailedMessage(sanitizedMsg, sanitizedMessageText);
    }

    if (messageType === '/scheduler-distribute/') {
        return handleSchedulerDistributeMessage(sanitizedMsg, sanitizedMessageText);
    }

    if (
        messageType === '/scheduler-reload-failed/' ||
        messageType === '/scheduler-task-failed/' ||
        messageType === '/scheduler-reloadtask-failed/'
    ) {
        return handleSchedulerReloadFailedMessage(sanitizedMsg, sanitizedMessageText);
    }

    if (messageType === '/scheduler-reload-aborted/' || messageType === '/scheduler-task-aborted/') {
        return handleSchedulerReloadAbortedMessage(sanitizedMsg, sanitizedMessageText);
    }

    if (messageType === '/scheduler-reloadtask-success/' || messageType === '/scheduler-task-success/') {
        return handleSchedulerTaskSuccessMessage(sanitizedMsg, sanitizedMessageText);
    }

    globals.logger.warn(`[QSEOW] UDP HANDLER: Unknown UDP message type: "${sanitizedMsg[0]}"`);
    return false;
}

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
    globals.udpServerTaskResultSocket.on('listening', () => {
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
    globals.udpServerTaskResultSocket.on('error', () => {
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
        } catch (handlerError) {
            globals.logger.error(`[QSEOW] TASKFAILURE: Error in UDP error handler: ${globals.getErrorMessage(handlerError)}`);
        }
    });

    // Parse and resolve allowed source IPs if source validation is enabled
    if (globals.udpEnableSourceValidation) {
        if (!Array.isArray(globals.udpAllowedSourcesConfig) || globals.udpAllowedSourcesConfig.length === 0) {
            globals.logger.warn('[QSEOW] UDP INIT: Source validation enabled but allowedSources is empty. Disabling source validation.');
            globals.udpEnableSourceValidation = false;
        } else {
            try {
                const { allowedIPs, errors } = await parseAllowedSources(globals.udpAllowedSourcesConfig);
                if (errors.length > 0) {
                    errors.forEach((err) => globals.logger.error(`[QSEOW] UDP INIT: ${err}`));
                }
                if (allowedIPs.length > 0) {
                    globals.udpAllowedIPs = allowedIPs;
                    globals.logger.info(`[QSEOW] UDP INIT: Source IP validation enabled, ${allowedIPs.length} IPs loaded`);
                    if (errors.length > 0) {
                        globals.logger.warn(`[QSEOW] UDP INIT: ${errors.length} source(s) could not be resolved and were skipped`);
                    }
                } else {
                    globals.logger.warn('[QSEOW] UDP INIT: Source validation will be disabled — no IPs could be resolved');
                    globals.udpEnableSourceValidation = false;
                }
            } catch (err) {
                globals.logger.error(`[QSEOW] UDP INIT: Error parsing allowed sources: ${globals.getErrorMessage(err)}`);
                globals.udpEnableSourceValidation = false;
            }
        }
    }

    // Initialize UDP queue manager
    const queueConfig = {
        messageQueue: {
            maxConcurrent: globals.config.get('Butler.udpServerConfig.messageQueue.maxConcurrent'),
            maxSize: globals.config.get('Butler.udpServerConfig.messageQueue.maxSize'),
            backpressureThreshold: globals.config.get('Butler.udpServerConfig.messageQueue.backpressureThreshold'),
        },
        rateLimit: {
            enable: globals.config.get('Butler.udpServerConfig.rateLimit.enable'),
            maxMessagesPerMinute: globals.config.get('Butler.udpServerConfig.rateLimit.maxMessagesPerMinute'),
        },
        deduplication: {
            enable: globals.config.get('Butler.udpServerConfig.deduplication.enable'),
            ttlMinutes: globals.config.get('Butler.udpServerConfig.deduplication.ttlMinutes'),
        },
        maxMessageSize: globals.udpMaxMessageSize,
    };

    globals.udpQueueManager = new UdpQueueManager(queueConfig, globals.logger, 'task_results');

    // Log deduplication settings at startup
    const deduplicationEnabled = globals.config.get('Butler.udpServerConfig.deduplication.enable');
    const deduplicationTtlMinutes = globals.config.get('Butler.udpServerConfig.deduplication.ttlMinutes');

    if (deduplicationEnabled) {
        globals.logger.info(`[QSEOW] UDP INIT: Deduplication enabled (TTL: ${deduplicationTtlMinutes} minutes)`);
    } else {
        globals.logger.info('[QSEOW] UDP INIT: Deduplication disabled');
    }

    // Start UDP queue metrics InfluxDB writer if enabled
    if (
        globals.config.get('Butler.influxDb.enable') === true &&
        globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.enable') === true
    ) {
        startUdpQueueMetricsTimer();
    }

    // Main handler for UDP messages relating to failed tasks
    // Called when a UDP message is received from the scheduler
    globals.udpServerTaskResultSocket.on('message', async (message, remote) => {
        let sanitizedMessageText = '';

        // --- SOURCE IP VALIDATION (fail-fast: check before any other processing) ---
        if (remote?.address) {
            if (!isIpAllowed(remote.address, globals.udpAllowedIPs, globals.udpEnableSourceValidation)) {
                rejectThrottle.logRejection(remote.address, remote.port, globals.logger, '[QSEOW] UDP HANDLER:');
                return;
            }
        }

        // --- PAYLOAD SIZE VALIDATION (using queue manager) ---
        if (!globals.udpQueueManager.validateMessageSize(message)) {
            const messageSize = Buffer.isBuffer(message) ? message.length : Buffer.byteLength(message);
            globals.logger.warn(
                `[QSEOW] UDP HANDLER: Message size (${messageSize} bytes) exceeds maximum allowed (${globals.udpMaxMessageSize} bytes). Rejecting.`,
            );
            await globals.udpQueueManager.handleSizeDrop();
            return;
        }

        // --- RATE LIMIT CHECK ---
        if (!globals.udpQueueManager.checkRateLimit()) {
            await globals.udpQueueManager.handleRateLimitDrop();
            return;
        }

        try {
            const msg = message.toString().split(';');
            const originalMsgForCompare = JSON.stringify(msg);

            const { executionId, messageType, usesExecutionId } = getMessageEnvelope(msg);

            if (usesExecutionId && !executionId) {
                globals.logger.debug(
                    `[QSEOW] UDP HANDLER: Scheduler message type ${messageType} has no executionId. Skipping deduplication for this message.`,
                );
            }

            // --- ADD TO QUEUE FOR PROCESSING ---
            const queueOutcome = await globals.udpQueueManager.enqueueDeduplicated(executionId, async () => {
                const sanitizedMsg = sanitizeMessage(msg, 500);

                sanitizedMessageText = sanitizedMsg.join(';');

                globals.logger.verbose(`[QSEOW] UDP HANDLER: UDP message received: ${sanitizedMessageText}`);

                if (JSON.stringify(sanitizedMsg) !== originalMsgForCompare) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER: Message sanitized (control chars removed/length truncated). Sanitized: ${sanitizedMessageText.substring(0, 200)}...`,
                    );
                }

                return processSanitizedUdpMessage(messageType, sanitizedMsg, sanitizedMessageText);
            });

            if (queueOutcome === 'duplicate') {
                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER: Duplicate message detected (executionId=${executionId}). Skipping processing.`,
                );
                return;
            }

            if (queueOutcome === 'queue_full') {
                // Message was dropped (queue full)
                return;
            }
        } catch (err) {
            globals.logger.error(
                `[QSEOW] UDP HANDLER: Failed processing log event. No action will be taken for this event. Error: ${globals.getErrorMessage(err)}`,
            );
            if (!sanitizedMessageText) {
                sanitizedMessageText = sanitizeMessage(message.toString().split(';'), 500).join(';');
            }
            globals.logger.error(`[QSEOW] UDP HANDLER: Incoming log message was\n${sanitizedMessageText}`);
        }
    });
};

export default udpInitTaskErrorServer;
