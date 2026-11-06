/**
 * Qlik Sense Cloud MQTT Event Handler - App Reload Finished.
 *
 * This module processes MQTT events received from Qlik Sense Cloud via an MQTT gateway.
 * It handles app reload finished events (success or failure) and triggers appropriate notifications.
 *
 * Processing flow:
 * 1. Receive MQTT message with app reload info
 * 2. Fetch the script log, reload info, app info, app items, app owner and the user who triggered the reload from QSC APIs, all at once
 * 3. Send notifications via configured channels (Teams, Slack, Email)
 */

import path from 'path';
import fs from 'fs';

import globals from '../../globals.js';
import { getQlikSenseCloudAppReloadScriptLog, getQlikSenseCloudAppReloadInfo } from './api/appreloadinfo.js';
import { getQlikSenseCloudAppInfo, getQlikSenseCloudAppItems } from './api/app.js';
import { getQlikSenseCloudUserInfo } from './api/user.js';
import { getQlikSenseCloudEventAttributes } from './util.js';
import { sendQlikSenseCloudAppReloadFailureNotificationTeams } from './msteams_notification_qscloud.js';
import { sendQlikSenseCloudAppReloadFailureNotificationSlack } from './slack_notification_qscloud.js';
import { sendQlikSenseCloudAppReloadFailureNotificationEmail } from './email_notification_qscloud.js';

const { config, logger } = globals;

/**
 * Get the value of a Qlik Sense Cloud API read that was run with Promise.allSettled().
 * The API functions return false when a read fails. A read that threw is logged, and treated the same way.
 *
 * @param {PromiseSettledResult} read - The settled read
 * @param {string} description - What was read, for the log
 * @returns {*} The value the read returned, or false if it threw
 */
function getSettledReadValue(read, description) {
    if (read.status === 'rejected') {
        logger.error(`[QSCLOUD] Could not get ${description}. Error=${globals.getErrorMessage(read.reason)}`);
        return false;
    }

    return read.value;
}

/**
 * Handle Qlik Sense Cloud app reload finished event.
 * These events are received as MQTT messages, via a gateway that forwards the Qlik Sense Cloud webhook API events to MQTT.
 *
 * @param {Object} message - MQTT message object, as sent by Qlik Sense Cloud webhook API, in the CloudEvents or the legacy format
 * @returns {Promise<boolean>} - Returns true if successful, otherwise false
 */
export async function handleQlikSenseCloudAppReloadFinished(message) {
    try {
        // Get the event's type, time, source and IDs, whichever format the event is in
        // The app is the event's top level resource
        const {
            source,
            eventType,
            eventTime,
            eventTypeVersion,
            authType,
            ownerId,
            tenantId,
            userId,
            topLevelResourceId: appId,
        } = getQlikSenseCloudEventAttributes(message);

        // Make sure eventType is 'com.qlik.v1.app.reload.finished'
        if (eventType === 'com.qlik.v1.app.reload.finished') {
            // What is app reload status?
            // Possible values: 'ok', 'error'
            if (message.data.status === 'error') {
                // Get  info about the app reload from the message sent by Qlik Sense Cloud
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

                // An event without a tenant ID can't be from a monitored tenant. Say so, rather than blame the config file below
                if (!tenantId) {
                    logger.warn(`[QSCLOUD] Incoming MQTT event from Qlik Sense Cloud has no tenant ID. Skipping event. App ID="${appId}"`);
                    return false;
                }

                // Make sure incoming message is from a Qlik Sense Cloud tenant that we are monitoring
                // If the tenant ID is not in the list of monitored tenants, skip the event and warn about it
                // Valid tenant ID is defined in the Butler configuration file
                if (!monitoredTenants.some((tenant) => tenant.id === tenantId)) {
                    logger.warn(
                        `[QSCLOUD] Incoming MQTT event from Qlik Sense Cloud, but tenant ID "${tenantId}" is not defined in the Butler configuration file. Skipping event.`,
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
                let appItems = {};
                let appOwner = {};
                let reloadUser = {};

                // App reload did fail. Send enabled notifications/alerts, store script log etc
                logger.info(`[QSCLOUD] App reload failed. App ID=[${appId}] name="${message.data.name}"`);

                // Are notifications from QS Cloud enabled?
                if (globals.config.get('Butler.qlikSenseCloud.enable') === true) {
                    // Get info that will be needed later from QS CLoud APIs
                    // This includes:
                    // - Reload script log, via "GET /v1/apps/{appId}/reloads/logs/{reloadId}"
                    //   https://qlik.dev/apis/rest/apps/#get-v1-apps-appId-reloads-logs-reloadId
                    // - Reload info, via "GET /v1/reloads/{reloadId}"
                    //   https://qlik.dev/apis/rest/reloads/#get-v1-reloads-reloadId
                    // - App info, via "GET /v1/apps/{appId}"
                    //   https://qlik.dev/apis/rest/apps/#get-v1-apps-appId
                    // - App items, via "GET /v1/items"
                    //   https://qlik.dev/apis/rest/items/#get-v1-items
                    // - App owner, via "GET /v1/users/{userId}"
                    //   https://qlik.dev/apis/rest/users/#get-v1-users-userId
                    // - The user who triggered the reload, the same way. Not read when that is the app owner, who is read anyway,
                    //   nor when the event has no user ID, or says that a service account triggered the reload
                    //   Only the alerts use the app owner and that user, so they are only read if at least one alert channel is enabled
                    // The reads don't depend on each other, so they run at the same time.
                    // When the APIs are slow or time out, the alerts then wait for the slowest read, not for all of them in turn.
                    const alertChannelEnabled = ['teamsNotification', 'slackNotification', 'emailNotification'].some(
                        (channel) =>
                            globals.config.get(`Butler.qlikSenseCloud.event.mqtt.tenant.alert.${channel}.reloadAppFailure.enable`) === true,
                    );

                    // Where the alerts get the user who triggered the reload from
                    let reloadUserSource = 'user read';
                    if (!userId || authType === 'service_account') {
                        reloadUserSource = 'none';
                    } else if (userId === ownerId) {
                        reloadUserSource = 'app owner';
                    }

                    const [scriptLogRead, reloadInfoRead, appInfoRead, appItemsRead, appOwnerRead, reloadUserRead] =
                        await Promise.allSettled([
                            getQlikSenseCloudAppReloadScriptLog(appId, reloadId),
                            getQlikSenseCloudAppReloadInfo(reloadId),
                            getQlikSenseCloudAppInfo(appId),
                            getQlikSenseCloudAppItems(appId),
                            alertChannelEnabled ? getQlikSenseCloudUserInfo(ownerId) : undefined,
                            alertChannelEnabled && reloadUserSource === 'user read' ? getQlikSenseCloudUserInfo(userId) : undefined,
                        ]);

                    // If a value is false, that info could not be obtained
                    scriptLog = getSettledReadValue(scriptLogRead, 'app reload script log');
                    if (scriptLog === false) {
                        logger.warn(`[QSCLOUD] Could not get app reload script log. App ID="${appId}", reload ID="${reloadId}"`);
                    } else {
                        logger.verbose(`[QSCLOUD]  App reload script log obtained. App ID="${appId}", reload ID="${reloadId}"`);
                    }
                    logger.debug(`[QSCLOUD] App reload script log: ${scriptLog}`);

                    reloadInfo = getSettledReadValue(reloadInfoRead, 'app reload info');
                    reloadTrigger = reloadInfo.type;
                    if (reloadInfo === false) {
                        logger.warn(`[QSCLOUD] Could not get app reload info. App ID="${appId}", reload ID="${reloadId}"`);
                    } else {
                        logger.verbose(`[QSCLOUD] App reload info obtained. App ID="${appId}", reload ID="${reloadId}"`);
                    }
                    logger.debug(`[QSCLOUD] App reload info: ${JSON.stringify(reloadInfo, null, 2)}`);

                    appInfo = getSettledReadValue(appInfoRead, 'app info');
                    if (appInfo === false) {
                        logger.warn(`[QSCLOUD] Could not get app info. App ID="${appId}"`);
                    } else {
                        logger.verbose(`[QSCLOUD] App info obtained. App ID="${appId}"`);
                    }
                    logger.debug(`[QSCLOUD] App info: ${JSON.stringify(appInfo, null, 2)}`);

                    appItems = getSettledReadValue(appItemsRead, 'app items');
                    if (appItems === false) {
                        logger.warn(`[QSCLOUD] Could not get app items. App ID="${appId}"`);
                    } else if (appItems?.data?.length !== 1 || appItems.data[0].resourceId !== appId) {
                        // There should be exactly one item in the appItems.data array, with a resourceId property that is the same as the app ID
                        // error if not
                        logger.error(
                            `[QSCLOUD] App items obtained, but app ID does not match. App ID="${appId}", appItems="${JSON.stringify(
                                appItems,
                                null,
                                2,
                            )}"`,
                        );

                        // Set appItems to empty object
                        appItems = {};
                    } else {
                        logger.verbose(`[QSCLOUD] App items obtained. App ID="${appId}"`);
                    }
                    logger.debug(`[QSCLOUD] App items: ${JSON.stringify(appItems, null, 2)}`);

                    // The alerts show the app owner, and the email alert can be sent to them
                    if (alertChannelEnabled) {
                        appOwner = getSettledReadValue(appOwnerRead, 'app owner');
                        if (appOwner === false) {
                            logger.warn(`[QSCLOUD] Could not get app owner. App ID="${appId}", owner ID="${ownerId}"`);
                        } else {
                            logger.verbose(`[QSCLOUD] App owner obtained. App ID="${appId}", owner ID="${ownerId}"`);
                        }

                        // The alerts also show the name of the user who triggered the reload.
                        // When there is no such user to get, the alerts show the user as unknown
                        if (reloadUserSource === 'none') {
                            reloadUser = false;
                            logger.verbose(
                                `[QSCLOUD] No user who triggered the app reload to get, as ${userId ? 'a service account triggered it' : 'the event has no user ID'}. App ID="${appId}"`,
                            );
                        } else if (reloadUserSource === 'app owner') {
                            reloadUser = appOwner;
                        } else {
                            reloadUser = getSettledReadValue(reloadUserRead, 'the user who triggered the app reload');
                            if (reloadUser === false) {
                                logger.warn(
                                    `[QSCLOUD] Could not get the user who triggered the app reload. App ID="${appId}", user ID="${userId}"`,
                                );
                            } else {
                                logger.verbose(
                                    `[QSCLOUD] User who triggered the app reload obtained. App ID="${appId}", user ID="${userId}"`,
                                );
                            }
                        }
                    }

                    // Get info from config file
                    const tenantUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl');

                    // Build URL to the app in Qlik Sense Cloud
                    // Format: <tenantUrl>/sense/app/<appId>
                    // Take into account that tenant URL might have a trailing slash
                    const appUrl = `${tenantUrl}${tenantUrl.endsWith('/') ? '' : '/'}sense/app/${appId}`;

                    // Save script log to disk file, if enabled
                    // Storing script logs on disk is optional, and so is the Butler.scriptLog section of the config file
                    if (
                        globals.config.has('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable') &&
                        globals.config.get('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable') === true
                    ) {
                        if (Array.isArray(scriptLog?.scriptLogFull)) {
                            logger.verbose(`[QSCLOUD] Storing script log to disk file`);

                            // An error while storing the script log is logged, and doesn't stop the alerts below from being sent
                            let fileName;
                            try {
                                // Get path to the directory where script logs will be stored
                                const scriptLogDirRoot = globals.config.get(
                                    'Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory',
                                );

                                // eventTime has format "2024-10-14T11:31:39Z"
                                // The CloudEvents format doesn't require an event time, so an event without one is stored under the time Butler got it
                                const logTime = eventTime || new Date().toISOString();

                                // Set logDate variable to date part of the event time
                                const logDate = logTime.slice(0, 10);
                                const reloadLogDir = path.resolve(scriptLogDirRoot, logDate);

                                logger.debug(`[QSCLOUD] Script log directory: ${reloadLogDir}`);

                                // Get error time stamp from the event time, in format YYY-MM-DD_HH-MM-SS
                                const logTimeStamp = logTime.slice(0, 19).replace(/ /g, '_').replace(/:/g, '-');

                                fileName = path.resolve(reloadLogDir, `${logTimeStamp}_appId=${appId}_reloadId=${reloadId}.log`);

                                // Create directory for script logs, if needed, and write script log to disk file
                                fs.mkdirSync(reloadLogDir, { recursive: true });

                                logger.info(`[QSCLOUD] Writing failed task script log: ${fileName}`);
                                fs.writeFileSync(fileName, scriptLog.scriptLogFull.join('\n'));
                            } catch (err) {
                                logger.error(
                                    `[QSCLOUD] Could not store script log to disk file. File="${fileName}", error=${globals.getErrorMessage(err)}`,
                                );
                            }
                        } else {
                            // The script log could not be obtained, so there is nothing to store
                            logger.warn(
                                `[QSCLOUD] Not storing the script log to disk file, as it could not be obtained. App ID="${appId}", reload ID="${reloadId}"`,
                            );
                        }
                    }

                    // Post to Teams when an app reload has failed, if enabled
                    if (
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') ===
                        true
                    ) {
                        logger.verbose(`[QSCLOUD] Sending Teams notification about app reload failure`);

                        // Should we get extended info about the event, or go with the basic info provided in the event/MQTT message?
                        // If extended info is enabled, we need to make API calls to get the extended info
                        // If extended info is disabled, we can use the basic info provided in the event/MQTT message
                        // Keep the basic info to the Teams alert, so it doesn't change what the Slack and email alerts get
                        let teamsScriptLog = scriptLog;
                        let teamsReloadInfo = reloadInfo;
                        if (
                            globals.config.get(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicContentOnly',
                            ) === true
                        ) {
                            // Use the basic info provided in the event/MQTT message
                            teamsScriptLog = {};
                            teamsReloadInfo = { ...reloadInfo, appId, reloadId };
                        }

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

                            scriptLog: teamsScriptLog,
                            reloadInfo: teamsReloadInfo,
                            appInfo,
                            appItems: appItems?.data?.[0],
                            appOwner,
                            reloadUser,
                        });
                    }

                    // Post to Slack when an app reload has failed, if enabled
                    if (
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable') ===
                        true
                    ) {
                        logger.verbose(`[QSCLOUD] Sending Slack notification about app reload failure`);

                        // Should we get extended info about the event, or go with the basic info provided in the event/MQTT message?
                        // If extended info is enabled, we need to make API calls to get the extended info
                        // If extended info is disabled, we can use the basic info provided in the event/MQTT message
                        // Keep the basic info to the Slack alert, so it doesn't change what the email alert gets
                        let slackScriptLog = scriptLog;
                        let slackReloadInfo = reloadInfo;
                        if (
                            globals.config.get(
                                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicContentOnly',
                            ) === true
                        ) {
                            // Use the basic info provided in the event/MQTT message
                            slackScriptLog = {};
                            slackReloadInfo = { ...reloadInfo, appId, reloadId };
                        }

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

                            scriptLog: slackScriptLog,
                            reloadInfo: slackReloadInfo,
                            appInfo,
                            appItems: appItems?.data?.[0],
                            appOwner,
                            reloadUser,
                        });
                    }

                    // Send email when an app reload has failed, if enabled
                    if (
                        globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') ===
                        true
                    ) {
                        logger.verbose(`[QSCLOUD] Sending email notification about app reload failure`);

                        // Get extended info about the event
                        // This includes:
                        // - Reload script log
                        // - Reload info
                        // - App info
                        // - App items
                        // - App owner
                        // - User who triggered the reload

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
                            appItems: appItems?.data?.[0],
                            appOwner,
                            reloadUser,
                        });
                    }
                }
            }
        } else {
            // The gateway publishes app reload events to the app reload topic, so another event there is unexpected.
            // It can be an event in a format Butler doesn't read, which would otherwise be dropped without a word
            logger.warn(
                `[QSCLOUD] Incoming MQTT event from Qlik Sense Cloud is not an app reload finished event. Skipping event. Event type="${eventType}"`,
            );
            return false;
        }

        return true;
    } catch (err) {
        logger.error(`[QSCLOUD] Qlik Sense Cloud app reload finished event handling error: ${globals.getErrorMessage(err)}`);
        return false;
    }
}
