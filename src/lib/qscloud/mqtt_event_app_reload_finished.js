import globals from '../../globals.js';
import { getQlikSenseCloudAppReloadScriptLog, getQlikSenseCloudAppReloadInfo } from './api/appreloadinfo.js';
import { getQlikSenseCloudAppInfo, getQlikSenseCloudAppMetadata, getQlikSenseCloudAppItems } from './api/app.js';
import { sendQlikSenseCloudAppReloadFailureNotificationTeams } from './msteams_notification_qscloud.js';
import { sendQlikSenseCloudAppReloadFailureNotificationSlack } from './slack_notification_qscloud.js';
import { sendQlikSenseCloudAppReloadFailureNotificationEmail } from './email_notification_qscloud.js';

const { config, logger } = globals;

// Function to handle Qlik Sense Cloud app reload finished event
// These events are received as MQTT messages, via a gateway that forwards the Qlik Sense Cloud webhook API events to MQTT
//
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
                let appMetadata = {};
                let appItems = {};

                // App reload did fail. Send enabled notifications/alerts
                logger.info(`QLIK SENSE CLOUD: App reload failed. App ID=[${appId}] name="${message.data.name}"`);

                // Are notifications from QS Cloud enabled?
                if (globals.config.get('Butler.qlikSenseCloud.enable') === true) {
                    // Post to Teams when an app reload has failed, if enabled
                    if (
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') ===
                        true
                    ) {
                        logger.verbose(`QLIK SENSE CLOUD: Sending Teams notification about app reload failure`);

                        // Should we get extended info about the event, or go with the basic info provided in the event/MQTT message?
                        // If extended info is enabled, we need to make API calls to get the extended info
                        // If extended info is disabled, we can use the basic info provided in the event/MQTT message
                        if (
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

                        // App metadata is available via "GET /v1/apps/{appId}/data/metadata"
                        // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-data-metadata
                        try {
                            appMetadata = await getQlikSenseCloudAppMetadata(appId);

                            logger.verbose(`QLIK SENSE CLOUD: App metadata obtained. App ID="${appId}"`);
                            logger.debug(`QLIK SENSE CLOUD: App metadata: ${JSON.stringify(appMetadata, null, 2)}`);
                        } catch (err) {
                            logger.error(`QLIK SENSE CLOUD: Could not get app metadata. Error=${JSON.stringify(err, null, 2)}`);
                        }

                        // App items are available via "GET /v1/items"
                        // https://qlik.dev/apis/rest/items/#get-v1-items
                        try {
                            appItems = await getQlikSenseCloudAppItems(appId);

                            // There should be exactly one item in the appItems.data array, with a resourceId property that is the same as the app ID
                            // error if not
                            if (appItems?.data.length !== 1 || appItems?.data[0].resourceId !== appId) {
                                logger.error(
                                    `QLIK SENSE CLOUD: App items obtained, but app ID does not match. App ID="${appId}", appItems="${JSON.stringify(
                                        appItems,
                                        null,
                                        2,
                                    )}"`,
                                );

                                // Set appItems to empty object
                                appItems = {};
                            }

                            logger.verbose(`QLIK SENSE CLOUD: App items obtained. App ID="${appId}"`);
                            logger.debug(`QLIK SENSE CLOUD: App items: ${JSON.stringify(appItems, null, 2)}`);
                        } catch (err) {
                            logger.error(`QLIK SENSE CLOUD: Could not get app items. Error=${JSON.stringify(err, null, 2)}`);
                        }

                        // Get info from config file
                        const tenantUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl');

                        // Build URL to the app in Qlik Sense Cloud
                        // Format: <tenantUrl>/sense/app/<appId>
                        // Take into account that tenant URL might have a trailing slash
                        const appUrl = `${tenantUrl}${tenantUrl.endsWith('/') ? '' : '/'}sense/app/${appId}`;

                        sendQlikSenseCloudAppReloadFailureNotificationTeams({
                            tenantId,
                            tenantComment,
                            tenantUrl,
                            userId,
                            ownerId,
                            appId,
                            appName,
                            appUrl,
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
                            appMetadata,
                            appItems: appItems?.data[0],
                        });
                    }

                    // Post to Slack when an app reload has failed, if enabled
                    if (
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable') ===
                        true
                    ) {
                        logger.verbose(`QLIK SENSE CLOUD: Sending Slack notification about app reload failure`);

                        // Should we get extended info about the event, or go with the basic info provided in the event/MQTT message?
                        // If extended info is enabled, we need to make API calls to get the extended info
                        // If extended info is disabled, we can use the basic info provided in the event/MQTT message
                        if (
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

                        // App metadata is available via "GET /v1/apps/{appId}/data/metadata"
                        // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-data-metadata
                        try {
                            appMetadata = await getQlikSenseCloudAppMetadata(appId);

                            logger.verbose(`QLIK SENSE CLOUD: App metadata obtained. App ID="${appId}"`);
                            logger.debug(`QLIK SENSE CLOUD: App metadata: ${JSON.stringify(appMetadata, null, 2)}`);
                        } catch (err) {
                            logger.error(`QLIK SENSE CLOUD: Could not get app metadata. Error=${JSON.stringify(err, null, 2)}`);
                        }

                        // App items are available via "GET /v1/items"
                        // https://qlik.dev/apis/rest/items/#get-v1-items
                        try {
                            appItems = await getQlikSenseCloudAppItems(appId);

                            // There should be exactly one item in the appItems.data array, with a resourceId property that is the same as the app ID
                            // error if not
                            if (appItems?.data.length !== 1 || appItems?.data[0].resourceId !== appId) {
                                logger.error(
                                    `QLIK SENSE CLOUD: App items obtained, but app ID does not match. App ID="${appId}", appItems="${JSON.stringify(
                                        appItems,
                                        null,
                                        2,
                                    )}"`,
                                );

                                // Set appItems to empty object
                                appItems = {};
                            }

                            logger.verbose(`QLIK SENSE CLOUD: App items obtained. App ID="${appId}"`);
                            logger.debug(`QLIK SENSE CLOUD: App items: ${JSON.stringify(appItems, null, 2)}`);
                        } catch (err) {
                            logger.error(`QLIK SENSE CLOUD: Could not get app items. Error=${JSON.stringify(err, null, 2)}`);
                        }

                        // Get info from config file
                        const tenantUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl');

                        // Build URL to the app in Qlik Sense Cloud
                        // Format: <tenantUrl>/sense/app/<appId>
                        // Take into account that tenant URL might have a trailing slash
                        const appUrl = `${tenantUrl}${tenantUrl.endsWith('/') ? '' : '/'}sense/app/${appId}`;

                        // Send Slack notification
                        sendQlikSenseCloudAppReloadFailureNotificationSlack({
                            tenantId,
                            tenantComment,
                            tenantUrl,
                            userId,
                            ownerId,
                            appId,
                            appName,
                            appUrl,
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
                            appMetadata,
                            appItems: appItems?.data[0],
                        });
                    }

                    // Send email when an app reload has failed, if enabled
                    if (
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') ===
                        true
                    ) {
                        logger.verbose(`QLIK SENSE CLOUD: Sending email notification about app reload failure`);

                        // Get extended info about the event
                        // This includes:
                        // - Reload script log
                        // - Reload info
                        // - App info
                        // - App metadata
                        // - App items

                        // Script log is available via "GET /v1/apps/{appId}/reloads/logs/{reloadId}"
                        // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-reloads-logs-reloadId
                        try {
                            const headLineCount = globals.config.get(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.headScriptLogLines',
                            );

                            const tailLineCount = globals.config.get(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.tailScriptLogLines',
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
                            logger.error(`QLIK SENSE CLOUD: Could not get app reload script log. Error=${JSON.stringify(err, null, 2)}`);
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

                        // App metadata is available via "GET /v1/apps/{appId}/data/metadata"
                        // https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-data-metadata
                        try {
                            appMetadata = await getQlikSenseCloudAppMetadata(appId);

                            logger.verbose(`QLIK SENSE CLOUD: App metadata obtained. App ID="${appId}"`);
                            logger.debug(`QLIK SENSE CLOUD: App metadata: ${JSON.stringify(appMetadata, null, 2)}`);
                        } catch (err) {
                            logger.error(`QLIK SENSE CLOUD: Could not get app metadata. Error=${JSON.stringify(err, null, 2)}`);
                        }

                        // App items are available via "GET /v1/items"
                        // https://qlik.dev/apis/rest/items/#get-v1-items
                        try {
                            appItems = await getQlikSenseCloudAppItems(appId);

                            // There should be exactly one item in the appItems.data array, with a resourceId property that is the same as the app ID
                            // error if not
                            if (appItems?.data.length !== 1 || appItems?.data[0].resourceId !== appId) {
                                logger.error(
                                    `QLIK SENSE CLOUD: App items obtained, but app ID does not match. App ID="${appId}", appItems="${JSON.stringify(
                                        appItems,
                                        null,
                                        2,
                                    )}"`,
                                );

                                // Set appItems to empty object
                                appItems = {};
                            }

                            logger.verbose(`QLIK SENSE CLOUD: App items obtained. App ID="${appId}"`);
                            logger.debug(`QLIK SENSE CLOUD: App items: ${JSON.stringify(appItems, null, 2)}`);
                        } catch (err) {
                            logger.error(`QLIK SENSE CLOUD: Could not get app items. Error=${JSON.stringify(err, null, 2)}`);
                        }

                        // Get info from config file
                        const tenantUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl');

                        // Build URL to the app in Qlik Sense Cloud
                        // Format: <tenantUrl>/sense/app/<appId>
                        // Take into account that tenant URL might have a trailing slash
                        const appUrl = `${tenantUrl}${tenantUrl.endsWith('/') ? '' : '/'}sense/app/${appId}`;

                        // Send email notification
                        sendQlikSenseCloudAppReloadFailureNotificationEmail({
                            tenantId,
                            tenantComment,
                            tenantUrl,
                            userId,
                            ownerId,
                            appId,
                            appName,
                            appUrl,
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
                            appMetadata,
                            appItems: appItems?.data[0],
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
