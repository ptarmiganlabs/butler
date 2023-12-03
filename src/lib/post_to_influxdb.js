const _ = require('lodash');

const globals = require('../globals');

function postButlerMemoryUsageToInfluxdb(memory) {
    let datapoint = [
        {
            measurement: 'butler_memory_usage',
            tags: {
                butler_instance: memory.instanceTag,
            },
            fields: {
                heap_used: memory.heapUsedMByte,
                heap_total: memory.heapTotalMByte,
                external: memory.externalMemoryMByte,
                process_memory: memory.processMemoryMByte,
            },
        },
    ];
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            globals.logger.silly(`MEMORY USAGE: Influxdb datapoint for Butler memory usage: ${JSON.stringify(datapoint, null, 2)}`);

            datapoint = null;
            globals.logger.verbose('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${err.stack}`);
        });
}

// Add function to store windows service status to InfluxDB
function postWindowsServiceStatusToInfluxDB(serviceStatus) {
    // Create lookup table for Windows service state to numeric value, starting with 1 for stopped
    const serviceStateLookup = {
        STOPPED: 1,
        START_PENDING: 2,
        STOP_PENDING: 3,
        RUNNING: 4,
        CONTINUE_PENDING: 5,
        PAUSE_PENDING: 6,
        PAUSED: 7,
    };

    // Create lookup table for Windows service startup mode to numeric value, starting with 0
    const serviceStartupModeLookup = {
        Automatic: 0,
        'Automatic (delayed start)': 1,
        Manual: 2,
        Disabled: 3,
    };

    let datapoint = [
        {
            measurement: 'win_service_state',
            tags: {
                butler_instance: serviceStatus.instanceTag,
                host: serviceStatus.host,
                service_name: serviceStatus.serviceName,
                display_name: serviceStatus.serviceDetails.displayName,
                friendly_name: serviceStatus.serviceFriendlyName,
            },
            fields: {
                state_num:
                    serviceStateLookup[serviceStatus.serviceStatus] !== undefined ? serviceStateLookup[serviceStatus.serviceStatus] : -1,
                state_text: serviceStatus.serviceStatus,
                startup_mode_num:
                    serviceStartupModeLookup[serviceStatus.serviceDetails.startType] !== undefined
                        ? serviceStartupModeLookup[serviceStatus.serviceDetails.startType]
                        : -1,
                startup_mode_text: serviceStatus.serviceDetails.startType,
            },
        },
    ];
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            globals.logger.silly(
                `WINDOWS SERVICE STATUS: Influxdb datapoint for Windows service status: ${JSON.stringify(datapoint, null, 2)}`
            );

            datapoint = null;
            globals.logger.verbose('WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`WINDOWS SERVICE STATUS: Error saving Windows service status to InfluxDB! ${err.stack}`);
        });
}

// Store information about failed reload tasks to InfluxDB
function postReloadTaskNotificationInfluxDb(reloadParams) {
    try {
        globals.logger.verbose('TASK FAILED INFLUXDB: Sending reload task notification to InfluxDB');

        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'task_failed',
                tags: {
                    host: reloadParams.host,
                    user: reloadParams.user,
                    task_id: reloadParams.taskId,
                    task_name: reloadParams.taskName,
                    app_id: reloadParams.appId,
                    app_name: reloadParams.appName,
                    log_level: reloadParams.logLevel,
                },
                fields: {
                    log_timestamp: reloadParams.logTimeStamp,
                    execution_id: reloadParams.executionId,
                    log_message: reloadParams.logMessage,
                },
            },
        ];

        // Get script logs
        const scriptLogData = reloadParams.scriptLog;

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

        globals.logger.debug(`TASK FAILED INFLUXDB: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

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

        datapoint[0].fields.reload_log = msg;

        // Should app tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskFailure.tag.dynamic.useAppTags') === true) {
            // Add app tags to InfluxDB datapoint
            // eslint-disable-next-line no-restricted-syntax
            for (const item of reloadParams.appTags) {
                datapoint[0].tags[`appTag_${item}`] = 'true';
            }
        }

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskFailure.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            // eslint-disable-next-line no-restricted-syntax
            for (const item of reloadParams.taskTags) {
                datapoint[0].tags[`taskTag_${item}`] = 'true';
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.reloadTaskFailure.tag.static');
        if (staticTags) {
            // eslint-disable-next-line no-restricted-syntax
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
                    `TASK FAILED INFLUXDB: Influxdb datapoint for reload task notification: ${JSON.stringify(datapoint, null, 2)}`
                );

                datapoint = null;
                globals.logger.verbose('TASK FAILED INFLUXDB: Sent reload task notification to InfluxDB');
            })
            .catch((err) => {
                globals.logger.error(`TASK FAILED INFLUXDB: Error saving reload task notification to InfluxDB! ${err.stack}`);
            });
    } catch (err) {
        globals.logger.error(`TASK FAILED INFLUXDB: ${err}`);
    }
}
module.exports = {
    postButlerMemoryUsageToInfluxdb,
    postWindowsServiceStatusToInfluxDB,
    postReloadTaskNotificationInfluxDb,
};
