import _ from 'lodash';

import globals from '../../globals.js';

/**
 * Sends successful reload task notifications to InfluxDB.
 *
 * Collects static tags from config, builds a datapoint with task metadata and log details,
 * and appends script log data (head/tail) if available. Supports dynamic app/task tags
 * and static tags defined in the config file.
 *
 * @param {Object} reloadParams Reload task success parameters.
 * @param {string} reloadParams.host Host name.
 * @param {string} reloadParams.user User name.
 * @param {string} reloadParams.taskId Task ID.
 * @param {string} reloadParams.taskName Task name.
 * @param {string} reloadParams.appId Application ID.
 * @param {string} reloadParams.appName Application name.
 * @param {string} reloadParams.logTimeStamp Log timestamp.
 * @param {string} reloadParams.logLevel Log level.
 * @param {string} reloadParams.executionId Execution ID.
 * @param {string} reloadParams.logMessage Log message.
 * @param {Object} reloadParams.taskInfo Task execution information from QRS.
 * @param {Object} [reloadParams.scriptLog] Script log data (optional).
 * @param {string[]} [reloadParams.appTags] Application tags.
 * @param {string[]} [reloadParams.taskTags] Task tags.
 * @returns {void}
 */
export function postReloadTaskSuccessNotificationInfluxDb(reloadParams) {
    try {
        globals.logger.verbose('[QSEOW] RELOAD TASK SUCCESS: Sending reload task notification to InfluxDB');

        // Initialize an empty tags object to accumulate all tag key-value pairs for the InfluxDB measurement
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Iterate over the global static tags array from config and add each tag key/value to the tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Attach task-specific dimensional tags that uniquely identify the successful reload task execution
        // These tags enable filtering and grouping in InfluxDB queries by host, user, app, task, and log level
        tags.host = reloadParams.host;
        tags.user = reloadParams.user;
        tags.task_id = reloadParams.taskId;
        tags.task_name = reloadParams.taskName;
        tags.app_id = reloadParams.appId;
        tags.app_name = reloadParams.appName;
        tags.log_level = reloadParams.logLevel;

        // Construct the InfluxDB datapoint array with measurement name, accumulated tags, and core log fields.
        // The measurement 'reload_task_success' routes this data to the correct series in InfluxDB
        let datapoint = [
            {
                measurement: 'reload_task_success',
                tags: tags,
                fields: {
                    log_timestamp: reloadParams.logTimeStamp,
                    execution_id: reloadParams.executionId,
                    log_message: reloadParams.logMessage,
                },
            },
        ];

        // Get task info
        const { taskInfo } = reloadParams;

        globals.logger.debug(`[QSEOW] RELOAD TASK SUCCESS: Task info:\n${JSON.stringify(taskInfo, null, 2)}`);

        // Get script logs
        const scriptLogData = reloadParams.scriptLog;

        // Handle case where scriptLog retrieval failed
        if (scriptLogData === null || scriptLogData === undefined) {
            globals.logger.warn(
                `[QSEOW] RELOAD TASK SUCCESS INFLUXDB: Script log data is not available. InfluxDB entry will be stored without script log details.`,
            );

            // Use task info to enrich log entry sent to InfluxDB
            // Extract node name and execution status details from task info since script log is unavailable
            datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
            datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
            datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

            // Serialize the execution start/stop time objects to JSON strings for InfluxDB storage
            // since InfluxDB only accepts primitive field values
            datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
            datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

            // Serialize the full duration object to JSON for detailed duration inspection
            datapoint[0].fields.task_executionDuration_json = JSON.stringify(taskInfo.executionDuration);

            // Add execution duration in seconds
            datapoint[0].fields.task_executionDuration_sec =
                taskInfo.executionDuration.hours * 3600 + taskInfo.executionDuration.minutes * 60 + taskInfo.executionDuration.seconds;

            // Add execution duration in minutes
            datapoint[0].fields.task_executionDuration_min =
                taskInfo.executionDuration.hours * 60 + taskInfo.executionDuration.minutes + taskInfo.executionDuration.seconds / 60;

            // Add execution duration in hours
            datapoint[0].fields.task_executionDuration_h =
                taskInfo.executionDuration.hours + taskInfo.executionDuration.minutes / 60 + taskInfo.executionDuration.seconds / 3600;

            // Set minimal fields without script log data
            // These default values indicate no script log was captured
            datapoint[0].fields.task_scriptLogSize = 0;
            datapoint[0].fields.task_scriptLogHeadCount = 0;
            datapoint[0].fields.task_scriptLogTailCount = 0;
            datapoint[0].fields.scriptLog = 'Script log not available';
        } else {
            // Reduce script log lines to only the ones we want to send to InfluxDB
            scriptLogData.scriptLogHeadCount = globals.config.get('Butler.influxDb.reloadTaskSuccess.headScriptLogLines');
            scriptLogData.scriptLogTailCount = globals.config.get('Butler.influxDb.reloadTaskSuccess.tailScriptLogLines');

            if (scriptLogData?.scriptLogFull?.length > 0) {
                // Take the first N lines as the head of the script log for context
                scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

                // Take the last N lines as the tail of the script log (typically where errors occur)
                scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                    .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                    .join('\r\n');
            } else {
                scriptLogData.scriptLogHead = '';
                scriptLogData.scriptLogTail = '';
            }

            globals.logger.debug(`[QSEOW] RELOAD TASK SUCCESS: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

            // Use script log data to enrich log entry sent to InfluxDB
            // Extract node name and execution status details from the script log to tag the datapoint
            datapoint[0].tags.task_executingNodeName = scriptLogData.executingNodeName;
            datapoint[0].tags.task_executionStatusNum = scriptLogData.executionStatusNum;
            datapoint[0].tags.task_exeuctionStatusText = scriptLogData.executionStatusText;

            // Serialize the execution start/stop time objects to JSON strings for InfluxDB storage
            // since InfluxDB only accepts primitive field values
            datapoint[0].fields.task_executionStartTime_json = JSON.stringify(scriptLogData.executionStartTime);
            datapoint[0].fields.task_executionStopTime_json = JSON.stringify(scriptLogData.executionStopTime);

            // Serialize the full duration object to JSON for detailed duration inspection
            datapoint[0].fields.task_executionDuration_json = JSON.stringify(scriptLogData.executionDuration);

            // Add execution duration in seconds
            datapoint[0].fields.task_executionDuration_sec =
                scriptLogData.executionDuration.hours * 3600 +
                scriptLogData.executionDuration.minutes * 60 +
                scriptLogData.executionDuration.seconds;

            // Add execution duration in minutes
            datapoint[0].fields.task_executionDuration_min =
                scriptLogData.executionDuration.hours * 60 +
                scriptLogData.executionDuration.minutes +
                scriptLogData.executionDuration.seconds / 60;

            // Add execution duration in hours
            datapoint[0].fields.task_executionDuration_h =
                scriptLogData.executionDuration.hours +
                scriptLogData.executionDuration.minutes / 60 +
                scriptLogData.executionDuration.seconds / 3600;

            // Store the total script log size and counts of head/tail lines for reporting
            datapoint[0].fields.task_scriptLogSize = scriptLogData.scriptLogSize;
            datapoint[0].fields.task_scriptLogHeadCount = scriptLogData.scriptLogHeadCount;
            datapoint[0].fields.task_scriptLogTailCount = scriptLogData.scriptLogTailCount;

            // Set main log message
            // Concatenate execution details with both the script log head (beginning) and tail (end)
            // to provide full execution context in InfluxDB for post-mortem analysis
            const msg = `${scriptLogData.executionDetailsConcatenated}\r\n---------- SCRIPT LOG HEAD (${scriptLogData.scriptLogHeadCount} lines) ----------\r\n${scriptLogData.scriptLogHead}\r\n\r\n---------- SCRIPT LOG TAIL (${scriptLogData.scriptLogTailCount} lines) ----------\r\n${scriptLogData.scriptLogTail}`;
            datapoint[0].fields.scriptLog = msg;
            datapoint[0].fields.reload_log = msg;
        }

        // Should app tags be included?
        // Check if dynamic app tags are enabled in config, and if so, iterate over appTags to
        // add each one as a boolean tag (e.g., appTag_production = "true") on the datapoint
        if (globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags') === true) {
            // Add app tags to InfluxDB datapoint
            if (reloadParams.appTags) {
                for (const item of reloadParams.appTags) {
                    datapoint[0].tags[`appTag_${item}`] = 'true';
                }
            }
        }

        // Should task tags be included?
        // Check if dynamic task tags are enabled in config, and if so, iterate over taskTags to
        // add each one as a boolean tag (e.g., taskTag_critical = "true") on the datapoint
        if (globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (reloadParams.taskTags) {
                for (const item of reloadParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        // These are function-specific static tags from the config (e.g., environment, datacenter)
        // that apply specifically to reload task success notifications
        const staticTags = globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        // Deep clone the datapoint to prevent mutation of the original object reference
        // This ensures immutability so the original datapoint can still be logged for debugging
        // after the InfluxDB write completes
        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        // Asynchronously write the datapoint to InfluxDB via the writePoints API
        // then log the result (success or error) in the promise handlers
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                // Log the full datapoint at silly level for maximum debug detail
                globals.logger.silly(
                    `[QSEOW] RELOAD TASK SUCCESS: Influxdb datapoint for reload task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                // Nullify the reference to allow garbage collection and log completion
                datapoint = null;
                globals.logger.verbose('[QSEOW] RELOAD TASK SUCCESS: Sent reload task notification to InfluxDB');
            })
            .catch((err) => {
                // Log the error with full stack trace information from globals.getErrorMessage()
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] RELOAD TASK SUCCESS: Error saving reload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] RELOAD TASK SUCCESS: Error saving reload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(`[QSEOW] RELOAD TASK SUCCESS: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends successful user sync task notifications to InfluxDB.
 *
 * Collects static tags from config, builds a datapoint with task metadata and execution details,
 * and supports dynamic task tags and static tags defined in the config file.
 *
 * @param {Object} userSyncParams User sync task success parameters.
 * @param {string} userSyncParams.host Host name.
 * @param {string} userSyncParams.user User name.
 * @param {string} userSyncParams.taskId Task ID.
 * @param {string} userSyncParams.taskName Task name.
 * @param {string} userSyncParams.logTimeStamp Log timestamp.
 * @param {string} userSyncParams.logLevel Log level.
 * @param {string} userSyncParams.executionId Execution ID.
 * @param {string} userSyncParams.logMessage Log message.
 * @param {Object} userSyncParams.taskInfo Task execution information from QRS.
 * @param {string[]} [userSyncParams.taskTags] Task tags.
 * @returns {void}
 */
export function postUserSyncTaskSuccessNotificationInfluxDb(userSyncParams) {
    try {
        globals.logger.verbose('[QSEOW] USER SYNC TASK SUCCESS: Sending user sync task notification to InfluxDB');

        // Initialize an empty tags object to accumulate all tag key-value pairs for the InfluxDB measurement
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Iterate over the global static tags array from config and add each tag key/value to the tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Attach task-specific dimensional tags that uniquely identify the successful user sync task execution
        // These tags enable filtering and grouping in InfluxDB queries by host, user, task, and log level
        tags.host = userSyncParams.host;
        tags.user = userSyncParams.user;
        tags.task_id = userSyncParams.taskId;
        tags.task_name = userSyncParams.taskName;
        tags.log_level = userSyncParams.logLevel;

        // Construct the InfluxDB datapoint array with measurement name, accumulated tags, and core log fields.
        // The measurement 'user_sync_task_success' routes this data to the correct series in InfluxDB
        let datapoint = [
            {
                measurement: 'user_sync_task_success',
                tags: tags,
                fields: {
                    log_timestamp: userSyncParams.logTimeStamp,
                    execution_id: userSyncParams.executionId,
                    log_message: userSyncParams.logMessage,
                },
            },
        ];

        // Get task info
        const { taskInfo } = userSyncParams;

        globals.logger.debug(`[QSEOW] USER SYNC TASK SUCCESS: Task info:\n${JSON.stringify(taskInfo, null, 2)}`);

        // Use task info to enrich log entry sent to InfluxDB
        // Extract node name and execution status details from task info to tag the datapoint
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        // Serialize the execution start/stop time objects to JSON strings for InfluxDB storage
        // since InfluxDB only accepts primitive field values
        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

        // Serialize the full duration object to JSON for detailed duration inspection
        datapoint[0].fields.task_executionDuration_json = JSON.stringify(taskInfo.executionDuration);

        // Add execution duration in seconds
        datapoint[0].fields.task_executionDuration_sec =
            taskInfo.executionDuration.hours * 3600 + taskInfo.executionDuration.minutes * 60 + taskInfo.executionDuration.seconds;

        // Add execution duration in minutes
        datapoint[0].fields.task_executionDuration_min =
            taskInfo.executionDuration.hours * 60 + taskInfo.executionDuration.minutes + taskInfo.executionDuration.seconds / 60;

        // Add execution duration in hours
        datapoint[0].fields.task_executionDuration_h =
            taskInfo.executionDuration.hours + taskInfo.executionDuration.minutes / 60 + taskInfo.executionDuration.seconds / 3600;

        // Should task tags be included?
        // Check if dynamic task tags are enabled in config, and if so, iterate over taskTags to
        // add each one as a boolean tag (e.g., taskTag_critical = "true") on the datapoint
        if (globals.config.get('Butler.influxDb.userSyncTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (userSyncParams.taskTags) {
                for (const item of userSyncParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        // These are function-specific static tags from the config (e.g., environment, datacenter)
        // that apply specifically to user sync task success notifications
        const staticTags = globals.config.get('Butler.influxDb.userSyncTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        // Deep clone the datapoint to prevent mutation of the original object reference
        // This ensures immutability so the original datapoint can still be logged for debugging
        // after the InfluxDB write completes
        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        // Asynchronously write the datapoint to InfluxDB via the writePoints API
        // then log the result (success or error) in the promise handlers
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                // Log the full datapoint at silly level for maximum debug detail
                globals.logger.silly(
                    `[QSEOW] USER SYNC TASK SUCCESS: Influxdb datapoint for user sync task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                // Nullify the reference to allow garbage collection and log completion
                datapoint = null;
                globals.logger.verbose('[QSEOW] USER SYNC TASK SUCCESS: Sent user sync task notification to InfluxDB');
            })
            .catch((err) => {
                // Log the error with full stack trace information from globals.getErrorMessage()
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] USER SYNC TASK SUCCESS: Error saving user sync task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] USER SYNC TASK SUCCESS: Error saving user sync task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(`[QSEOW] USER SYNC TASK SUCCESS: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends successful external program task notifications to InfluxDB.
 *
 * Collects static tags from config, builds a datapoint with task metadata and execution details,
 * and supports dynamic task tags and static tags defined in the config file.
 *
 * @param {Object} externalProgramParams External program task success parameters.
 * @param {string} externalProgramParams.host Host name.
 * @param {string} externalProgramParams.user User name.
 * @param {string} externalProgramParams.taskId Task ID.
 * @param {string} externalProgramParams.taskName Task name.
 * @param {string} externalProgramParams.logTimeStamp Log timestamp.
 * @param {string} externalProgramParams.logLevel Log level.
 * @param {string} externalProgramParams.executionId Execution ID.
 * @param {string} externalProgramParams.logMessage Log message.
 * @param {Object} externalProgramParams.taskInfo Task execution information from QRS.
 * @param {string[]} [externalProgramParams.taskTags] Task tags.
 * @returns {void}
 */
export function postExternalProgramTaskSuccessNotificationInfluxDb(externalProgramParams) {
    try {
        globals.logger.verbose('[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Sending external program task notification to InfluxDB');

        // Initialize an empty tags object to accumulate all tag key-value pairs for the InfluxDB measurement
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Iterate over the global static tags array from config and add each tag key/value to the tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Attach task-specific dimensional tags that uniquely identify the successful external program task execution
        // These tags enable filtering and grouping in InfluxDB queries by host, user, task, and log level
        tags.host = externalProgramParams.host;
        tags.user = externalProgramParams.user;
        tags.task_id = externalProgramParams.taskId;
        tags.task_name = externalProgramParams.taskName;
        tags.log_level = externalProgramParams.logLevel;

        // Construct the InfluxDB datapoint array with measurement name, accumulated tags, and core log fields.
        // The measurement 'external_program_task_success' routes this data to the correct series in InfluxDB
        let datapoint = [
            {
                measurement: 'external_program_task_success',
                tags: tags,
                fields: {
                    log_timestamp: externalProgramParams.logTimeStamp,
                    execution_id: externalProgramParams.executionId,
                    log_message: externalProgramParams.logMessage,
                },
            },
        ];

        // Get task info
        const { taskInfo } = externalProgramParams;

        globals.logger.debug(`[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Task info:\n${JSON.stringify(taskInfo, null, 2)}`);

        // Use task info to enrich log entry sent to InfluxDB
        // Extract node name and execution status details from task info to tag the datapoint
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        // Serialize the execution start/stop time objects to JSON strings for InfluxDB storage
        // since InfluxDB only accepts primitive field values
        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

        // Serialize the full duration object to JSON for detailed duration inspection
        datapoint[0].fields.task_executionDuration_json = JSON.stringify(taskInfo.executionDuration);

        // Add execution duration in seconds
        datapoint[0].fields.task_executionDuration_sec =
            taskInfo.executionDuration.hours * 3600 + taskInfo.executionDuration.minutes * 60 + taskInfo.executionDuration.seconds;

        // Add execution duration in minutes
        datapoint[0].fields.task_executionDuration_min =
            taskInfo.executionDuration.hours * 60 + taskInfo.executionDuration.minutes + taskInfo.executionDuration.seconds / 60;

        // Add execution duration in hours
        datapoint[0].fields.task_executionDuration_h =
            taskInfo.executionDuration.hours + taskInfo.executionDuration.minutes / 60 + taskInfo.executionDuration.seconds / 3600;

        // Should task tags be included?
        // Check if dynamic task tags are enabled in config, and if so, iterate over taskTags to
        // add each one as a boolean tag (e.g., taskTag_critical = "true") on the datapoint
        if (globals.config.get('Butler.influxDb.externalProgramTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (externalProgramParams.taskTags) {
                for (const item of externalProgramParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        // These are function-specific static tags from the config (e.g., environment, datacenter)
        // that apply specifically to external program task success notifications
        const staticTags = globals.config.get('Butler.influxDb.externalProgramTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        // Deep clone the datapoint to prevent mutation of the original object reference
        // This ensures immutability so the original datapoint can still be logged for debugging
        // after the InfluxDB write completes
        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        // Asynchronously write the datapoint to InfluxDB via the writePoints API
        // then log the result (success or error) in the promise handlers
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                // Log the full datapoint at silly level for maximum debug detail
                globals.logger.silly(
                    `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Influxdb datapoint for external program task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                // Nullify the reference to allow garbage collection and log completion
                datapoint = null;
                globals.logger.verbose('[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Sent external program task notification to InfluxDB');
            })
            .catch((err) => {
                // Log the error with full stack trace information from globals.getErrorMessage()
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Error saving external program task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Error saving external program task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(`[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: ${globals.getErrorMessage(err)}`);
        globals.logger.error(`[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: ${err.stack}`);
    }
}

/**
 * Store distribute task success info in InfluxDB
 *
 * @param {Object} distributeParams - Distribute task success parameters
 * @param {string} distributeParams.host - Host name
 * @param {string} distributeParams.user - User name
 * @param {string} distributeParams.taskId - Task ID
 * @param {string} distributeParams.taskName - Task name
 * @param {string} distributeParams.logTimeStamp - Log timestamp
 * @param {string} distributeParams.logLevel - Log level
 * @param {string} distributeParams.executionId - Execution ID
 * @param {string} distributeParams.logMessage - Log message
 * @param {Array<string>} distributeParams.taskTags - Task tags array
 * @param {Object} distributeParams.taskInfo - Task execution info from QRS
 */
export function postDistributeTaskSuccessNotificationInfluxDb(distributeParams) {
    try {
        globals.logger.verbose('[QSEOW] DISTRIBUTE TASK SUCCESS: Sending distribute task notification to InfluxDB');

        // Initialize an empty tags object to accumulate all tag key-value pairs for the InfluxDB measurement
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Iterate over the global static tags array from config and add each tag key/value to the tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Attach task-specific dimensional tags that uniquely identify the successful distribute task execution
        // These tags enable filtering and grouping in InfluxDB queries by host, user, app, task, and log level
        tags.host = distributeParams.host;
        tags.user = distributeParams.user;
        tags.task_id = distributeParams.taskId;
        tags.task_name = distributeParams.taskName;
        tags.log_level = distributeParams.logLevel;
        tags.app_id = distributeParams?.qs_taskMetadata?.app?.id;
        tags.app_name = distributeParams?.qs_taskMetadata?.app?.name;

        // Construct the InfluxDB datapoint array with measurement name, accumulated tags, and core log fields.
        // The measurement 'distribute_task_success' routes this data to the correct series in InfluxDB
        let datapoint = [
            {
                measurement: 'distribute_task_success',
                tags: tags,
                fields: {
                    log_timestamp: distributeParams.logTimeStamp,
                    execution_id: distributeParams.executionId,
                    log_message: distributeParams.logMessage,
                },
            },
        ];

        // Get task info
        const { taskInfo } = distributeParams;

        globals.logger.debug(`[QSEOW] DISTRIBUTE TASK SUCCESS: Task info:\n${JSON.stringify(taskInfo, null, 2)}`);

        // Use task info to enrich log entry sent to InfluxDB
        // Extract node name and execution status details from task info to tag the datapoint
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        // Serialize the execution start/stop time objects to JSON strings for InfluxDB storage
        // since InfluxDB only accepts primitive field values
        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

        // Serialize the full duration object to JSON for detailed duration inspection
        datapoint[0].fields.task_executionDuration_json = JSON.stringify(taskInfo.executionDuration);

        // Add execution duration in seconds
        datapoint[0].fields.task_executionDuration_sec =
            taskInfo.executionDuration.hours * 3600 + taskInfo.executionDuration.minutes * 60 + taskInfo.executionDuration.seconds;

        // Add execution duration in minutes
        datapoint[0].fields.task_executionDuration_min =
            taskInfo.executionDuration.hours * 60 + taskInfo.executionDuration.minutes + taskInfo.executionDuration.seconds / 60;

        // Add execution duration in hours
        datapoint[0].fields.task_executionDuration_h =
            taskInfo.executionDuration.hours + taskInfo.executionDuration.minutes / 60 + taskInfo.executionDuration.seconds / 3600;

        // Should task tags be included?
        // Check if dynamic task tags are enabled in config, and if so, iterate over taskTags to
        // add each one as a boolean tag (e.g., taskTag_critical = "true") on the datapoint
        if (globals.config.get('Butler.influxDb.distributeTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (distributeParams.taskTags) {
                for (const item of distributeParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        // These are function-specific static tags from the config (e.g., environment, datacenter)
        // that apply specifically to distribute task success notifications
        const staticTags = globals.config.get('Butler.influxDb.distributeTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        // Deep clone the datapoint to prevent mutation of the original object reference
        // This ensures immutability so the original datapoint can still be logged for debugging
        // after the InfluxDB write completes
        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        // Asynchronously write the datapoint to InfluxDB via the writePoints API
        // then log the result (success or error) in the promise handlers
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                // Log the full datapoint at silly level for maximum debug detail
                globals.logger.silly(
                    `[QSEOW] DISTRIBUTE TASK SUCCESS: Influxdb datapoint for distribute task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                // Nullify the reference to allow garbage collection and log completion
                datapoint = null;
                globals.logger.verbose('[QSEOW] DISTRIBUTE TASK SUCCESS: Sent distribute task notification to InfluxDB');
            })

            .catch((err) => {
                // Log the error with full stack trace information from globals.getErrorMessage()
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] DISTRIBUTE TASK SUCCESS: Error saving distribute task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] DISTRIBUTE TASK SUCCESS: Error saving distribute task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(
                `[QSEOW] DISTRIBUTE TASK SUCCESS: Error processing distribute task success notification to InfluxDB! ${globals.getErrorMessage(err)}`,
            );
        } else {
            globals.logger.error(
                `[QSEOW] DISTRIBUTE TASK SUCCESS: Error processing distribute task success notification to InfluxDB! ${globals.getErrorMessage(err)}`,
            );
        }
        globals.logger.error(`[QSEOW] DISTRIBUTE TASK SUCCESS: ${err.stack}`);
    }
}

/**
 * Sends successful preload task notifications to InfluxDB.
 *
 * Collects static tags from config, builds a datapoint with task metadata and execution details,
 * and supports dynamic task tags and static tags defined in the config file.
 *
 * @param {Object} preloadParams Preload task success parameters.
 * @param {string} preloadParams.host Host name.
 * @param {string} preloadParams.user User name.
 * @param {string} preloadParams.taskId Task ID.
 * @param {string} preloadParams.taskName Task name.
 * @param {string} preloadParams.logTimeStamp Log timestamp.
 * @param {string} preloadParams.logLevel Log level.
 * @param {string} preloadParams.executionId Execution ID.
 * @param {string} preloadParams.logMessage Log message.
 * @param {Object} [preloadParams.qs_taskMetadata] Task metadata from QRS.
 * @param {Object} preloadParams.taskInfo Task execution information from QRS.
 * @param {string[]} [preloadParams.taskTags] Task tags.
 * @returns {void}
 */
export function postPreloadTaskSuccessNotificationInfluxDb(preloadParams) {
    try {
        globals.logger.verbose('[QSEOW] PRELOAD TASK SUCCESS: Sending preload task notification to InfluxDB');

        // Initialize an empty tags object to accumulate all tag key-value pairs for the InfluxDB measurement
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Iterate over the global static tags array from config and add each tag key/value to the tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Attach task-specific dimensional tags that uniquely identify the successful preload task execution
        // These tags enable filtering and grouping in InfluxDB queries by host, user, app, task, and log level
        tags.host = preloadParams.host;
        tags.user = preloadParams.user;
        tags.task_id = preloadParams.taskId;
        tags.task_name = preloadParams.taskName;
        tags.log_level = preloadParams.logLevel;
        tags.app_id = preloadParams?.qs_taskMetadata?.app?.id;
        tags.app_name = preloadParams?.qs_taskMetadata?.app?.name;

        // Construct the InfluxDB datapoint array with measurement name, accumulated tags, and core log fields.
        // The measurement 'preload_task_success' routes this data to the correct series in InfluxDB
        let datapoint = [
            {
                measurement: 'preload_task_success',
                tags: tags,
                fields: {
                    log_timestamp: preloadParams.logTimeStamp,
                    execution_id: preloadParams.executionId,
                    log_message: preloadParams.logMessage,
                },
            },
        ];

        // Get task info
        const { taskInfo } = preloadParams;

        globals.logger.debug(`[QSEOW] PRELOAD TASK SUCCESS: Task info:\n${JSON.stringify(taskInfo, null, 2)}`);

        // Use task info to enrich log entry sent to InfluxDB
        // Extract node name and execution status details from task info to tag the datapoint
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        // Serialize the execution start/stop time objects to JSON strings for InfluxDB storage
        // since InfluxDB only accepts primitive field values
        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

        // Serialize the full duration object to JSON for detailed duration inspection
        datapoint[0].fields.task_executionDuration_json = JSON.stringify(taskInfo.executionDuration);

        // Add execution duration in seconds
        datapoint[0].fields.task_executionDuration_sec =
            taskInfo.executionDuration.hours * 3600 + taskInfo.executionDuration.minutes * 60 + taskInfo.executionDuration.seconds;

        // Add execution duration in minutes
        datapoint[0].fields.task_executionDuration_min =
            taskInfo.executionDuration.hours * 60 + taskInfo.executionDuration.minutes + taskInfo.executionDuration.seconds / 60;

        // Add execution duration in hours
        datapoint[0].fields.task_executionDuration_h =
            taskInfo.executionDuration.hours + taskInfo.executionDuration.minutes / 60 + taskInfo.executionDuration.seconds / 3600;

        // Should task tags be included?
        // Check if dynamic task tags are enabled in config, and if so, iterate over taskTags to
        // add each one as a boolean tag (e.g., taskTag_critical = "true") on the datapoint
        if (globals.config.get('Butler.influxDb.preloadTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (preloadParams.taskTags) {
                for (const item of preloadParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        // These are function-specific static tags from the config (e.g., environment, datacenter)
        // that apply specifically to preload task success notifications
        const staticTags = globals.config.get('Butler.influxDb.preloadTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        // Deep clone the datapoint to prevent mutation of the original object reference
        // This ensures immutability so the original datapoint can still be logged for debugging
        // after the InfluxDB write completes
        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        // Asynchronously write the datapoint to InfluxDB via the writePoints API
        // then log the result (success or error) in the promise handlers
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                // Log the full datapoint at silly level for maximum debug detail
                globals.logger.silly(
                    `[QSEOW] PRELOAD TASK SUCCESS: Influxdb datapoint for preload task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                // Nullify the reference to allow garbage collection and log completion
                datapoint = null;
                globals.logger.verbose('[QSEOW] PRELOAD TASK SUCCESS: Sent preload task notification to InfluxDB');
            })
            .catch((err) => {
                // Log the error with full stack trace information from globals.getErrorMessage()
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] PRELOAD TASK SUCCESS: Error saving preload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] PRELOAD TASK SUCCESS: Error saving preload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(
                `[QSEOW] PRELOAD TASK SUCCESS: Error processing preload task success notification to InfluxDB! ${globals.getErrorMessage(err)}`,
            );
        } else {
            globals.logger.error(
                `[QSEOW] PRELOAD TASK SUCCESS: Error processing preload task success notification to InfluxDB! ${globals.getErrorMessage(err)}`,
            );
        }
        globals.logger.error(`[QSEOW] PRELOAD TASK SUCCESS: ${err.stack}`);
    }
}
