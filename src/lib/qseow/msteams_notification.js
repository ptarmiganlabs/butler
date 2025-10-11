/* eslint-disable no-param-reassign */
import fs from 'fs';
import { Webhook, SimpleTextCard } from 'ms-teams-wrapper';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import { MSTEAMS_TEXT_FIELD_MAX_LENGTH } from '../../constants.js';
import getAppOwner from '../../qrs_util/get_app_owner.js';
import { getQlikSenseUrls } from './get_qs_urls.js';

let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;
let rateLimiterMemoryServiceMonitor;

if (globals.config.has('Butler.teamsNotification.reloadTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.teamsNotification.reloadTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.teamsNotification.reloadTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.teamsNotification.reloadTaskAborted.rateLimit'),
    });
} else {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.teamsNotification.serviceStopped.rateLimit')) {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.teamsNotification.serviceStopped.rateLimit'),
    });
} else {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

/**
 * Checks if the Teams reload failed notification configuration is valid.
 * @returns {Object|boolean} - Returns the configuration object if valid, false otherwise.
 */
function getTeamsReloadFailedNotificationConfigOk() {
    try {
        if (!globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable')) {
            // Teams task falure notifications are disabled
            globals.logger.error(
                '[QSEOW] TEAMS RELOAD TASK FAILED: Reload failure Teams notifications are disabled in config file - will not send Teams message',
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') !== 'basic' &&
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') !== 'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `[QSEOW] TEAMS RELOAD TASK FAILED: Invalid Teams message type: ${globals.config.get(
                    'Butler.teamsNotification.reloadTaskFailure.messageType',
                )}`,
            );
            return false;
        }

        if (globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] TEAMS RELOAD TASK FAILED: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') === 'formatted') {
            // Extended formatting using Teams blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.reloadTaskFailure.templateFile')) {
                globals.logger.error('[QSEOW] TEAMS RELOAD TASK FAILED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.teamsNotification.reloadTaskFailure.webhookURL'),
            messageType: globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType'),
            templateFile: globals.config.get('Butler.teamsNotification.reloadTaskFailure.templateFile'),

            headScriptLogLines: globals.config.has('Butler.teamsNotification.reloadTaskFailure.headScriptLogLines')
                ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.headScriptLogLines')
                : 15,
            tailScriptLogLines: globals.config.has('Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines')
                ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines')
                : 15,
            rateLimit: globals.config.has('Butler.teamsNotification.reloadTaskFailure.rateLimit')
                ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate')
                ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate')
                : '',
        };
    } catch (err) {
        globals.logger.error(`[QSEOW] TEAMS RELOAD TASK FAILED: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if the Teams reload aborted notification configuration is valid.
 * @returns {Object|boolean} - Returns the configuration object if valid, false otherwise.
 */
function getTeamsReloadAbortedNotificationConfigOk() {
    try {
        if (!globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable')) {
            // Teams task aborted notifications are disabled
            globals.logger.error(
                '[QSEOW] TEAMS RELOAD TASK ABORTED: Reload aborted Teams notifications are disabled in config file - will not send Teams message',
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') !== 'basic' &&
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') !== 'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `[QSEOW] TEAMS RELOAD TASK ABORTED: Invalid Teams message type: ${globals.config.get(
                    'Butler.teamsNotification.reloadTaskAborted.messageType',
                )}`,
            );
            return false;
        }

        if (globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] TEAMS RELOAD TASK ABORTED: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') === 'formatted') {
            // Extended formatting using Teams blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.reloadTaskAborted.templateFile')) {
                globals.logger.error('[QSEOW] TEAMS RELOAD TASK ABORTED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.teamsNotification.reloadTaskAborted.webhookURL'),
            messageType: globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType'),
            templateFile: globals.config.get('Butler.teamsNotification.reloadTaskAborted.templateFile'),

            headScriptLogLines: globals.config.has('Butler.teamsNotification.reloadTaskAborted.headScriptLogLines')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.headScriptLogLines')
                : 15,
            tailScriptLogLines: globals.config.has('Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines')
                : 15,
            rateLimit: globals.config.has('Butler.teamsNotification.reloadTaskAborted.rateLimit')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate')
                : '',
            channel: globals.config.has('Butler.teamsNotification.reloadTaskAborted.channel')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.channel')
                : '',
        };
    } catch (err) {
        globals.logger.error(`[QSEOW] TEAMS RELOAD TASK ABORTED: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Gets the Teams service monitor notification configuration.
 * @param {string} serviceStatus - The status of the service.
 * @returns {Object|boolean} - Returns the configuration object if valid, false otherwise.
 */
function getTeamsServiceMonitorNotificationConfig(serviceStatus) {
    try {
        if (!globals.config.get('Butler.serviceMonitor.alertDestination.teams.enable')) {
            // Teams notifications are disabled
            globals.logger.error(
                '[QSEOW] TEAMS SERVICE MONITOR: TEAMS SERVICE MONITOR notifications are disabled in config file - will not send Teams message',
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.serviceStopped.messageType') !== 'basic' &&
            globals.config.get('Butler.teamsNotification.serviceStopped.messageType') !== 'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `[QSEOW] TEAMS SERVICE MONITOR: Invalid Teams message type: ${globals.config.get(
                    'Butler.teamsNotification.serviceStopped.messageType',
                )}`,
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.serviceStarted.messageType') !== 'basic' &&
            globals.config.get('Butler.teamsNotification.serviceStarted.messageType') !== 'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `[QSEOW] TEAMS SERVICE MONITOR: Invalid Teams message type: ${globals.config.get(
                    'Butler.teamsNotification.serviceStopped.messageType',
                )}`,
            );
            return false;
        }

        if (globals.config.get('Butler.teamsNotification.serviceStopped.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.serviceStopped.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] TEAMS SERVICE MONITOR: No service stopped basic message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.teamsNotification.serviceStopped.messageType') === 'formatted') {
            // Extended formatting using Teams blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.serviceStopped.templateFile')) {
                globals.logger.error('[QSEOW] TEAMS SERVICE MONITOR: Service stopped message template file not specified in config file.');
                return false;
            }
        }

        if (globals.config.get('Butler.teamsNotification.serviceStarted.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.serviceStarted.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] TEAMS SERVICE MONITOR: No service started basic message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.teamsNotification.serviceStarted.messageType') === 'formatted') {
            // Extended formatting using Teams blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.serviceStarted.templateFile')) {
                globals.logger.error('[QSEOW] TEAMS SERVICE MONITOR: Service started message template file not specified in config file.');
                return false;
            }
        }

        let result = {};

        if (serviceStatus === 'RUNNING') {
            result = {
                webhookUrl: globals.config.get('Butler.teamsNotification.serviceStarted.webhookURL'),
                messageType: globals.config.get('Butler.teamsNotification.serviceStarted.messageType'),
                templateFile: globals.config.get('Butler.teamsNotification.serviceStarted.templateFile'),

                rateLimit: globals.config.has('Butler.teamsNotification.serviceStarted.rateLimit')
                    ? globals.config.get('Butler.teamsNotification.serviceStarted.rateLimit')
                    : '',
                basicMsgTemplate: globals.config.has('Butler.teamsNotification.serviceStarted.basicMsgTemplate')
                    ? globals.config.get('Butler.teamsNotification.serviceStarted.basicMsgTemplate')
                    : '',
                channel: globals.config.has('Butler.teamsNotification.serviceStarted.channel')
                    ? globals.config.get('Butler.teamsNotification.serviceStarted.channel')
                    : '',
            };
        }

        if (serviceStatus === 'STOPPED') {
            result = {
                webhookUrl: globals.config.get('Butler.teamsNotification.serviceStopped.webhookURL'),
                messageType: globals.config.get('Butler.teamsNotification.serviceStopped.messageType'),
                templateFile: globals.config.get('Butler.teamsNotification.serviceStopped.templateFile'),

                rateLimit: globals.config.has('Butler.teamsNotification.serviceStopped.rateLimit')
                    ? globals.config.get('Butler.teamsNotification.serviceStopped.rateLimit')
                    : '',
                basicMsgTemplate: globals.config.has('Butler.teamsNotification.serviceStopped.basicMsgTemplate')
                    ? globals.config.get('Butler.teamsNotification.serviceStopped.basicMsgTemplate')
                    : '',
                channel: globals.config.has('Butler.teamsNotification.serviceStopped.channel')
                    ? globals.config.get('Butler.teamsNotification.serviceStopped.channel')
                    : '',
            };
        }

        return result;
    } catch (err) {
        globals.logger.error(`[QSEOW] TEAMS SERVICE MONITOR: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Sends a Teams notification.
 * @param {string} teamsWebhookUrl - The Teams webhook URL.
 * @param {Object} teamsConfig - The Teams configuration object.
 * @param {Object} templateContext - The template context object.
 * @param {string} msgType - The type of message.
 */
async function sendTeams(teamsWebhookUrl, teamsConfig, templateContext, msgType) {
    try {
        let compiledTemplate;
        let renderedText = null;
        let msg = null;

        if (teamsConfig.messageType === 'basic') {
            compiledTemplate = handlebars.compile(teamsConfig.basicMsgTemplate);
            renderedText = compiledTemplate(templateContext);

            msg = {
                '@type': 'MessageCard',
                '@context': 'https://schema.org/extensions',
                summary: renderedText,
                themeColor: '0078D7',
                title: renderedText,
                potentialAction: [
                    {
                        '@type': 'OpenUri',
                        name: 'Qlik Sense QMC',
                        targets: [
                            {
                                os: 'default',
                                uri: templateContext.qlikSenseQMC,
                            },
                        ],
                    },
                    {
                        '@type': 'OpenUri',
                        name: 'Qlik Sense Hub',
                        targets: [
                            {
                                os: 'default',
                                uri: templateContext.qlikSenseHub,
                            },
                        ],
                    },
                ],
            };
        } else if (teamsConfig.messageType === 'formatted') {
            try {
                if (fs.existsSync(teamsConfig.templateFile) === true) {
                    const template = fs.readFileSync(teamsConfig.templateFile, 'utf8');
                    compiledTemplate = handlebars.compile(template);

                    // Register handlebars helper to compare values
                    handlebars.registerHelper('eq', function (a, b) {
                        return a === b;
                    });

                    if (msgType === 'reload') {
                        // Escape any back slashes in the script logs
                        const regExpText = /(?!\\n)\\{1}/gm;
                        globals.logger.debug(
                            `[QSEOW] TEAMS SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`,
                        );
                        globals.logger.debug(
                            `[QSEOW] TEAMS SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`,
                        );

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    }

                    renderedText = compiledTemplate(templateContext);

                    globals.logger.debug(`[QSEOW] TEAMS SEND: Rendered message:\n${renderedText}`);

                    // Parse the JSON string to get rid of extra linebreaks etc.
                    msg = JSON.parse(renderedText);
                } else {
                    globals.logger.error(`[QSEOW] TEAMS SEND: Could not open Teams template file ${teamsConfig.templateFile}.`);
                }
            } catch (err) {
                globals.logger.error(`[QSEOW] TEAMS SEND: Error processing Teams template file: ${globals.getErrorMessage(err)}`);
            }
        }

        if (msg !== null) {
            const webhook = new Webhook(teamsWebhookUrl, msg);
            const res = await webhook.sendMessage();

            if (res !== undefined) {
                globals.logger.debug(
                    `[QSEOW] TEAMS SEND: Result from calling TeamsApi.TeamsSend: ${res.statusText} (${res.status}): ${res.data}`,
                );
            }
        }
    } catch (err) {
        // Enhanced error logging for Teams webhook failures
        let errorMsg = globals.getErrorMessage(err);

        // If error has response data (axios error), include it
        if (err.response) {
            errorMsg += ` | Response status: ${err.response.status}`;
            if (err.response.data) {
                errorMsg += ` | Response data: ${JSON.stringify(err.response.data)}`;
            }
        }

        // If we still have an object without good string representation, stringify it
        if (errorMsg === '[object Object]') {
            errorMsg = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
        }

        globals.logger.error(`[QSEOW] TEAMS SEND: ${errorMsg}`);
    }
}

/**
 * Sends a Teams notification for a failed reload task.
 * @param {Object} reloadParams - The parameters of the reload task.
 */
export function sendReloadTaskFailureNotificationTeams(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TEAMS RELOAD TASK FAILED: Rate limiting check passed for failed task notification. Task name: "${reloadParams.taskName}"`,
                );
                globals.logger.verbose(
                    `[QSEOW] TEAMS RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const teamsConfig = getTeamsReloadFailedNotificationConfigOk();
                if (teamsConfig === false) {
                    return 1;
                }

                // Get app owner
                const appOwner = await getAppOwner(reloadParams.appId);

                // Get script logs, if enabled in the config file
                const scriptLogData = reloadParams.scriptLog;

                // Handle case where scriptLog retrieval failed
                if (scriptLogData === null || scriptLogData === undefined) {
                    globals.logger.warn(
                        `[QSEOW] TEAMS RELOAD TASK FAILED: Script log data is not available. Teams notification will be sent without script log details.`,
                    );
                } else {
                    // Reduce script log lines to only the ones we want to send to Teams
                    scriptLogData.scriptLogHeadCount = globals.config.get('Butler.teamsNotification.reloadTaskFailure.headScriptLogLines');
                    scriptLogData.scriptLogTailCount = globals.config.get('Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines');

                    if (scriptLogData?.scriptLogFull?.length > 0) {
                        scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

                        scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                            .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                    }

                    globals.logger.debug(`[QSEOW] TEAMS RELOAD TASK FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);
                }
                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseUrls();

                // Construct URL to the failing app
                // Note that senseUrls.appBaseUrl may or may not end with a slash.
                // Handle both cases.
                let appUrl = '';
                if (senseUrls.appBaseUrl.endsWith('/')) {
                    appUrl = `${senseUrls.appBaseUrl}${reloadParams.appId}`;
                } else {
                    appUrl = `${senseUrls.appBaseUrl}/${reloadParams.appId}`;
                }

                // Get generic URLs from config file. Can be used as template fields.
                let genericUrls = globals.config.get('Butler.genericUrls');
                if (!genericUrls) {
                    // No URLs defined in the config file. Set to empty array
                    genericUrls = [];
                }

                // These are the template fields that can be used in Teams body
                const templateContext = {
                    hostName: reloadParams.hostName,
                    user: reloadParams.user,
                    taskName: reloadParams.taskName,
                    taskId: reloadParams.taskId,
                    taskCustomProperties: reloadParams.qs_taskCustomProperties,
                    taskTags: reloadParams.qs_taskTags,
                    taskIsManuallyTriggered: reloadParams.qs_taskMetadata.isManuallyTriggered,
                    taskIsPartialReload: reloadParams.qs_taskMetadata.isPartialReload,
                    taskMaxRetries: reloadParams.qs_taskMetadata.maxRetries,
                    taskModifiedByUsername: reloadParams.qs_taskMetadata.modifiedByUserName,
                    taskModifiedDate: reloadParams.qs_taskMetadata.modifiedDate,
                    taskSessionTimeout: reloadParams.qs_taskMetadata.taskSessionTimeout,
                    taskNextExecution:
                        reloadParams.qs_taskMetadata.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                            ? 'Never'
                            : reloadParams.qs_taskMetadata.operational.nextExecution,
                    appName: reloadParams.appName,
                    appId: reloadParams.appId,
                    appUrl,
                    appDescription: reloadParams.qs_appMetadata?.description,
                    appFileSize: reloadParams.qs_appMetadata?.fileSize,
                    appLastSuccessfulReload: reloadParams.qs_appMetadata?.lastReloadTime,
                    appLastModifiedDate: reloadParams.qs_appMetadata?.modifiedDate,
                    appLastModifiedByUserName: reloadParams.qs_appMetadata?.modifiedByUserName,
                    appPublishTime: reloadParams.qs_appMetadata?.publishTime,
                    appPublished: reloadParams.qs_appMetadata?.published,
                    appStreamName: reloadParams.qs_appMetadata?.stream,
                    appCustomProperties: reloadParams.qs_appCustomProperties,
                    appTags: reloadParams.qs_appTags,
                    logTimeStamp: reloadParams.logTimeStamp,
                    logLevel: reloadParams.logLevel,
                    logMessage: reloadParams.logMessage,
                    executingNodeName: scriptLogData.executingNodeName,
                    executionDuration: scriptLogData.executionDuration,
                    executionStartTime: scriptLogData.executionStartTime,
                    executionStopTime: scriptLogData.executionStopTime,
                    executionStatusNum: scriptLogData.executionStatusNum,
                    executionStatusText: scriptLogData.executionStatusText,
                    executionDetails: scriptLogData.executionDetails,
                    executionDetailsConcatenated: scriptLogData.executionDetailsConcatenated
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogSize: scriptLogData.scriptLogSize,
                    scriptLogHead: scriptLogData.scriptLogHead
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTail: scriptLogData.scriptLogTail
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
                    qlikSenseQMC: senseUrls.qmcUrl,
                    qlikSenseHub: senseUrls.hubUrl,
                    genericUrls,
                    appOwnerName: appOwner.userName,
                    appOwnerUserId: appOwner.userId,
                    appOwnerUserDirectory: appOwner.directory,
                    appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
                };

                // Check if script log is longer than max characters. Truncate if so.
                if (templateContext.scriptLogHead.length >= MSTEAMS_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] TEAMS: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Teams.`,
                    );
                    templateContext.scriptLogHead = templateContext.scriptLogHead
                        .replaceAll('&', '&amp;')
                        .replaceAll('=', '&#x3D;')
                        .replaceAll("'", '&#x27;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;')
                        .slice(0, 2900);

                    templateContext.scriptLogHead = templateContext.scriptLogHead
                        .replaceAll('&#x3D;', '=')
                        .replaceAll('&#x27;', "'")
                        .replaceAll('&lt;', '<')
                        .replaceAll('&gt;', '>')
                        .replaceAll('&quot;', '"')
                        .replaceAll('&amp;', '&');

                    templateContext.scriptLogHead += '\\n----Script log truncated by Butler----';
                }

                if (templateContext.scriptLogTail.length >= MSTEAMS_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] TEAMS: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Teams.`,
                    );
                    templateContext.scriptLogTail = templateContext.scriptLogTail
                        .replaceAll('&', '&amp;')
                        .replaceAll('=', '&#x3D;')
                        .replaceAll("'", '&#x27;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;')
                        .slice(-2900);

                    templateContext.scriptLogTail = templateContext.scriptLogTail
                        .replaceAll('&#x3D;', '=')
                        .replaceAll('&#x27;', "'")
                        .replaceAll('&lt;', '<')
                        .replaceAll('&gt;', '>')
                        .replaceAll('&quot;', '"')
                        .replaceAll('&amp;', '&');

                    templateContext.scriptLogTail = `----Script log truncated by Butler----\\n${templateContext.scriptLogTail}`;
                }

                const webhookUrl = globals.config.get('Butler.teamsNotification.reloadTaskFailure.webhookURL');
                await sendTeams(webhookUrl, teamsConfig, templateContext, 'reload');
            } catch (err) {
                // Enhanced error logging for Teams webhook failures
                let errorMsg = globals.getErrorMessage(err);

                // If error has response data (axios error), include it
                if (err.response) {
                    errorMsg += ` | Response status: ${err.response.status}`;
                    if (err.response.data) {
                        errorMsg += ` | Response data: ${JSON.stringify(err.response.data)}`;
                    }
                }

                // If we still have an object without good string representation, stringify it
                if (errorMsg === '[object Object]') {
                    errorMsg = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
                }

                globals.logger.error(`[QSEOW] TEAMS RELOAD TASK FAILED: ${errorMsg}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.warn(
                `[QSEOW] TEAMS RELOAD TASK FAILED: Rate limiting failed. Not sending reload notification Teams for task "${reloadParams.taskName}"`,
            );
            globals.logger.debug(`[QSEOW] TEAMS RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

/**
 * Sends a Teams notification for an aborted reload task.
 * @param {Object} reloadParams - The parameters of the reload task.
 */
export function sendReloadTaskAbortedNotificationTeams(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TEAMS RELOAD TASK ABORTED: Rate limiting check passed for aborted task notification. Task name: "${reloadParams.taskName}"`,
                );
                globals.logger.verbose(
                    `[QSEOW] TEAMS RELOAD TASK ABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const teamsConfig = getTeamsReloadAbortedNotificationConfigOk();
                if (teamsConfig === false) {
                    return 1;
                }

                // Get app owner
                const appOwner = await getAppOwner(reloadParams.appId);

                // Get script logs, if enabled in the config file
                const scriptLogData = reloadParams.scriptLog;

                // Handle case where scriptLog retrieval failed
                if (scriptLogData === null || scriptLogData === undefined) {
                    globals.logger.warn(
                        `[QSEOW] TEAMS RELOAD TASK ABORTED: Script log data is not available. Teams notification will be sent without script log details.`,
                    );
                } else {
                    // Reduce script log lines to only the ones we want to send to Teams
                    scriptLogData.scriptLogHeadCount = globals.config.get('Butler.teamsNotification.reloadTaskAborted.headScriptLogLines');
                    scriptLogData.scriptLogTailCount = globals.config.get('Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines');

                    if (scriptLogData?.scriptLogFull?.length > 0) {
                        scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');
                        scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                            .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                    }

                    globals.logger.debug(`[QSEOW] TEAMS RELOAD TASK ABORTED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);
                }
                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseUrls();

                // Construct URL to the failing app
                // Note that senseUrls.appBaseUrl may or may not end with a slash.
                // Handle both cases.
                let appUrl = '';
                if (senseUrls.appBaseUrl.endsWith('/')) {
                    appUrl = `${senseUrls.appBaseUrl}${reloadParams.appId}`;
                } else {
                    appUrl = `${senseUrls.appBaseUrl}/${reloadParams.appId}`;
                }

                // Get generic URLs from config file. Can be used as template fields.
                let genericUrls = globals.config.get('Butler.genericUrls');
                if (!genericUrls) {
                    // No URLs defined in the config file. Set to empty array
                    genericUrls = [];
                }

                // These are the template fields that can be used in Teams body
                const templateContext = {
                    hostName: reloadParams.hostName,
                    user: reloadParams.user,
                    taskName: reloadParams.taskName,
                    taskId: reloadParams.taskId,
                    taskCustomProperties: reloadParams.qs_taskCustomProperties,
                    taskTags: reloadParams.qs_taskTags,
                    taskIsManuallyTriggered: reloadParams.qs_taskMetadata.isManuallyTriggered,
                    taskIsPartialReload: reloadParams.qs_taskMetadata.isPartialReload,
                    taskMaxRetries: reloadParams.qs_taskMetadata.maxRetries,
                    taskModifiedByUsername: reloadParams.qs_taskMetadata.modifiedByUserName,
                    taskModifiedDate: reloadParams.qs_taskMetadata.modifiedDate,
                    taskSessionTimeout: reloadParams.qs_taskMetadata.taskSessionTimeout,
                    taskNextExecution:
                        reloadParams.qs_taskMetadata.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                            ? 'Never'
                            : reloadParams.qs_taskMetadata.operational.nextExecution,
                    appName: reloadParams.appName,
                    appId: reloadParams.appId,
                    appUrl,
                    appDescription: reloadParams.qs_appMetadata?.description,
                    appFileSize: reloadParams.qs_appMetadata?.fileSize,
                    appLastSuccessfulReload: reloadParams.qs_appMetadata?.lastReloadTime,
                    appLastModifiedDate: reloadParams.qs_appMetadata?.modifiedDate,
                    appLastModifiedByUserName: reloadParams.qs_appMetadata?.modifiedByUserName,
                    appPublishTime: reloadParams.qs_appMetadata?.publishTime,
                    appPublished: reloadParams.qs_appMetadata?.published,
                    appStreamName: reloadParams.qs_appMetadata?.stream,
                    appCustomProperties: reloadParams.qs_appCustomProperties,
                    appTags: reloadParams.qs_appTags,
                    logTimeStamp: reloadParams.logTimeStamp,
                    logLevel: reloadParams.logLevel,
                    logMessage: reloadParams.logMessage,
                    executingNodeName: scriptLogData.executingNodeName,
                    executionDuration: scriptLogData.executionDuration,
                    executionStartTime: scriptLogData.executionStartTime,
                    executionStopTime: scriptLogData.executionStopTime,
                    executionStatusNum: scriptLogData.executionStatusNum,
                    executionStatusText: scriptLogData.executionStatusText,
                    executionDetails: scriptLogData.executionDetails,
                    executionDetailsConcatenated: scriptLogData.executionDetailsConcatenated
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogSize: scriptLogData.scriptLogSize,
                    scriptLogSizeRows: scriptLogData.scriptLogSizeRows,
                    scriptLogSizeCharacters: scriptLogData.scriptLogSizeCharacters,
                    scriptLogHead: scriptLogData.scriptLogHead
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTail: scriptLogData.scriptLogTail
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
                    qlikSenseQMC: senseUrls.qmcUrl,
                    qlikSenseHub: senseUrls.hubUrl,
                    genericUrls,
                    appOwnerName: appOwner.userName,
                    appOwnerUserId: appOwner.userId,
                    appOwnerUserDirectory: appOwner.directory,
                    appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
                };

                // Check if script log is longer than max characters. Truncate if so.
                if (templateContext.scriptLogHead.length >= MSTEAMS_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] TEAMS: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Teams.`,
                    );
                    templateContext.scriptLogHead = templateContext.scriptLogHead
                        .replaceAll('&', '&amp;')
                        .replaceAll('=', '&#x3D;')
                        .replaceAll("'", '&#x27;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;')
                        .slice(0, 2900);

                    templateContext.scriptLogHead = templateContext.scriptLogHead
                        .replaceAll('&#x3D;', '=')
                        .replaceAll('&#x27;', "'")
                        .replaceAll('&lt;', '<')
                        .replaceAll('&gt;', '>')
                        .replaceAll('&quot;', '"')
                        .replaceAll('&amp;', '&');

                    templateContext.scriptLogHead += '\\n----Script log truncated by Butler----';
                }

                if (templateContext.scriptLogTail.length >= MSTEAMS_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] TEAMS: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Teams.`,
                    );
                    templateContext.scriptLogTail = templateContext.scriptLogTail
                        .replaceAll('&', '&amp;')
                        .replaceAll('=', '&#x3D;')
                        .replaceAll("'", '&#x27;')
                        .replaceAll('<', '&lt;')
                        .replaceAll('>', '&gt;')
                        .replaceAll('"', '&quot;')
                        .slice(-2900);

                    templateContext.scriptLogTail = templateContext.scriptLogTail
                        .replaceAll('&#x3D;', '=')
                        .replaceAll('&#x27;', "'")
                        .replaceAll('&lt;', '<')
                        .replaceAll('&gt;', '>')
                        .replaceAll('&quot;', '"')
                        .replaceAll('&amp;', '&');

                    templateContext.scriptLogTail = `----Script log truncated by Butler----\\n${templateContext.scriptLogTail}`;
                }

                const webhookUrl = globals.config.get('Butler.teamsNotification.reloadTaskAborted.webhookURL');
                await sendTeams(webhookUrl, teamsConfig, templateContext, 'reload');
            } catch (err) {
                // Enhanced error logging for Teams webhook failures
                let errorMsg = globals.getErrorMessage(err);

                // If error has response data (axios error), include it
                if (err.response) {
                    errorMsg += ` | Response status: ${err.response.status}`;
                    if (err.response.data) {
                        errorMsg += ` | Response data: ${JSON.stringify(err.response.data)}`;
                    }
                }

                // If we still have an object without good string representation, stringify it
                if (errorMsg === '[object Object]') {
                    errorMsg = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
                }

                globals.logger.error(`[QSEOW] TEAMS RELOAD TASK ABORTED: ${errorMsg}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `[QSEOW] TEAMS RELOAD TASK ABORTED: Rate limiting failed. Not sending reload notification Teams for task "${reloadParams.taskName}"`,
            );
            globals.logger.verbose(`[QSEOW] TEAMS RELOAD TASK ABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

/**
 * Sends a Teams notification for a service monitor event.
 * @param {Object} serviceParams - The parameters of the service monitor event.
 */
export function sendServiceMonitorNotificationTeams(serviceParams) {
    rateLimiterMemoryServiceMonitor
        .consume(`${serviceParams.host}|${serviceParams.serviceName}`, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TEAMS SERVICE MONITOR: Rate limiting check passed for service monitor notification. Host: "${serviceParams.host}", service: "${serviceParams.serviceName}"`,
                );
                globals.logger.verbose(`[QSEOW] TEAMS SERVICE MONITOR: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const teamsConfig = getTeamsServiceMonitorNotificationConfig(serviceParams.serviceStatus);
                if (teamsConfig === false) {
                    return 1;
                }

                // Get generic URLs from config file. Can be used as template fields.
                let genericUrls = globals.config.get('Butler.genericUrls');
                if (!genericUrls) {
                    // No URLs defined in the config file. Set to empty array
                    genericUrls = [];
                }

                // These are the template fields that can be used in Teams body
                const templateContext = {
                    host: serviceParams.host,
                    serviceStatus: serviceParams.serviceStatus,
                    servicePrevStatus: serviceParams.prevState,
                    serviceName: serviceParams.serviceName,
                    serviceDisplayName: serviceParams.serviceDetails.displayName,
                    serviceFriendlyName: serviceParams.serviceFriendlyName,
                    serviceStartType: serviceParams.serviceDetails.startType,
                    serviceExePath: serviceParams.serviceDetails.exePath,
                    genericUrls,
                };

                if (serviceParams.serviceStatus === 'STOPPED') {
                    const webhookUrl = globals.config.get('Butler.teamsNotification.serviceStopped.webhookURL');
                    await sendTeams(webhookUrl, teamsConfig, templateContext, 'serviceStopped');
                } else if (serviceParams.serviceStatus === 'RUNNING') {
                    const webhookUrl = globals.config.get('Butler.teamsNotification.serviceStarted.webhookURL');
                    await sendTeams(webhookUrl, teamsConfig, templateContext, 'serviceStarted');
                }
            } catch (err) {
                // Enhanced error logging for Teams webhook failures
                let errorMsg = globals.getErrorMessage(err);

                // If error has response data (axios error), include it
                if (err.response) {
                    errorMsg += ` | Response status: ${err.response.status}`;
                    if (err.response.data) {
                        errorMsg += ` | Response data: ${JSON.stringify(err.response.data)}`;
                    }
                }

                // If we still have an object without good string representation, stringify it
                if (errorMsg === '[object Object]') {
                    errorMsg = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
                }

                globals.logger.error(`[QSEOW] TEAMS SERVICE MONITOR: ${errorMsg}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `[QSEOW] TEAMS SERVICE MONITOR: Rate limiting failed. Not sending service monitor notification for service "${serviceParams.serviceName}" on host "${serviceParams.host}"`,
            );
            globals.logger.verbose(`[QSEOW] TEAMS SERVICE MONITOR: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}
