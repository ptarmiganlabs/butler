import _ from 'lodash';
import globals from '../globals.js';

export function postButlerMemoryUsageToInfluxdb(memory) {
    // Get Butler version
    const butlerVersion = globals.appVersion;

    let datapoint = [
        {
            measurement: 'butler_memory_usage',
            tags: {
                butler_instance: memory.instanceTag,
                version: butlerVersion,
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
            globals.logger.silly(
                `INFLUXDB MEMORY USAGE: Influxdb datapoint for Butler INFLUXDB MEMORY USAGE: ${JSON.stringify(datapoint, null, 2)}`
            );

            datapoint = null;
            globals.logger.verbose('INFLUXDB MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`INFLUXDB MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${err.stack}`);
        });
}

// Function to store Qlik Sense license status to InfluxDB
// License JSON has the following structure:
// {
//     "totalTokens": 0,
//     "availableTokens": 0,
//     "tokensEnabled": false,
//     "userAccess": {
//         "enabled": false,
//         "tokenCost": 1,
//         "allocatedTokens": 0,
//         "usedTokens": 0,
//         "quarantinedTokens": 0,
//         "schemaPath": "AccessTypeOverview.UserAccessDetails"
//     },
//     "loginAccess": {
//         "enabled": false,
//         "tokenCost": 0.1,
//         "allocatedTokens": 0,
//         "usedTokens": 0,
//         "unavailableTokens": 0,
//         "schemaPath": "AccessTypeOverview.LoginAccessDetails"
//     },
//     "professionalAccess": {
//         "enabled": true,
//         "total": 25,
//         "allocated": 5,
//         "used": 0,
//         "quarantined": 0,
//         "excess": 0,
//         "available": 20,
//         "schemaPath": "AccessTypeOverview.Details"
//     },
//     "analyzerAccess": {
//         "enabled": true,
//         "total": 25,
//         "allocated": 4,
//         "used": 0,
//         "quarantined": 0,
//         "excess": 0,
//         "available": 21,
//         "schemaPath": "AccessTypeOverview.Details"
//     },
//     "analyzerTimeAccess": {
//         "enabled": true,
//         "allocatedMinutes": 700,
//         "usedMinutes": 0,
//         "unavailableMinutes": 0,
//         "schemaPath": "AccessTypeOverview.AnalyzerTimeAccessDetails"
//     },
//     "schemaPath": "AccessTypeOverview"
// }
export async function postQlikSenseLicenseStatusToInfluxDB(qlikSenseLicenseStatus) {
    globals.logger.verbose('INFLUXDB QLIK SENSE LICENSE STATUS: Sending Qlik Sense license status to InfluxDB');

    const instanceTag = globals.config.has('Butler.influxDb.instanceTag') ? globals.config.get('Butler.influxDb.instanceTag') : '';

    // Get tags from config file
    // Stored in array Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag.static');

    const tags = {
        butler_instance: instanceTag,
    };

    // Add tags from config file
    if (configTags) {
        // eslint-disable-next-line no-restricted-syntax
        for (const item of configTags) {
            tags[item.name] = item.value;
        }
    }

    // Build InfluxDB datapoint
    let datapoint = [];

    // Is there any data for "analyzerAccess" license type?
    if (qlikSenseLicenseStatus.analyzerAccess.enabled === true) {
        tags.license_type = 'analyzer';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated: qlikSenseLicenseStatus.analyzerAccess.allocated,
                available: qlikSenseLicenseStatus.analyzerAccess.available,
                excess: qlikSenseLicenseStatus.analyzerAccess.excess,
                quarantined: qlikSenseLicenseStatus.analyzerAccess.quarantined,
                total: qlikSenseLicenseStatus.analyzerAccess.total,
                used: qlikSenseLicenseStatus.analyzerAccess.used,
            },
        });
    }

    // Is there any data for "analyzerTimeAccess" license type?
    if (qlikSenseLicenseStatus.analyzerTimeAccess.enabled === true) {
        tags.license_type = 'analyzer_capacity';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated_minutes: qlikSenseLicenseStatus.analyzerTimeAccess.allocatedMinutes,
                unavailable_minutes: qlikSenseLicenseStatus.analyzerTimeAccess.unavailableMinutes,
                used_minutes: qlikSenseLicenseStatus.analyzerTimeAccess.usedMinutes,
            },
        });
    }

    // Is there any data for "professionalAccess" license type?
    if (qlikSenseLicenseStatus.professionalAccess.enabled === true) {
        tags.license_type = 'professional';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated: qlikSenseLicenseStatus.professionalAccess.allocated,
                available: qlikSenseLicenseStatus.professionalAccess.available,
                excess: qlikSenseLicenseStatus.professionalAccess.excess,
                quarantined: qlikSenseLicenseStatus.professionalAccess.quarantined,
                total: qlikSenseLicenseStatus.professionalAccess.total,
                used: qlikSenseLicenseStatus.professionalAccess.used,
            },
        });
    }

    // Is there any data for "loginAccess" license type?
    if (qlikSenseLicenseStatus.loginAccess.enabled === true) {
        tags.license_type = 'token_login';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated_tokens: qlikSenseLicenseStatus.loginAccess.allocatedTokens,
                token_cost: qlikSenseLicenseStatus.loginAccess.tokenCost,
                unavailable_tokens: qlikSenseLicenseStatus.loginAccess.unavailableTokens,
                used_tokens: qlikSenseLicenseStatus.loginAccess.usedTokens,
            },
        });
    }

    // Is there any data for "userAccess" license type?
    if (qlikSenseLicenseStatus.userAccess.enabled === true) {
        tags.license_type = 'token_user';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated_tokens: qlikSenseLicenseStatus.userAccess.allocatedTokens,
                quarantined_tokens: qlikSenseLicenseStatus.userAccess.quarantinedTokens,
                token_cost: qlikSenseLicenseStatus.userAccess.tokenCost,
                used_tokens: qlikSenseLicenseStatus.userAccess.userTokens,
            },
        });
    }

    // Are tokens available?
    if (qlikSenseLicenseStatus.tokensEnabled === true) {
        tags.license_type = 'tokens_available';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                available_tokens: qlikSenseLicenseStatus.availableTokens,
                total_tokens: qlikSenseLicenseStatus.totalTokens,
            },
        });
    }

    // Write to InfluxDB
    const deepClonedDatapoint = _.cloneDeep(datapoint);
    await globals.influx.writePoints(deepClonedDatapoint);

    globals.logger.silly(
        `INFLUXDB QLIK SENSE LICENSE STATUS: Influxdb datapoint for Qlik Sense license status: ${JSON.stringify(datapoint, null, 2)}`
    );

    datapoint = null;
    globals.logger.info('INFLUXDB QLIK SENSE LICENSE STATUS: Sent aggregated Qlik Sense license status to InfluxDB');
}

// Function to store info about released Qlik Sense licenses to InfluxDB
export async function postQlikSenseLicenseReleasedToInfluxDB(licenseInfo) {
    globals.logger.verbose('INFLUXDB QLIK SENSE LICENSE RELEASE: Sending info on released Qlik Sense license to InfluxDB');

    const instanceTag = globals.config.has('Butler.influxDb.instanceTag') ? globals.config.get('Butler.influxDb.instanceTag') : '';

    // Get tags from config file
    // Stored in array Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.licenseRelease.destination.influxDb.tag.static');

    const tags = {
        license_type: licenseInfo.licenseType,
        user: `${licenseInfo.userDir}\\${licenseInfo.userId}`,
        butler_instance: instanceTag,
    };

    // Add tags from config file
    if (configTags) {
        // eslint-disable-next-line no-restricted-syntax
        for (const item of configTags) {
            tags[item.name] = item.value;
        }
    }

    // Build InfluxDB datapoint
    let datapoint = [];

    // Add data to InfluxDB datapoint
    datapoint.push({
        measurement: 'qlik_sense_license_release',
        tags,
        fields: {
            days_since_last_use: licenseInfo.daysSinceLastUse,
        },
    });

    // Write to InfluxDB
    const deepClonedDatapoint = _.cloneDeep(datapoint);
    await globals.influx.writePoints(deepClonedDatapoint);

    globals.logger.silly(
        `INFLUXDB QLIK SENSE LICENSE RELEASE: Influxdb datapoint for released Qlik Sense license: ${JSON.stringify(datapoint, null, 2)}`
    );

    datapoint = null;
    globals.logger.debug('INFLUXDB QLIK SENSE LICENSE RELEASE: Sent info on released Qlik Sense license to InfluxDB');
}

// Function to store windows service status to InfluxDB
export function postWindowsServiceStatusToInfluxDB(serviceStatus) {
    globals.logger.verbose(
        `INFLUXDB WINDOWS SERVICE STATUS: Sending service status to InfluxDB: service="${serviceStatus.serviceFriendlyName}", status="${serviceStatus.serviceStatus}"`
    );

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
                `INFLUXDB WINDOWS SERVICE STATUS: Influxdb datapoint for INFLUXDB WINDOWS SERVICE STATUS: ${JSON.stringify(
                    datapoint,
                    null,
                    2
                )}`
            );

            datapoint = null;
            globals.logger.verbose('INFLUXDB WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`INFLUXDB WINDOWS SERVICE STATUS: Error saving Windows service status to InfluxDB! ${err.stack}`);
        });
}

// Store information about successful reload tasks to InfluxDB
export function postReloadTaskSuccessNotificationInfluxDb(reloadParams) {
    try {
        globals.logger.verbose('INFLUXDB RELOAD TASK SUCCESS: Sending reload task notification to InfluxDB');

        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'reload_task_success',
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

        // Get task info
        const { taskInfo } = reloadParams;

        globals.logger.debug(`INFLUXDB RELOAD TASK SUCCESS: Task info:\n${JSON.stringify(taskInfo, null, 2)}`);

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

        // Should app tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags') === true) {
            // Add app tags to InfluxDB datapoint
            // eslint-disable-next-line no-restricted-syntax
            for (const item of reloadParams.appTags) {
                datapoint[0].tags[`appTag_${item}`] = 'true';
            }
        }

        // Should task tags be included?
        if (globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags') === true) {
            // Add task tags to InfluxDB datapoint
            // eslint-disable-next-line no-restricted-syntax
            for (const item of reloadParams.taskTags) {
                datapoint[0].tags[`taskTag_${item}`] = 'true';
            }
        }

        // Add any static tags (defined in the config file)
        const staticTags = globals.config.get('Butler.influxDb.reloadTaskSuccess.tag.static');
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
                    `INFLUXDB RELOAD TASK SUCCESS: Influxdb datapoint for reload task notification: ${JSON.stringify(datapoint, null, 2)}`
                );

                datapoint = null;
                globals.logger.verbose('INFLUXDB RELOAD TASK SUCCESS: Sent reload task notification to InfluxDB');
            })
            .catch((err) => {
                globals.logger.error(`INFLUXDB RELOAD TASK SUCCESS: Error saving reload task notification to InfluxDB! ${err.stack}`);
            });
    } catch (err) {
        globals.logger.error(`INFLUXDB RELOAD TASK SUCCESS: ${err}`);
    }
}

// Store information about failed reload tasks to InfluxDB
export function postReloadTaskFailureNotificationInfluxDb(reloadParams) {
    try {
        globals.logger.info('INFLUXDB RELOAD TASK FAILED: Sending reload task notification to InfluxDB');
        // Build InfluxDB datapoint
        let datapoint = [
            {
                measurement: 'reload_task_failed',
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

        globals.logger.debug(`INFLUXDB RELOAD TASK FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

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
                    `INFLUXDB RELOAD TASK FAILED: Influxdb datapoint for reload task notification: ${JSON.stringify(datapoint, null, 2)}`
                );

                datapoint = null;
                globals.logger.verbose('INFLUXDB RELOAD TASK FAILED: Sent reload task notification to InfluxDB');
            })
            .catch((err) => {
                globals.logger.error(`INFLUXDB RELOAD TASK FAILED: Error saving reload task notification to InfluxDB! ${err.stack}`);
            });
    } catch (err) {
        globals.logger.error(`INFLUXDB RELOAD TASK FAILED: ${err}`);
    }
}
