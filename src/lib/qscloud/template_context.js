/**
 * Template fields for Qlik Sense Cloud app reload alerts.
 *
 * The email, Teams and Slack senders give their templates the same fields.
 * This module prepares them once, also when some of the Qlik Sense Cloud API reads behind them failed.
 */

import globals from '../../globals.js';
import { getQlikSenseCloudUrls } from './util.js';

/**
 * Prepare the template fields for an alert about a failed app reload.
 *
 * Text from Qlik Sense Cloud, such as the reload's log message and the script log, is passed on as it is.
 * Each sender escapes it for its own message format.
 *
 * @param {Object} reloadParams - Info about the failed app reload, as the app reload handler passes it on.
 *      reloadInfo, appInfo, appOwner and reloadUser are false, and appItems is undefined, when they could not be obtained.
 *      reloadUser is the user who triggered the reload. It is also false when there is no such user to get:
 *      the event has no user ID, or says that a service account triggered the reload.
 * @param {Object} scriptLogData - Script log fields from prepareQlikSenseCloudScriptLogForNotification()
 * @returns {Object} Fields for the alert template
 */
export function prepareQlikSenseCloudAppReloadTemplateContext(reloadParams, scriptLogData) {
    // Info that could not be obtained is read from an empty object, so its fields get the defaults below
    const reloadInfo = reloadParams.reloadInfo || {};
    const appAttributes = reloadParams.appInfo?.attributes || {};
    const appOwner = reloadParams.appOwner || {};
    const reloadUser = reloadParams.reloadUser || {};

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseCloudUrls();

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
    }

    return {
        tenantId: reloadParams.tenantId,
        tenantComment: reloadParams.tenantComment,
        tenantUrl: reloadParams.tenantUrl,

        userId: reloadParams.userId,
        userName: reloadUser.name || 'Unknown',

        appId: reloadParams.appId,
        appName: reloadParams.appName,
        appDescription: appAttributes.description || '',
        appUrl: reloadParams.appUrl,
        appHasSectionAccess: appAttributes.hasSectionAccess ?? false,
        appIsPublished: appAttributes.published ?? false,
        appPublishTime: appAttributes.publishTime || '',
        appThumbnail: appAttributes.thumbnail || '',

        reloadTrigger: reloadParams.reloadTrigger,
        source: reloadParams.source,
        eventType: reloadParams.eventType,
        eventTypeVersion: reloadParams.eventTypeVersion,
        endedWithMemoryConstraint: reloadParams.endedWithMemoryConstraint,
        isDirectQueryMode: reloadParams.isDirectQueryMode,
        isPartialReload: reloadParams.isPartialReload,
        isSessionApp: reloadParams.isSessionApp,
        isSkipStore: reloadParams.isSkipStore,

        // The app reload event may lack these numbers
        peakMemoryBytes: Number(reloadParams.peakMemoryBytes || 0).toLocaleString(),
        reloadId: reloadParams.reloadId,
        rowLimit: Number(reloadParams.rowLimit || 0).toLocaleString(),
        statements: reloadParams.statements,
        status: reloadParams.status,
        usageDuration: reloadParams.duration,
        sizeMemoryBytes: Number(reloadParams.sizeMemory || 0).toLocaleString(),
        appFileSize: Number(reloadParams.appItems?.resourceSize?.appFile || 0).toLocaleString(),

        errorCode: reloadInfo.errorCode,
        errorMessage: reloadInfo.errorMessage,
        logMessage: reloadInfo.log ?? '',
        executionDuration: reloadInfo.executionDuration,
        executionStartTime: reloadInfo.executionStartTime,
        executionStopTime: reloadInfo.executionStopTime,
        executionStatusText: reloadInfo.status,
        scriptLogAvailable: scriptLogData.scriptLogAvailable,
        scriptLogSize: scriptLogData.scriptLogSizeRows.toLocaleString(),
        scriptLogSizeRows: scriptLogData.scriptLogSizeRows.toLocaleString(),
        scriptLogSizeCharacters: scriptLogData.scriptLogSizeCharacters.toLocaleString(),
        scriptLogHead: scriptLogData.scriptLogHead,
        scriptLogTail: scriptLogData.scriptLogTail,
        scriptLogTailCount: scriptLogData.scriptLogTailCount,
        scriptLogHeadCount: scriptLogData.scriptLogHeadCount,

        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        genericUrls,

        appOwnerName: appOwner.name || 'Unknown',
        appOwnerUserId: appOwner.id || 'Unknown',
        appOwnerPicture: appOwner.picture || '',
        appOwnerEmail: appOwner.email || 'Unknown',
    };
}

/**
 * Escape line breaks and tabs in text from Qlik Sense Cloud, for a template that renders JSON.
 * Carriage returns are removed, and line feeds and tabs are written as \n and \t escape sequences.
 *
 * @param {string} text - Text to escape
 * @returns {string} The escaped text
 */
export function escapeLineBreaksAndTabsForJson(text) {
    return text
        .replace(/([\r])/gm, '')
        .replace(/([\n])/gm, '\\n')
        .replace(/([\t])/gm, '\\t');
}
