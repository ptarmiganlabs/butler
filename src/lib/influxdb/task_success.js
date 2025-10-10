import _ from 'lodash';

import globals from '../../globals.js';

// Store information about successful reload tasks to InfluxDB
export function postReloadTaskSuccessNotificationInfluxDb(reloadParams) {
    try {
        globals.logger.verbose('[QSEOW] RELOAD TASK SUCCESS: Sending reload task notification to InfluxDB');

        // Add tags
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Add static tags to tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Add additional tags
        tags.host = reloadParams.host;
        tags.user = reloadParams.user;
        tags.task_id = reloadParams.taskId;
        tags.task_name = reloadParams.taskName;
        tags.app_id = reloadParams.appId;
        tags.app_name = reloadParams.appName;
        tags.log_level = reloadParams.logLevel;

        // Build InfluxDB datapoint
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
            datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
            datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
            datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

            datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
            datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

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
            datapoint[0].fields.task_scriptLogSize = 0;
            datapoint[0].fields.task_scriptLogHeadCount = 0;
            datapoint[0].fields.task_scriptLogTailCount = 0;
            datapoint[0].fields.scriptLog = 'Script log not available';
        } else {
            // Reduce script log lines to only the ones we want to send to InfluxDB
            scriptLogData.scriptLogHeadCount = globals.config.get('Butler.influxDb.reloadTaskSuccess.headScriptLogLines');
            scriptLogData.scriptLogTailCount = globals.config.get('Butler.influxDb.reloadTaskSuccess.tailScriptLogLines');

            if (scriptLogData?.scriptLogFull?.length > 0) {
                scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

                scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                    .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                    .join('\r\n');
            } else {
                scriptLogData.scriptLogHead = '';
                scriptLogData.scriptLogTail = '';
            }

            globals.logger.debug(`[QSEOW] RELOAD TASK SUCCESS: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

            // Use script log data to enrich log entry sent to InfluxDB
            datapoint[0].tags.task_executingNodeName = scriptLogData.executingNodeName;
            datapoint[0].tags.task_executionStatusNum = scriptLogData.executionStatusNum;
            datapoint[0].tags.task_exeuctionStatusText = scriptLogData.executionStatusText;

            datapoint[0].fields.task_executionStartTime_json = JSON.stringify(scriptLogData.executionStartTime);
            datapoint[0].fields.task_executionStopTime_json = JSON.stringify(scriptLogData.executionStopTime);

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

            datapoint[0].fields.task_scriptLogSize = scriptLogData.scriptLogSize;
            datapoint[0].fields.task_scriptLogHeadCount = scriptLogData.scriptLogHeadCount;
            datapoint[0].fields.task_scriptLogTailCount = scriptLogData.scriptLogTailCount;

            // Set main log message with both head and tail
            const msg = `${scriptLogData.executionDetailsConcatenated}\r\n---------- SCRIPT LOG HEAD (${scriptLogData.scriptLogHeadCount} lines) ----------\r\n${scriptLogData.scriptLogHead}\r\n\r\n---------- SCRIPT LOG TAIL (${scriptLogData.scriptLogTailCount} lines) ----------\r\n${scriptLogData.scriptLogTail}`;
            datapoint[0].fields.scriptLog = msg;
            datapoint[0].fields.reload_log = msg;
        }

        // Should app tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags') === true) {
            // Add app tags to InfluxDB datapoint
            if (reloadParams.appTags) {
                for (const item of reloadParams.appTags) {
                    datapoint[0].tags[`appTag_${item}`] = 'true';
                }
            }
        }

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (reloadParams.taskTags) {
                for (const item of reloadParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                globals.logger.silly(
                    `[QSEOW] RELOAD TASK SUCCESS: Influxdb datapoint for reload task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] RELOAD TASK SUCCESS: Sent reload task notification to InfluxDB');
            })
            .catch((err) => {
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

// Store information about successful user sync tasks to InfluxDB
export function postUserSyncTaskSuccessNotificationInfluxDb(userSyncParams) {
    try {
        globals.logger.verbose('[QSEOW] USER SYNC TASK SUCCESS: Sending user sync task notification to InfluxDB');

        // Add tags
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Add static tags to tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Add additional tags
        tags.host = userSyncParams.host;
        tags.user = userSyncParams.user;
        tags.task_id = userSyncParams.taskId;
        tags.task_name = userSyncParams.taskName;
        tags.log_level = userSyncParams.logLevel;

        // Build InfluxDB datapoint
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
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

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
        if (globals.config.get('Butler.influxDb.userSyncTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (userSyncParams.taskTags) {
                for (const item of userSyncParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.userSyncTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                globals.logger.silly(
                    `[QSEOW] USER SYNC TASK SUCCESS: Influxdb datapoint for user sync task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] USER SYNC TASK SUCCESS: Sent user sync task notification to InfluxDB');
            })
            .catch((err) => {
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

// Store information about successful external program tasks to InfluxDB
export function postExternalProgramTaskSuccessNotificationInfluxDb(externalProgramParams) {
    try {
        globals.logger.verbose('[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Sending external program task notification to InfluxDB');

        // Add tags
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Add static tags to tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Add additional tags
        tags.host = externalProgramParams.host;
        tags.user = externalProgramParams.user;
        tags.task_id = externalProgramParams.taskId;
        tags.task_name = externalProgramParams.taskName;
        tags.log_level = externalProgramParams.logLevel;

        // Build InfluxDB datapoint
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
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

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
        if (globals.config.get('Butler.influxDb.externalProgramTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (externalProgramParams.taskTags) {
                for (const item of externalProgramParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.externalProgramTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                globals.logger.silly(
                    `[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Influxdb datapoint for external program task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] EXTERNAL PROGRAM TASK SUCCESS: Sent external program task notification to InfluxDB');
            })
            .catch((err) => {
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

        // Add tags
        let tags = {};

        // Get static tags as array from config file
        const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

        // Add static tags to tags object
        if (configStaticTags) {
            for (const item of configStaticTags) {
                tags[item.name] = item.value;
            }
        }

        // Add additional tags
        tags.host = distributeParams.host;
        tags.user = distributeParams.user;
        tags.task_id = distributeParams.taskId;
        tags.task_name = distributeParams.taskName;
        tags.log_level = distributeParams.logLevel;

        // Build InfluxDB datapoint
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
        datapoint[0].tags.task_executingNodeName = taskInfo.executingNodeName;
        datapoint[0].tags.task_executionStatusNum = taskInfo.executionStatusNum;
        datapoint[0].tags.task_exeuctionStatusText = taskInfo.executionStatusText;

        datapoint[0].fields.task_executionStartTime_json = JSON.stringify(taskInfo.executionStartTime);
        datapoint[0].fields.task_executionStopTime_json = JSON.stringify(taskInfo.executionStopTime);

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
        if (globals.config.get('Butler.influxDb.distributeTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            if (distributeParams.taskTags) {
                for (const item of distributeParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.distributeTaskSuccess.tag.static');
        if (staticTags) {
            for (const item of staticTags) {
                datapoint[0].tags[item.name] = item.value;
            }
        }

        const deepClonedDatapoint = _.cloneDeep(datapoint);

        // Send to InfluxDB
        globals.influx
            .writePoints(deepClonedDatapoint)

            .then(() => {
                globals.logger.silly(
                    `[QSEOW] DISTRIBUTE TASK SUCCESS: Influxdb datapoint for distribute task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] DISTRIBUTE TASK SUCCESS: Sent distribute task notification to InfluxDB');
            })

            .catch((err) => {
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
