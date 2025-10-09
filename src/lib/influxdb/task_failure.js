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
