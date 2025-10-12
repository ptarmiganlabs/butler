// Load global variables and functions
import globals from '../globals.js';
import schedulerAborted from './handlers/scheduler_aborted.js';
import schedulerFailed from './handlers/scheduler_failed.js';
import schedulerTaskSuccess from './handlers/scheduler_success.js';
import distributeTaskCompletion from './handlers/distribute_task_completion.js';

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
            globals.logger.verbose(`[QSEOW] UDP HANDLER: UDP message received: ${message.toString()}`);

            const msg = message.toString().split(';');

            if (msg[0].toLowerCase() === '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 9) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Invalid number of fields in UDP message. Expected 9, got ${msg.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Aborting processing of this message.`);
                    return;
                }

                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER ENGINE RELOAD FAILED: Received reload failed UDP message from engine: Host=${msg[1]}, AppID=${msg[2]}, User directory=${msg[4]}, User=${msg[5]}`,
                );
            } else if (msg[0].toLowerCase() === '/scheduler-distribute/') {
                // Scheduler log appender detecting distribute task event (success, failed)

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length < 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Invalid number of fields in UDP message. Expected at least 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Aborting processing of this message.`);
                    return;
                }

                globals.logger.verbose(
                    `[QSEOW] UDP HANDLER SCHEDULER DISTRIBUTE: Received distribute task UDP message from scheduler: Host=${msg[1]}, TaskName=${msg[2]}, AppName=${msg[3]}, User=${msg[4]}, TaskID=${msg[5]}, AppID=${msg[6]}, ExecutionID=${msg[9]}, Message=${msg[10]}`,
                );

                distributeTaskCompletion(msg);
            } else if (
                msg[0].toLowerCase() === '/scheduler-reload-failed/' ||
                msg[0].toLowerCase() === '/scheduler-task-failed/' ||
                msg[0].toLowerCase() === '/scheduler-reloadtask-failed/'
            ) {
                // Scheduler log appender detecting failed tasks

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Invalid number of fields in UDP message. Expected 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD FAILED: Aborting processing of this message.`);
                    return;
                }

                schedulerFailed(msg);
            } else if (msg[0].toLowerCase() === '/scheduler-reload-aborted/' || msg[0].toLowerCase() === '/scheduler-task-aborted/') {
                // Scheduler log appender detecting aborted tasks

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Invalid number of fields in UDP message. Expected 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER RELOAD ABORTED: Aborting processing of this message.`);
                    return;
                }

                schedulerAborted(msg);
            } else if (msg[0].toLowerCase() === '/scheduler-reloadtask-success/' || msg[0].toLowerCase() === '/scheduler-task-success/') {
                // Scheduler log appender detecting successful tasks
                // Support both legacy /scheduler-reloadtask-success/ and new generic /scheduler-task-success/ message types

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 11) {
                    globals.logger.warn(
                        `[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Invalid number of fields in UDP message. Expected 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`[QSEOW] UDP HANDLER SCHEDULER TASK SUCCESS: Aborting processing of this message.`);
                    return;
                }
                schedulerTaskSuccess(msg);
            } else {
                globals.logger.warn(`[QSEOW] UDP HANDLER: Unknown UDP message type: "${msg[0]}"`);
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
