// Load global variables and functions
import globals from '../globals.js';
import { sendReloadTaskAbortedNotificationEmail, sendReloadTaskFailureNotificationEmail } from '../lib/smtp.js';
import { sendReloadTaskFailureNotificationSlack, sendReloadTaskAbortedNotificationSlack } from '../lib/qseow/slack_notification.js';
import { sendReloadTaskAbortedNotificationWebhook, sendReloadTaskFailureNotificationWebhook } from '../lib/webhook_notification.js';
import { sendReloadTaskFailureNotificationTeams, sendReloadTaskAbortedNotificationTeams } from '../lib/qseow/msteams_notification.js';
import { sendReloadTaskFailureNotification, sendReloadTaskAbortedNotification } from '../lib/incident_mgmt/signl4.js';
import {
    sendReloadTaskFailureLog,
    sendReloadTaskFailureEvent,
    sendReloadTaskAbortedLog,
    sendReloadTaskAbortedEvent,
} from '../lib/incident_mgmt/new_relic.js';
import { failedTaskStoreLogOnDisk, getScriptLog, getReloadTaskExecutionResults } from '../lib/qseow/scriptlog.js';
import getTaskTags from '../qrs_util/task_tag_util.js';
import getAppTags from '../qrs_util/app_tag_util.js';
import getAppMetadata from '../qrs_util/app_metadata.js';
import doesTaskExist from '../qrs_util/does_task_exist.js';
import { isCustomPropertyValueSet } from '../qrs_util/task_cp_util.js';

import { postReloadTaskFailureNotificationInfluxDb, postReloadTaskSuccessNotificationInfluxDb } from '../lib/post_to_influxdb.js';
import getTaskMetadata from '../qrs_util/task_metadata.js';

// Handler for failed scheduler initiated reloads
const schedulerAborted = async (msg) => {
    globals.logger.verbose(
        `TASKABORTED: Received reload aborted UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`,
    );

    // Get script log for failed reloads.
    // Only done if Slack, Teams, email or New Relic alerts are enabled
    let scriptLog;
    if (
        globals.config.get('Butler.incidentTool.newRelic.enable') === true ||
        globals.config.get('Butler.slackNotification.enable') === true ||
        globals.config.get('Butler.teamsNotification.enable') === true ||
        globals.config.get('Butler.emailNotification.enable') === true
    ) {
        scriptLog = await getScriptLog(msg[5], 1, 1);

        globals.logger.verbose(`Script log for aborted reload retrieved`);
    }

    // TOOD: Add check if task exists in QRS
    // Get app metadata from QRS
    const appMetadata = await getAppMetadata(msg[6]);

    // Get tags for the app that failed reloading
    // Tags are found in appMetadata.tags, which is an array of objects with the following properties:
    // - id
    // - name
    //
    // Create an array of tag names only
    const appTags = appMetadata.tags.map((tag) => tag.name);
    globals.logger.verbose(`Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

    // Get app custom properties
    // They are found in appMetadata.customProperties, which is an array of objects with the following properties:
    // - id
    // - definition
    //   - name
    // - value
    //
    // Create an array of objects, each with "name" and "value" properties
    const appCustomProperties = appMetadata.customProperties.map((cp) => ({
        name: cp.definition.name,
        value: cp.value,
    }));

    // Get tag metadata from QRS
    const taskMetadata = await getTaskMetadata(msg[5]);

    // Get tags for the task that failed reloading
    const taskTags = taskMetadata.tags.map((tag) => tag.name);
    globals.logger.verbose(`Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

    // Get reload task custom properties
    const taskCustomProperties = taskMetadata.customProperties.map((cp) => ({
        name: cp.definition.name,
        value: cp.value,
    }));

    // Post to Signl4 when a task has been aborted
    if (
        globals.config.get('Butler.incidentTool.signl4.enable') === true &&
        globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.enable') === true
    ) {
        sendReloadTaskAbortedNotification({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Post event to New Relic when a task has been aborted
    if (
        globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
        globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable') === true
    ) {
        sendReloadTaskAbortedEvent({
            qs_hostName: msg[1],
            qs_user: msg[4].replace(/\\/g, '/'),
            qs_taskName: msg[2],
            qs_taskId: msg[5],
            qs_appName: msg[3],
            qs_appId: msg[6],
            qs_logTimeStamp: msg[7],
            qs_logLevel: msg[8],
            qs_executionId: msg[9],
            qs_logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Post log to New Relic when a task has been aborted
    if (
        globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
        globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable') === true
    ) {
        sendReloadTaskAbortedLog({
            qs_hostName: msg[1],
            qs_user: msg[4].replace(/\\/g, '/'),
            qs_taskName: msg[2],
            qs_taskId: msg[5],
            qs_appName: msg[3],
            qs_appId: msg[6],
            qs_logTimeStamp: msg[7],
            qs_logLevel: msg[8],
            qs_executionId: msg[9],
            qs_logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Post to Slack when a reload task has been aborted (typically from the QMC, or via APIs), if Slack is enabled
    if (
        globals.config.get('Butler.slackNotification.enable') === true &&
        globals.config.get('Butler.slackNotification.reloadTaskAborted.enable') === true
    ) {
        sendReloadTaskAbortedNotificationSlack({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Post to MS Teams when a reload task been aborted (typically from the QMC, or via APIs), if Teams is enabled
    if (
        globals.config.get('Butler.teamsNotification.enable') === true &&
        globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable') === true
    ) {
        sendReloadTaskAbortedNotificationTeams({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Send notification email when task has been aborted (typically from the QMC, or via APIs), if this notification type is enabled
    if (
        globals.config.get('Butler.emailNotification.enable') === true &&
        globals.config.get('Butler.emailNotification.reloadTaskAborted.enable') === true
    ) {
        sendReloadTaskAbortedNotificationEmail({
            hostName: msg[1],
            user: msg[4],
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Call outgoing webhooks when task has been aborted
    // Note that there is no enable/disable flag for failed reloads.
    // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
    if (globals.config.get('Butler.webhookNotification.enable') === true) {
        sendReloadTaskAbortedNotificationWebhook({
            hostName: msg[1],
            user: msg[4],
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Publish basic MQTT message containing task name when a task has been aborted, if MQTT is enabled
    if (globals.config.get('Butler.mqttConfig.enable') === true) {
        if (globals?.mqttClient?.connected) {
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskAbortedTopic'), msg[2]);
        } else {
            globals.logger.warn(
                `MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                    'Butler.mqttConfig.taskAbortedTopic',
                )}`,
            );
        }
    }

    // Publish stringified MQTT message containing full, stringified JSON when a task has been aborted, if MQTT is enabled
    if (globals.config.get('Butler.mqttConfig.enable') === true && globals.config.get('Butler.mqttConfig.taskAbortedSendFull') === true) {
        globals.mqttClient.publish(
            globals.config.get('Butler.mqttConfig.taskAbortedFullTopic'),
            JSON.stringify({
                hostName: msg[1],
                user: msg[4].replace(/\\\\/g, '\\'),
                taskName: msg[2],
                taskId: msg[5],
                appName: msg[3],
                appId: msg[6],
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_appTags: appTags,
                qs_appCustomProperties: appCustomProperties,
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
            }),
        );
    }
};

// Handler for failed scheduler initiated reloads
const schedulerFailed = async (msg) => {
    // Get script log for failed reloads.
    // Only done if Slack, Teams, email or New Relic alerts are enabled
    let scriptLog;
    if (
        globals.config.get('Butler.incidentTool.newRelic.enable') === true ||
        globals.config.get('Butler.slackNotification.enable') === true ||
        globals.config.get('Butler.teamsNotification.enable') === true ||
        globals.config.get('Butler.influxDb.reloadTaskFailure.enable') === true ||
        globals.config.get('Butler.emailNotification.enable') === true
    ) {
        scriptLog = await getScriptLog(msg[5], 0, 0);
        globals.logger.verbose(`Script log for failed reload retrieved`);
    }

    globals.logger.verbose(
        `TASKFAILURE: Received reload failed UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`,
    );

    // First field in message (msg[0]) is message category (this is the modern/recent message format)

    // Get app metadata from QRS
    const appMetadata = await getAppMetadata(msg[6]);

    // Get tags for the app that failed reloading
    // Tags are found in appMetadata.tags, which is an array of objects with the following properties:
    // - id
    // - name
    //
    // Create an array of tag names only
    const appTags = appMetadata.tags.map((tag) => tag.name);
    globals.logger.verbose(`Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

    // Get app custom properties
    // They are found in appMetadata.customProperties, which is an array of objects with the following properties:
    // - id
    // - definition
    //   - name
    // - value
    //
    // Create an array of objects, each with "name" and "value" properties
    const appCustomProperties = appMetadata.customProperties.map((cp) => ({
        name: cp.definition.name,
        value: cp.value,
    }));

    // Get tag metadata from QRS
    const taskMetadata = await getTaskMetadata(msg[5]);

    // Get tags for the task that failed reloading
    const taskTags = taskMetadata.tags.map((tag) => tag.name);
    globals.logger.verbose(`Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

    // Get reload task custom properties
    const taskCustomProperties = taskMetadata.customProperties.map((cp) => ({
        name: cp.definition.name,
        value: cp.value,
    }));

    // Store script log to disk
    if (globals.config.get('Butler.scriptLog.storeOnDisk.reloadTaskFailure.enable') === true) {
        failedTaskStoreLogOnDisk({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Post to Signl4 when a task has failed
    if (
        globals.config.get('Butler.incidentTool.signl4.enable') === true &&
        globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable') === true
    ) {
        sendReloadTaskFailureNotification({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Post event to New Relic when a task has failed
    if (
        globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
        globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') === true
    ) {
        sendReloadTaskFailureEvent({
            qs_hostName: msg[1],
            qs_user: msg[4].replace(/\\/g, '/'),
            qs_taskName: msg[2],
            qs_taskId: msg[5],
            qs_appName: msg[3],
            qs_appId: msg[6],
            qs_logTimeStamp: msg[7],
            qs_logLevel: msg[8],
            qs_executionId: msg[9],
            qs_logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Post log to New Relic when a task has failed
    if (
        globals.config.get('Butler.incidentTool.newRelic.enable') === true &&
        globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') === true
    ) {
        sendReloadTaskFailureLog({
            qs_hostName: msg[1],
            qs_user: msg[4].replace(/\\/g, '/'),
            qs_taskName: msg[2],
            qs_taskId: msg[5],
            qs_appName: msg[3],
            qs_appId: msg[6],
            qs_logTimeStamp: msg[7],
            qs_logLevel: msg[8],
            qs_executionId: msg[9],
            qs_logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Post to InfluxDB when a task has failed
    if (globals.config.get('Butler.influxDb.enable') === true && globals.config.get('Butler.influxDb.reloadTaskFailure.enable') === true) {
        postReloadTaskFailureNotificationInfluxDb({
            host: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            scriptLog,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Post to Slack when a task has failed, if Slack is enabled
    if (
        globals.config.get('Butler.slackNotification.enable') === true &&
        globals.config.get('Butler.slackNotification.reloadTaskFailure.enable') === true
    ) {
        sendReloadTaskFailureNotificationSlack({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Post to MS Teams when a task has failed, if Teams is enabled
    if (
        globals.config.get('Butler.teamsNotification.enable') === true &&
        globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') === true
    ) {
        sendReloadTaskFailureNotificationTeams({
            hostName: msg[1],
            user: msg[4].replace(/\\/g, '/'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Send notification email when task has failed, if this notification type is enabled
    if (
        globals.config.get('Butler.emailNotification.enable') === true &&
        globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') === true
    ) {
        sendReloadTaskFailureNotificationEmail({
            hostName: msg[1],
            user: msg[4].replace(/\\\\/g, '\\'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
            scriptLog,
        });
    }

    // Call outgoing webhooks when task has failed
    // Note that there is no enable/disable flag for failed reloads.
    // Whether alerts are sent or not is controlled by whether there are any webhook URLs or not
    if (globals.config.has('Butler.webhookNotification.enable') && globals.config.get('Butler.webhookNotification.enable') === true) {
        sendReloadTaskFailureNotificationWebhook({
            hostName: msg[1],
            user: msg[4].replace(/\\\\/g, '\\'),
            taskName: msg[2],
            taskId: msg[5],
            appName: msg[3],
            appId: msg[6],
            logTimeStamp: msg[7],
            logLevel: msg[8],
            executionId: msg[9],
            logMessage: msg[10],
            qs_appTags: appTags,
            qs_appCustomProperties: appCustomProperties,
            qs_taskTags: taskTags,
            qs_taskCustomProperties: taskCustomProperties,
            qs_appMetadata: appMetadata,
            qs_taskMetadata: taskMetadata,
        });
    }

    // Publish basic MQTT message containing task name when a task has failed, if MQTT is enabled
    if (globals.config.get('Butler.mqttConfig.enable') === true) {
        if (globals?.mqttClient?.connected) {
            globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureTopic'), msg[2]);
        } else {
            globals.logger.warn(
                `MQTT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                    'Butler.mqttConfig.taskFailureTopic',
                )}`,
            );
        }
    }

    // Publish stringified MQTT message containing full, stringified JSON when a task has failed, if MQTT is enabled
    if (globals.config.get('Butler.mqttConfig.enable') === true && globals.config.get('Butler.mqttConfig.taskFailureSendFull') === true) {
        globals.mqttClient.publish(
            globals.config.get('Butler.mqttConfig.taskFailureFullTopic'),
            JSON.stringify({
                hostName: msg[1],
                user: msg[4].replace(/\\\\/g, '\\'),
                taskName: msg[2],
                taskId: msg[5],
                appName: msg[3],
                appId: msg[6],
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_appTags: appTags,
                qs_appCustomProperties: appCustomProperties,
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                qs_taskMetadata: taskMetadata,
            }),
        );
    }
};

// --------------------------------------------------------
// Handler for successful scheduler initiated reloads
// --------------------------------------------------------
const schedulerReloadTaskSuccess = async (msg) => {
    globals.logger.verbose(
        `RELOAD TASK SUCCESS: Received reload task success UDP message from scheduler: UDP msg=${msg[0]}, Host=${msg[1]}, App name=${msg[3]}, Task name=${msg[2]}, Log level=${msg[8]}, Log msg=${msg[10]}`,
    );

    const reloadTaskId = msg[5];

    // Does task ID exist in Sense?
    const taskExists = await doesTaskExist(reloadTaskId);
    if (taskExists.exists !== true) {
        globals.logger.warn(`RELOAD TASK SUCCESS: Task ID ${reloadTaskId} does not exist in Sense`);
        return false;
    }

    // Determine if this task should be stored in InflixDB
    let storeInInfluxDb = false;
    if (
        globals.config.get('Butler.influxDb.enable') === true &&
        globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true &&
        globals.config.get('Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable') === true
    ) {
        storeInInfluxDb = true;
    } else if (
        // Is storing of data in InfluxDB enabled for this specific task, via custom property?
        globals.config.get('Butler.influxDb.enable') === true &&
        globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true &&
        globals.config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable') === true
    ) {
        // Is the custom property set for this specific task?
        // Get custom property name and value from config
        const customPropertyName = globals.config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName');
        const customPropertyValue = globals.config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue');

        // Get custom property value for this task
        const customPropertyValueForTask = await isCustomPropertyValueSet(
            reloadTaskId,
            customPropertyName,
            customPropertyValue,
            globals.logger,
        );

        if (customPropertyValueForTask) {
            storeInInfluxDb = true;
        }
    }

    if (storeInInfluxDb) {
        // Get results from last reload task execution
        // It may take a seconds or two from the finished-successfully log message is written until the execution results are available via the QRS.
        // Specifically, it may take a while for the last "FinishedSuccess" meesage to appear in the executionDetails array.
        //
        // Try at most five times, with a 1 second delay between each attempt.
        // Check if the message property of the last entry in the taskInfo.executionDetailsSorted array is "Changing task state from Started to FinishedSuccess"
        // Then give up and don't store anything in InfluxDB, but show a log warning.
        let taskInfo;
        let retryCount = 0;
        while (retryCount < 5) {
            // eslint-disable-next-line no-await-in-loop
            taskInfo = await getReloadTaskExecutionResults(reloadTaskId);

            if (
                taskInfo?.executionDetailsSorted[taskInfo.executionDetailsSorted.length - 1]?.message ===
                'Changing task state from Started to FinishedSuccess'
            ) {
                // Is duration longer than 0 seconds?
                // I.e. is executionDuration.hours, executionDuration.minutes or executionDuration.seconds > 0?
                // Warn if not, as this is likely caused by the QRS not having updated the execution details yet
                if (
                    taskInfo.executionDuration.hours === 0 &&
                    taskInfo.executionDuration.minutes === 0 &&
                    taskInfo.executionDuration.seconds === 0
                ) {
                    globals.logger.warn(
                        `RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId} retrieved successfully after ${retryCount} attempts, but duration is 0 seconds. This is likely caused by the QRS not having updated the execution details yet.`,
                    );
                }

                globals.logger.debug(
                    `RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId} retrieved successfully after ${retryCount} attempts`,
                );
                break;
            }

            retryCount += 1;

            globals.logger.verbose(
                `RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Attempt ${retryCount} of 5. Waiting 1 second before trying again`,
            );

            // eslint-disable-next-line no-await-in-loop
            await globals.sleep(1000);
        }

        if (!taskInfo) {
            globals.logger.warn(
                `RELOAD TASK SUCCESS: Unable to get task info for reload task ${reloadTaskId}. Not storing task info in InfluxDB`,
            );
            return false;
        }
        globals.logger.verbose(`RELOAD TASK SUCCESS: Task info for reload task ${reloadTaskId}: ${JSON.stringify(taskInfo, null, 2)}`);

        // Get app/task tags so they can be included in data sent to alert destinations
        let appTags = [];
        let taskTags = [];

        // Get tags for the app that was reloaded
        appTags = await getAppTags(msg[6]);
        globals.logger.verbose(`Tags for app ${msg[6]}: ${JSON.stringify(appTags, null, 2)}`);

        // Get tags for the task that finished reloading successfully
        taskTags = await getTaskTags(msg[5]);
        globals.logger.verbose(`Tags for task ${msg[5]}: ${JSON.stringify(taskTags, null, 2)}`);

        // Post to InfluxDB when a reload task has finished successfully
        if (
            globals.config.has('Butler.influxDb.enable') &&
            globals.config.has('Butler.influxDb.reloadTaskSuccess.enable') &&
            globals.config.get('Butler.influxDb.enable') === true &&
            globals.config.get('Butler.influxDb.reloadTaskSuccess.enable') === true
        ) {
            postReloadTaskSuccessNotificationInfluxDb({
                host: msg[1],
                user: msg[4].replace(/\\/g, '/'),
                taskName: msg[2],
                taskId: msg[5],
                appName: msg[3],
                appId: msg[6],
                logTimeStamp: msg[7],
                logLevel: msg[8],
                executionId: msg[9],
                logMessage: msg[10],
                qs_appTags: appTags,
                qs_appCustomProperties: appCustomProperties,
                qs_taskTags: taskTags,
                qs_taskCustomProperties: taskCustomProperties,
                taskInfo,
                qs_appMetadata: appMetadata,
                qs_taskMetadata: taskMetadata,
            });

            globals.logger.info(`RELOAD TASK SUCCESS: Reload info for reload task ${reloadTaskId}, "${msg[2]}" stored in InfluxDB`);
        }

        return true;
    }

    globals.logger.verbose(`RELOAD TASK SUCCESS: Not storing task info in InfluxDB`);
    return false;
};

// --------------------------------------------------------
// Set up UDP server handlers for acting on Sense failed task events
// --------------------------------------------------------
const udpInitTaskErrorServer = () => {
    // Handler for UDP server startup event
    // eslint-disable-next-line no-unused-vars
    globals.udpServerReloadTaskSocket.on('listening', (message, remote) => {
        const address = globals.udpServerReloadTaskSocket.address();

        globals.logger.info(`TASKFAILURE: UDP server listening on ${address.address}:${address.port}`);

        // Publish MQTT message that UDP server has started
        if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
            if (globals?.mqttClient?.connected) {
                globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'start');
            } else {
                globals.logger.warn(
                    `UDP SERVER INIT: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                        'Butler.mqttConfig.taskFailureServerStatusTopic',
                    )}`,
                );
            }
        }
    });

    // Handler for UDP error event
    // eslint-disable-next-line no-unused-vars
    globals.udpServerReloadTaskSocket.on('error', (message, remote) => {
        try {
            const address = globals.udpServerReloadTaskSocket.address();
            globals.logger.error(`TASKFAILURE: UDP server error on ${address.address}:${address.port}`);

            // Publish MQTT message that UDP server has reported an error
            if (globals.config.has('Butler.mqttConfig.enable') && globals.config.get('Butler.mqttConfig.enable') === true) {
                if (globals?.mqttClient?.connected) {
                    globals.mqttClient.publish(globals.config.get('Butler.mqttConfig.taskFailureServerStatusTopic'), 'error');
                } else {
                    globals.logger.warn(
                        `UDP SERVER ERROR: MQTT client not connected. Unable to publish message to topic ${globals.config.get(
                            'Butler.mqttConfig.taskFailureServerStatusTopic',
                        )}`,
                    );
                }
            }
        } catch (err) {
            globals.logger.error(`TASKFAILURE: Error in UDP error handler: ${err}`);
        }
    });

    // Main handler for UDP messages relating to failed tasks
    // eslint-disable-next-line no-unused-vars
    globals.udpServerReloadTaskSocket.on('message', async (message, remote) => {
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
            globals.logger.debug(`UDP HANDLER: UDP message received: ${message.toString()}`);

            const msg = message.toString().split(';');

            if (msg[0].toLowerCase() === '/engine-reload-failed/') {
                // Engine log appender detecting failed reload, also ones initiated interactively by users

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 9) {
                    globals.logger.warn(
                        `UDP HANDLER ENGINE RELOAD FAILED: Invalid number of fields in UDP message. Expected 9, got ${msg.length}.`,
                    );
                    globals.logger.warn(`UDP HANDLER ENGINE RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`UDP HANDLER ENGINE RELOAD FAILED: Aborting processing of this message.`);
                    return;
                }

                globals.logger.verbose(
                    `UDP HANDLER ENGINE RELOAD FAILED: Received reload failed UDP message from engine: Host=${msg[1]}, AppID=${msg[2]}, User directory=${msg[4]}, User=${msg[5]}`,
                );
            } else if (msg[0].toLowerCase() === '/scheduler-reload-failed/') {
                // Scheduler log appender detecting failed scheduler-started reload

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 11) {
                    globals.logger.warn(
                        `UDP HANDLER SCHEDULER RELOAD FAILED: Invalid number of fields in UDP message. Expected 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`UDP HANDLER SCHEDULER RELOAD FAILED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`UDP HANDLER SCHEDULER RELOAD FAILED: Aborting processing of this message.`);
                    return;
                }

                schedulerFailed(msg);
            } else if (msg[0].toLowerCase() === '/scheduler-reload-aborted/') {
                // Scheduler log appender detecting aborted scheduler-started reload

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 11) {
                    globals.logger.warn(
                        `UDP HANDLER SCHEDULER RELOAD ABORTED: Invalid number of fields in UDP message. Expected 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`UDP HANDLER SCHEDULER RELOAD ABORTED: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`UDP HANDLER SCHEDULER RELOAD ABORTED: Aborting processing of this message.`);
                    return;
                }

                schedulerAborted(msg);
            } else if (msg[0].toLowerCase() === '/scheduler-reloadtask-success/') {
                // Scheduler log appender detecting successful scheduler-started reload task

                // Do some sanity checks on the message
                // There should be exactly 11 fields in the message
                if (msg.length !== 11) {
                    globals.logger.warn(
                        `UDP HANDLER SCHEDULER RELOAD TASK SUCCESS: Invalid number of fields in UDP message. Expected 11, got ${msg.length}.`,
                    );
                    globals.logger.warn(`UDP HANDLER SCHEDULER RELOAD TASK SUCCESS: Incoming log message was:\n${message.toString()}`);
                    globals.logger.warn(`UDP HANDLER SCHEDULER RELOAD TASK SUCCESS: Aborting processing of this message.`);
                    return;
                }
                schedulerReloadTaskSuccess(msg);
            } else {
                globals.logger.warn(`UDP HANDLER: Unknown UDP message format: "${msg[0]}"`);
            }
        } catch (err) {
            globals.logger.error(`UDP HANDLER: Failed processing log event. No action will be taken for this event. Error: ${err}`);
            globals.logger.error(`UDP HANDLER: Incoming log message was\n${message}`);
        }
    });
};

export default udpInitTaskErrorServer;
