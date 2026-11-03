/**
 * Script log handling for Qlik Sense Cloud app reload alerts.
 *
 * The email, Teams and Slack senders all show the same parts of a failed reload's script log.
 * This module prepares those parts once, also when the script log could not be obtained.
 */

import { getQlikSenseCloudAppReloadScriptLogHead, getQlikSenseCloudAppReloadScriptLogTail } from './api/appreloadinfo.js';

/**
 * Prepare the script log of a failed app reload for use in alert templates.
 *
 * @param {Object|boolean} scriptLog - Script log from getQlikSenseCloudAppReloadScriptLog(), or false if it could not be obtained
 * @param {number} headLineCount - Number of lines to get from the start of the script log
 * @param {number} tailLineCount - Number of lines to get from the end of the script log
 * @returns {Object} Script log fields for alert templates. scriptLogAvailable is false when there is no script log to show.
 */
export function prepareQlikSenseCloudScriptLogForNotification(scriptLog, headLineCount, tailLineCount) {
    const scriptLogFull = Array.isArray(scriptLog?.scriptLogFull) ? scriptLog.scriptLogFull : [];
    const scriptLogAvailable = scriptLogFull.length > 0;

    return {
        scriptLogAvailable,
        scriptLogSizeRows: scriptLogFull.length,
        scriptLogSizeCharacters: scriptLogFull.join('').length,
        scriptLogHeadCount: headLineCount,
        scriptLogTailCount: tailLineCount,
        scriptLogHead: scriptLogAvailable ? getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, headLineCount) : '',
        scriptLogTail: scriptLogAvailable ? getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, tailLineCount) : '',
    };
}
