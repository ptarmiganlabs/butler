import _ from 'lodash';

import globals from '../../globals.js';

// Store information about failed reload tasks to InfluxDB
export function postReloadTaskFailureNotificationInfluxDb(reloadParams) {
    try {
        globals.logger.info('[QSEOW] RELOAD TASK FAILED: Sending reload task notification to InfluxDB');

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
                measurement: 'reload_task_failed',
                tags: tags,
                fields: {
                    log_timestamp: reloadParams.logTimeStamp,
                    execution_id: reloadParams.executionId,
                    log_message: reloadParams.logMessage,
                },
            },
        ];

        // Get script logs
        const scriptLogData = reloadParams.scriptLog;

        // Handle case where scriptLog retrieval failed
        if (scriptLogData === null || scriptLogData === undefined) {
            globals.logger.warn(
                `[QSEOW] RELOAD TASK FAILED INFLUXDB: Script log data is not available. InfluxDB entry will be stored without script log details.`,
            );

            // Set minimal fields without script log data
            datapoint[0].tags.task_executingNodeName = 'unknown';
            datapoint[0].tags.task_executionStatusNum = -1;
            datapoint[0].tags.task_exeuctionStatusText = 'Script log not available';
            datapoint[0].fields.task_scriptLogSize = 0;
            datapoint[0].fields.task_scriptLogTailCount = 0;
            datapoint[0].fields.scriptLog = 'Script log not available';
        } else {
            // Reduce script log lines to only the ones we want to send to InfluxDB
            scriptLogData.scriptLogHeadCount = 0;
            scriptLogData.scriptLogTailCount = globals.config.get('Butler.influxDb.reloadTaskFailure.tailScriptLogLines');

            scriptLogData.scriptLogHead = '';
            if (scriptLogData?.scriptLogFull?.length > 0) {
                scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                    .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                    .join('\r\n');
            } else {
                scriptLogData.scriptLogTail = '';
            }

            globals.logger.debug(`[QSEOW] RELOAD TASK FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

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
            datapoint[0].fields.task_scriptLogTailCount = scriptLogData.scriptLogTailCount;

            // Set main log message
            const msg = `${scriptLogData.executionDetailsConcatenated}\r\n-------------------------------\r\n\r\n${scriptLogData.scriptLogTail}`;
            datapoint[0].fields.scriptLog = msg;
            datapoint[0].fields.reload_log = msg;
        }

        // Should app tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskFailure.tag.dynamic.useAppTags') === true) {
            if (reloadParams.appTags) {
                // Add app tags to InfluxDB datapoint
                for (const item of reloadParams.appTags) {
                    datapoint[0].tags[`appTag_${item}`] = 'true';
                }
            }
        }

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskFailure.tag.dynamic.useTaskTags') === true) {
            if (reloadParams.taskTags) {
                // Add task tags to InfluxDB datapoint
                for (const item of reloadParams.taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.reloadTaskFailure.tag.static');
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
                    `[QSEOW] RELOAD TASK FAILED: Influxdb datapoint for reload task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] RELOAD TASK FAILED: Sent reload task notification to InfluxDB');
            })
            .catch((err) => {
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] RELOAD TASK FAILED: Error saving reload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] RELOAD TASK FAILED: Error saving reload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(`[QSEOW] RELOAD TASK FAILED: ${globals.getErrorMessage(err)}`);
    }
}

// Store information about failed external program tasks to InfluxDB
export function postExternalProgramTaskFailureNotificationInfluxDb(taskParams) {
    try {
        globals.logger.info('[QSEOW] EXTERNAL PROGRAM TASK FAILED: Sending external program task notification to InfluxDB');

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
        tags.host = taskParams.host;
        tags.user = taskParams.user;
        tags.task_id = taskParams.taskId;
        tags.task_name = taskParams.taskName;
        tags.log_level = taskParams.logLevel;

        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'external_program_task_failed',
                tags: tags,
                fields: {
                    log_timestamp: taskParams.logTimeStamp,
                    execution_id: taskParams.executionId,
                    log_message: taskParams.logMessage,
                },
            },
        ];

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.externalProgramTaskFailure.tag.dynamic.useTaskTags') === true) {
            if (taskParams.qs_taskTags) {
                // Add task tags to InfluxDB datapoint
                for (const item of taskParams.qs_taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.externalProgramTaskFailure.tag.static');
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
                    `[QSEOW] EXTERNAL PROGRAM TASK FAILED: Influxdb datapoint for external program task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] EXTERNAL PROGRAM TASK FAILED: Sent external program task notification to InfluxDB');
            })
            .catch((err) => {
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] EXTERNAL PROGRAM TASK FAILED: Error saving external program task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] EXTERNAL PROGRAM TASK FAILED: Error saving external program task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(`[QSEOW] EXTERNAL PROGRAM TASK FAILED: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Store distribute task failure info in InfluxDB
 * @param {Object} taskParams - Distribute task failure parameters
 * @param {string} taskParams.host - Host name
 * @param {string} taskParams.user - User name
 * @param {string} taskParams.taskId - Task ID
 * @param {string} taskParams.taskName - Task name
 * @param {string} taskParams.logTimeStamp - Log timestamp
 * @param {string} taskParams.logLevel - Log level
 * @param {string} taskParams.executionId - Execution ID
 * @param {string} taskParams.logMessage - Log message
 * @param {Array<string>} taskParams.qs_taskTags - Task tags array
 * @param {Array<Object>} taskParams.qs_taskCustomProperties - Task custom properties array
 * @param {Object} taskParams.qs_taskMetadata - Task metadata from QRS
 */
export function postDistributeTaskFailureNotificationInfluxDb(taskParams) {
    try {
        globals.logger.info('[QSEOW] DISTRIBUTE TASK FAILED: Sending distribute task notification to InfluxDB');

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
        tags.host = taskParams.host;
        tags.user = taskParams.user;
        tags.task_id = taskParams.taskId;
        tags.task_name = taskParams.taskName;
        tags.log_level = taskParams.logLevel;

        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'distribute_task_failed',
                tags: tags,
                fields: {
                    log_timestamp: taskParams.logTimeStamp,
                    execution_id: taskParams.executionId,
                    log_message: taskParams.logMessage,
                },
            },
        ];

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.distributeTaskFailure.tag.dynamic.useTaskTags') === true) {
            if (taskParams.qs_taskTags) {
                // Add task tags to InfluxDB datapoint
                for (const item of taskParams.qs_taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.distributeTaskFailure.tag.static');
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
                    `[QSEOW] DISTRIBUTE TASK FAILED: Influxdb datapoint for distribute task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] DISTRIBUTE TASK FAILED: Sent distribute task notification to InfluxDB');
            })
            .catch((err) => {
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] DISTRIBUTE TASK FAILED: Error saving distribute task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] DISTRIBUTE TASK FAILED: Error saving distribute task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(
            `[QSEOW] DISTRIBUTE TASK FAILED: Error processing distribute task notification! ${globals.getErrorMessage(err)}`,
        );
    }
}

/**
 * Store preload task failure info in InfluxDB
 * @param {Object} taskParams - Preload task failure parameters
 * @param {string} taskParams.host - Host name
 * @param {string} taskParams.user - User name
 * @param {string} taskParams.taskId - Task ID
 * @param {string} taskParams.taskName - Task name
 * @param {string} taskParams.logTimeStamp - Log timestamp
 * @param {string} taskParams.logLevel - Log level
 * @param {string} taskParams.executionId - Execution ID
 * @param {string} taskParams.logMessage - Log message
 * @param {Array<string>} taskParams.qs_taskTags - Task tags array
 * @param {Array<Object>} taskParams.qs_taskCustomProperties - Task custom properties array
 * @param {Object} taskParams.qs_taskMetadata - Task metadata from QRS
 */
export function postPreloadTaskFailureNotificationInfluxDb(taskParams) {
    try {
        globals.logger.info('[QSEOW] PRELOAD TASK FAILED: Sending preload task notification to InfluxDB');

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
        tags.host = taskParams.host;
        tags.user = taskParams.user;
        tags.task_id = taskParams.taskId;
        tags.task_name = taskParams.taskName;
        tags.log_level = taskParams.logLevel;

        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'preload_task_failed',
                tags: tags,
                fields: {
                    log_timestamp: taskParams.logTimeStamp,
                    execution_id: taskParams.executionId,
                    log_message: taskParams.logMessage,
                },
            },
        ];

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.preloadTaskFailure.tag.dynamic.useTaskTags') === true) {
            if (taskParams.qs_taskTags) {
                // Add task tags to InfluxDB datapoint
                for (const item of taskParams.qs_taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.preloadTaskFailure.tag.static');
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
                    `[QSEOW] PRELOAD TASK FAILED: Influxdb datapoint for preload task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] PRELOAD TASK FAILED: Sent preload task notification to InfluxDB');
            })
            .catch((err) => {
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] PRELOAD TASK FAILED: Error saving preload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] PRELOAD TASK FAILED: Error saving preload task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(`[QSEOW] PRELOAD TASK FAILED: Error processing preload task notification! ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Store user sync task failure info in InfluxDB
 * @param {Object} taskParams - User sync task failure parameters
 * @param {string} taskParams.host - Host name
 * @param {string} taskParams.user - User name
 * @param {string} taskParams.taskId - Task ID
 * @param {string} taskParams.taskName - Task name
 * @param {string} taskParams.logTimeStamp - Log timestamp
 * @param {string} taskParams.logLevel - Log level
 * @param {string} taskParams.executionId - Execution ID
 * @param {string} taskParams.logMessage - Log message
 * @param {Array<string>} taskParams.qs_taskTags - Task tags array
 * @param {Array<Object>} taskParams.qs_taskCustomProperties - Task custom properties array
 * @param {Object} taskParams.qs_taskMetadata - Task metadata from QRS
 */
export function postUserSyncTaskFailureNotificationInfluxDb(taskParams) {
    try {
        globals.logger.info('[QSEOW] USER SYNC TASK FAILED: Sending user sync task notification to InfluxDB');

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
        tags.host = taskParams.host;
        tags.user = taskParams.user;
        tags.task_id = taskParams.taskId;
        tags.task_name = taskParams.taskName;
        tags.log_level = taskParams.logLevel;

        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'user_sync_task_failed',
                tags: tags,
                fields: {
                    log_timestamp: taskParams.logTimeStamp,
                    execution_id: taskParams.executionId,
                    log_message: taskParams.logMessage,
                },
            },
        ];

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.userSyncTaskFailure.tag.dynamic.useTaskTags') === true) {
            if (taskParams.qs_taskTags) {
                // Add task tags to InfluxDB datapoint
                for (const item of taskParams.qs_taskTags) {
                    datapoint[0].tags[`taskTag_${item}`] = 'true';
                }
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.userSyncTaskFailure.tag.static');
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
                    `[QSEOW] USER SYNC TASK FAILED: Influxdb datapoint for user sync task notification: ${JSON.stringify(datapoint, null, 2)}`,
                );

                datapoint = null;
                globals.logger.verbose('[QSEOW] USER SYNC TASK FAILED: Sent user sync task notification to InfluxDB');
            })
            .catch((err) => {
                if (globals.isSea) {
                    globals.logger.error(
                        `[QSEOW] USER SYNC TASK FAILED: Error saving user sync task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                } else {
                    globals.logger.error(
                        `[QSEOW] USER SYNC TASK FAILED: Error saving user sync task notification to InfluxDB! ${globals.getErrorMessage(err)}`,
                    );
                }
            });
    } catch (err) {
        globals.logger.error(
            `[QSEOW] USER SYNC TASK FAILED: Error processing user sync task notification! ${globals.getErrorMessage(err)}`,
        );
    }
}
