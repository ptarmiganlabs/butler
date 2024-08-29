/* eslint-disable import/prefer-default-export */
import globals from '../../globals.js';
import { getQlikSenseCloudAppReloadScriptLog, getQlikSenseCloudAppReloadInfo } from './api/appreloadinfo.js';
import { getQlikSenseCloudAppInfo } from './api/app.js';
import { sendQlikSenseCloudAppReloadFailureNotificationTeams } from './msteams_notification_qscloud.js';
import { sendQlikSenseCloudAppReloadFailureNotificationSlack } from './slack_notification_qscloud.js';

const { config, logger } = globals;

// Function to handle Qlik Sense Cloud app reload finished event
// Parameters:
// - message: MQTT message object, as sent by Qlik Sense Cloud webhook API
export async function handleQlikSenseCloudAppReloadFinished(message) {
    try {
        // Make sure eventType is 'com.qlik.v1.app.reload.finished'
        if (message.eventType === 'com.qlik.v1.app.reload.finished') {
            // What is app reload status?
            // Possible values: 'ok', 'error'
            if (message.data.status === 'error') {
                // Get app ID from message.extensions.topLevelResourceId
                const appId = message.extensions.topLevelResourceId;

                // Get  info about the app reload from the message sent by Qlik Sense Cloud
                const { source, eventType, eventTypeVersion } = message;
                const { ownerId, tenantId, userId } = message.extensions;
                const {
                    duration,
                    endedWithMemoryConstraint,
                    errors,
                    isDirectQueryMode,
                    isPartialReload,
                    isSessionApp,
                    isSkipStore,
                    peakMemoryBytes,
                    reloadId,
                    rowLimit,
                    statements,
                    status,
                    usage,
                    warnings,
                } = message.data;

                // Create array of monitored tenants (id + free text comment)
                const monitoredTenants = [];
                monitoredTenants.push({
                    id: config.get('Butler.qlikSenseCloud.event.mqtt.tenant.id'),
                    comment: config.get('Butler.qlikSenseCloud.event.mqtt.tenant.comment'),
                });

                // Make sure incoming message is from a Qlik Sense Cloud tenant that we are monitoring
                // If the tenant ID is not in the list of monitored tenants, skip the event and warn about it
                // Valid tenant ID is defined in the Butler configuration file
                if (!monitoredTenants.some((tenant) => tenant.id === tenantId)) {
                    logger.warn(
                        `QLIK SENSE CLOUD: Incoming MQTT event from Qlik Sense Cloud, but tenant ID "${tenantId}" is not defined in the Butler configuration file. Skipping event.`,
                    );
                    return false;
                }

                // Get tenant comment based on tenant ID
                const tenantComment = monitoredTenants.find((tenant) => tenant.id === tenantId).comment;

                const appName = message.data.name;
                const sizeMemory = message.data?.size?.memory;

                // Type of event that triggered the reload
                let reloadTrigger = '';

                let scriptLog = {};
                let reloadInfo = {};
                let appInfo = {};

                // App reload did fail. Send enabled notifications/alerts
                logger.info(`QLIK SENSE CLOUD: App reload failed. App ID=[${appId}] name="${message.data.name}"`);

                // Are notifications from QS Cloud enabled?
                if (globals.config.has('Butler.qlikSenseCloud.enable') && globals.config.get('Butler.qlikSenseCloud.enable') === true) {
                    // Post to Teams when an app reload has failed, if enabled
                    if (
                        globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') &&
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') ===
                            true
                    ) {
                        logger.verbose(`QLIK SENSE CLOUD: Sending Teams notification about app reload failure`);

                        // Should we get extended info about the event, or go with the basic info provided in the event/MQTT message?
                        // If extended info is enabled, we need to make API calls to get the extended info
                        // If extended info is disabled, we can use the basic info provided in the event/MQTT message
                        if (
                            globals.config.has(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicContentOnly',
                            ) &&
                            globals.config.get(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicContentOnly',
                            ) === false
                        ) {
                            // Get extended info about the event
                            // This includes:
                            // - Reload script log
                            // - Reload info
                            // - App info

                            // Script log is available via "GET /v1/apps/{appId}/reloads/logs/{reloadId}"
                            // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-reloads-logs-reloadId
                            try {
                                const headLineCount = globals.config.get(
                                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines',
                                );

                                const tailLineCount = globals.config.get(
                                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines',
                                );

                                scriptLog = await getQlikSenseCloudAppReloadScriptLog(appId, reloadId, headLineCount, tailLineCount);

                                // If return value is false, the script log could not be obtained
                                if (scriptLog === false) {
                                    logger.warn(
                                        `QLIK SENSE CLOUD: Could not get app reload script log. App ID="${appId}", reload ID="${reloadId}"`,
                                    );
                                } else {
                                    logger.verbose(
                                        `QLIK SENSE CLOUD: App reload script log obtained. App ID="${appId}", reload ID="${reloadId}"`,
                                    );
                                }
                                logger.debug(`QLIK SENSE CLOUD: App reload script log: ${scriptLog}`);
                            } catch (err) {
                                logger.error(
                                    `QLIK SENSE CLOUD: Could not get app reload script log. Error=${JSON.stringify(err, null, 2)}`,
                                );
                            }

                            // Reload info is available via "GET /v1/reloads/{reloadId}"
                            // https://qlik.dev/apis/rest/reloads/#get-v1-reloads-reloadId
                            try {
                                reloadInfo = await getQlikSenseCloudAppReloadInfo(reloadId);
                                reloadTrigger = reloadInfo.type;

                                logger.verbose(`QLIK SENSE CLOUD: App reload info obtained. App ID="${appId}", reload ID="${reloadId}"`);
                                logger.debug(`QLIK SENSE CLOUD: App reload info: ${JSON.stringify(reloadInfo, null, 2)}`);
                            } catch (err) {
                                logger.error(`QLIK SENSE CLOUD: Could not get app reload info. Error=${JSON.stringify(err, null, 2)}`);
                            }

                            // App info is available via "GET /v1/apps/{appId}"
                            // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId
                            try {
                                appInfo = await getQlikSenseCloudAppInfo(appId);

                                logger.verbose(`QLIK SENSE CLOUD: App info obtained. App ID="${appId}"`);
                                logger.debug(`QLIK SENSE CLOUD: App info: ${JSON.stringify(appInfo, null, 2)}`);
                            } catch (err) {
                                logger.error(`QLIK SENSE CLOUD: Could not get app info. Error=${JSON.stringify(err, null, 2)}`);
                            }
                        } else {
                            // Use the basic info provided in the event/MQTT message
                            scriptLog = {};
                            reloadInfo.appId = appId;
                            reloadInfo.reloadId = reloadId;
                        }

                        sendQlikSenseCloudAppReloadFailureNotificationTeams({
                            tenantId,
                            tenantComment,
                            userId,
                            ownerId,
                            appId,
                            appName,
                            reloadTrigger,

                            source,
                            eventType,
                            eventTypeVersion,
                            duration,
                            endedWithMemoryConstraint,
                            errors,
                            isDirectQueryMode,
                            isPartialReload,
                            isSessionApp,
                            isSkipStore,
                            peakMemoryBytes,
                            reloadId,
                            rowLimit,
                            statements,
                            status,
                            usage,
                            warnings,
                            sizeMemory,

                            scriptLog,
                            reloadInfo,
                            appInfo,
                        });
                    }

                    // Post to Slack when an app reload has failed, if enabled
                    if (
                        globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable') &&
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable') ===
                            true
                    ) {
                        logger.verbose(`QLIK SENSE CLOUD: Sending Slack notification about app reload failure`);

                        // Should we get extended info about the event, or go with the basic info provided in the event/MQTT message?
                        // If extended info is enabled, we need to make API calls to get the extended info
                        // If extended info is disabled, we can use the basic info provided in the event/MQTT message
                        if (
                            globals.config.has(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicContentOnly',
                            ) &&
                            globals.config.get(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicContentOnly',
                            ) === false
                        ) {
                            // Get extended info about the event
                            // This includes:
                            // - Reload script log
                            // - Reload info
                            // - App info

                            // Script log is available via "GET /v1/apps/{appId}/reloads/logs/{reloadId}"
                            // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-reloads-logs-reloadId
                            try {
                                const headLineCount = globals.config.get(
                                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.headScriptLogLines',
                                );

                                const tailLineCount = globals.config.get(
                                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.tailScriptLogLines',
                                );

                                scriptLog = await getQlikSenseCloudAppReloadScriptLog(appId, reloadId, headLineCount, tailLineCount);

                                // If return value is false, the script log could not be obtained
                                if (scriptLog === false) {
                                    logger.warn(
                                        `QLIK SENSE CLOUD: Could not get app reload script log. App ID="${appId}", reload ID="${reloadId}"`,
                                    );
                                } else {
                                    logger.verbose(
                                        `QLIK SENSE CLOUD: App reload script log obtained. App ID="${appId}", reload ID="${reloadId}"`,
                                    );
                                }
                                logger.debug(`QLIK SENSE CLOUD: App reload script log: ${scriptLog}`);
                            } catch (err) {
                                logger.error(
                                    `QLIK SENSE CLOUD: Could not get app reload script log. Error=${JSON.stringify(err, null, 2)}`,
                                );
                            }

                            // Reload info is available via "GET /v1/reloads/{reloadId}"
                            // https://qlik.dev/apis/rest/reloads/#get-v1-reloads-reloadId
                            try {
                                reloadInfo = await getQlikSenseCloudAppReloadInfo(reloadId);
                                reloadTrigger = reloadInfo.type;

                                logger.verbose(`QLIK SENSE CLOUD: App reload info obtained. App ID="${appId}", reload ID="${reloadId}"`);
                                logger.debug(`QLIK SENSE CLOUD: App reload info: ${JSON.stringify(reloadInfo, null, 2)}`);
                            } catch (err) {
                                logger.error(`QLIK SENSE CLOUD: Could not get app reload info. Error=${JSON.stringify(err, null, 2)}`);
                            }

                            // App info is available via "GET /v1/apps/{appId}"
                            // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId
                            try {
                                appInfo = await getQlikSenseCloudAppInfo(appId);

                                logger.verbose(`QLIK SENSE CLOUD: App info obtained. App ID="${appId}"`);
                                logger.debug(`QLIK SENSE CLOUD: App info: ${JSON.stringify(appInfo, null, 2)}`);
                            } catch (err) {
                                logger.error(`QLIK SENSE CLOUD: Could not get app info. Error=${JSON.stringify(err, null, 2)}`);
                            }
                        } else {
                            // Use the basic info provided in the event/MQTT message
                            scriptLog = {};
                            reloadInfo.appId = appId;
                            reloadInfo.reloadId = reloadId;
                        }

                        // Send Slack notification
                        sendQlikSenseCloudAppReloadFailureNotificationSlack({
                            tenantId,
                            tenantComment,
                            userId,
                            ownerId,
                            appId,
                            appName,
                            reloadTrigger,

                            source,
                            eventType,
                            eventTypeVersion,
                            duration,
                            endedWithMemoryConstraint,
                            errors,
                            isDirectQueryMode,
                            isPartialReload,
                            isSessionApp,
                            isSkipStore,
                            peakMemoryBytes,
                            reloadId,
                            rowLimit,
                            statements,
                            status,
                            usage,
                            warnings,
                            sizeMemory,

                            scriptLog,
                            reloadInfo,
                            appInfo,
                        });
                    }
                }
            }
        }

        return true;
    } catch (err) {
        logger.error(`Qlik Sense Cloud app reload finished event handling error: ${err}`);
        return false;
    }
}
