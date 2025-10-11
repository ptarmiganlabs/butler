import fs from 'fs';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import { SLACK_TEXT_FIELD_MAX_LENGTH } from '../../constants.js';
import slackSend from '../slack_api.js';
import getAppOwner from '../../qrs_util/get_app_owner.js';
import { getQlikSenseUrls } from './get_qs_urls.js';

let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;
let rateLimiterMemoryServiceMonitor;

if (globals.config.has('Butler.slackNotification.reloadTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.slackNotification.reloadTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.slackNotification.reloadTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.slackNotification.reloadTaskAborted.rateLimit'),
    });
} else {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.slackNotification.serviceStopped.rateLimit')) {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.slackNotification.serviceStopped.rateLimit'),
    });
} else {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

/**
 * Checks if Slack reload failed notification configuration is valid.
 * @returns {object|boolean} Configuration object if valid, false otherwise.
 */
function getSlackReloadFailedNotificationConfigOk() {
    try {
        // First make sure Slack sending is enabled in the config file and that we have needed parameters
        if (!globals.config.get('Butler.slackNotification.reloadTaskFailure.enable')) {
            // Slack task falure notifications are disabled
            globals.logger.error(
                '[QSEOW] SLACK RELOAD TASK FAILED: Reload failure Slack notifications are disabled in config file - will not send Slack message',
            );
            return false;
        }

        if (
            globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') !== 'basic' &&
            globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') !== 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `[QSEOW] SLACK RELOAD TASK FAILED: Invalid Slack message type: ${globals.config.get(
                    'Butler.slackNotification.reloadTaskFailure.messageType',
                )}`,
            );
            return false;
        }

        if (globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskFailure.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] SLACK RELOAD TASK FAILED: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') === 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskFailure.templateFile')) {
                globals.logger.error('[QSEOW] SLACK RELOAD TASK FAILED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.slackNotification.reloadTaskFailure.webhookURL'),
            messageType: globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType'),
            templateFile: globals.config.get('Butler.slackNotification.reloadTaskFailure.templateFile'),

            headScriptLogLines: globals.config.has('Butler.slackNotification.reloadTaskFailure.headScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.headScriptLogLines')
                : 15,
            tailScriptLogLines: globals.config.has('Butler.slackNotification.reloadTaskFailure.tailScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.tailScriptLogLines')
                : 15,
            fromUser: globals.config.has('Butler.slackNotification.reloadTaskFailure.fromUser')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.fromUser')
                : '',
            iconEmoji: globals.config.has('Butler.slackNotification.reloadTaskFailure.iconEmoji')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.iconEmoji')
                : '',
            rateLimit: globals.config.has('Butler.slackNotification.reloadTaskFailure.rateLimit')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has('Butler.slackNotification.reloadTaskFailure.basicMsgTemplate')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.basicMsgTemplate')
                : '',
            channel: globals.config.has('Butler.slackNotification.reloadTaskFailure.channel')
                ? globals.config.get('Butler.slackNotification.reloadTaskFailure.channel')
                : '',
        };
    } catch (err) {
        globals.logger.error(`[QSEOW] SLACK RELOAD TASK FAILED: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if Slack reload aborted notification configuration is valid.
 * @returns {object|boolean} Configuration object if valid, false otherwise.
 */
function getSlackReloadAbortedNotificationConfigOk() {
    try {
        if (!globals.config.get('Butler.slackNotification.reloadTaskAborted.enable')) {
            // Slack task aborted notifications are disabled
            globals.logger.error(
                '[QSEOW] SLACK RELOAD TASK ABORTED: Reload aborted Slack notifications are disabled in config file - will not send Slack message',
            );
            return false;
        }

        if (
            globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') !== 'basic' &&
            globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') !== 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `[QSEOW] SLACK RELOAD TASK ABORTED: Invalid Slack message type: ${globals.config.get(
                    'Butler.slackNotification.reloadTaskAborted.messageType',
                )}`,
            );
            return false;
        }

        if (globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskAborted.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] SLACK RELOAD TASK ABORTED: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') === 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskAborted.templateFile')) {
                globals.logger.error('[QSEOW] SLACK RELOAD TASK ABORTED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.slackNotification.reloadTaskAborted.webhookURL'),
            messageType: globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType'),
            templateFile: globals.config.get('Butler.slackNotification.reloadTaskAborted.templateFile'),

            headScriptLogLines: globals.config.has('Butler.slackNotification.reloadTaskAborted.headScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.headScriptLogLines')
                : 15,
            tailScriptLogLines: globals.config.has('Butler.slackNotification.reloadTaskAborted.tailScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.tailScriptLogLines')
                : 15,
            fromUser: globals.config.has('Butler.slackNotification.reloadTaskAborted.fromUser')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.fromUser')
                : '',
            iconEmoji: globals.config.has('Butler.slackNotification.reloadTaskAborted.iconEmoji')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.iconEmoji')
                : '',
            rateLimit: globals.config.has('Butler.slackNotification.reloadTaskAborted.rateLimit')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has('Butler.slackNotification.reloadTaskAborted.basicMsgTemplate')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.basicMsgTemplate')
                : '',
            channel: globals.config.has('Butler.slackNotification.reloadTaskAborted.channel')
                ? globals.config.get('Butler.slackNotification.reloadTaskAborted.channel')
                : '',
        };
    } catch (err) {
        globals.logger.error(`[QSEOW] SLACK RELOAD TASK ABORTED: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if Slack service monitor notification configuration is valid.
 * @param {string} serviceStatus - Status of the service.
 * @returns {object|boolean} Configuration object if valid, false otherwise.
 */
function getSlackServiceMonitorNotificationConfig(serviceStatus) {
    try {
        if (!globals.config.get('Butler.serviceMonitor.alertDestination.slack.enable')) {
            // Slack notifications are disabled
            globals.logger.error(
                '[QSEOW] SLACK SERVICE MONITOR: SLACK SERVICE MONITOR notifications are disabled in config file - will not send Slack message',
            );
            return false;
        }

        if (
            globals.config.get('Butler.slackNotification.serviceStopped.messageType') !== 'basic' &&
            globals.config.get('Butler.slackNotification.serviceStopped.messageType') !== 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `[QSEOW] SLACK SERVICE MONITOR: Invalid Slack message type: ${globals.config.get(
                    'Butler.slackNotification.serviceStopped.messageType',
                )}`,
            );
            return false;
        }

        if (
            globals.config.get('Butler.slackNotification.serviceStarted.messageType') !== 'basic' &&
            globals.config.get('Butler.slackNotification.serviceStarted.messageType') !== 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `[QSEOW] SLACK SERVICE MONITOR: Invalid Slack message type: ${globals.config.get(
                    'Butler.slackNotification.serviceStarted.messageType',
                )}`,
            );
            return false;
        }

        if (globals.config.get('Butler.slackNotification.serviceStopped.messageType') === 'basic') {
            // Basic formatting. Make sure required parameters are present
            if (!globals.config.has('Butler.slackNotification.serviceStopped.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] SLACK SERVICE MONITOR: No service stopped basic message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.serviceStopped.messageType') === 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.serviceStopped.templateFile')) {
                globals.logger.error('[QSEOW] SLACK SERVICE MONITOR: Service stopped message template file not specified in config file.');
                return false;
            }
        }

        if (globals.config.get('Butler.slackNotification.serviceStarted.messageType') === 'basic') {
            // Basic formatting. Make sure required parameters are present
            if (!globals.config.has('Butler.slackNotification.serviceStarted.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('[QSEOW] SLACK SERVICE MONITOR: No service started basic message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.serviceStarted.messageType') === 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.serviceStarted.templateFile')) {
                globals.logger.error('[QSEOW] SLACK SERVICE MONITOR: Service started message template file not specified in config file.');
                return false;
            }
        }

        let result = {};

        if (serviceStatus === 'RUNNING') {
            result = {
                webhookUrl: globals.config.get('Butler.slackNotification.serviceStarted.webhookURL'),
                messageType: globals.config.get('Butler.slackNotification.serviceStarted.messageType'),
                templateFile: globals.config.get('Butler.slackNotification.serviceStarted.templateFile'),

                fromUser: globals.config.has('Butler.slackNotification.serviceStarted.fromUser')
                    ? globals.config.get('Butler.slackNotification.serviceStarted.fromUser')
                    : '',
                iconEmoji: globals.config.has('Butler.slackNotification.serviceStarted.iconEmoji')
                    ? globals.config.get('Butler.slackNotification.serviceStarted.iconEmoji')
                    : '',
                rateLimit: globals.config.has('Butler.slackNotification.serviceStarted.rateLimit')
                    ? globals.config.get('Butler.slackNotification.serviceStarted.rateLimit')
                    : '',
                basicMsgTemplate: globals.config.has('Butler.slackNotification.serviceStarted.basicMsgTemplate')
                    ? globals.config.get('Butler.slackNotification.serviceStarted.basicMsgTemplate')
                    : '',
                channel: globals.config.has('Butler.slackNotification.serviceStarted.channel')
                    ? globals.config.get('Butler.slackNotification.serviceStarted.channel')
                    : '',
            };
        }

        if (serviceStatus === 'STOPPED') {
            result = {
                webhookUrl: globals.config.get('Butler.slackNotification.serviceStopped.webhookURL'),
                messageType: globals.config.get('Butler.slackNotification.serviceStopped.messageType'),
                templateFile: globals.config.get('Butler.slackNotification.serviceStopped.templateFile'),

                fromUser: globals.config.has('Butler.slackNotification.serviceStopped.fromUser')
                    ? globals.config.get('Butler.slackNotification.serviceStopped.fromUser')
                    : '',
                iconEmoji: globals.config.has('Butler.slackNotification.serviceStopped.iconEmoji')
                    ? globals.config.get('Butler.slackNotification.serviceStopped.iconEmoji')
                    : '',
                rateLimit: globals.config.has('Butler.slackNotification.serviceStopped.rateLimit')
                    ? globals.config.get('Butler.slackNotification.serviceStopped.rateLimit')
                    : '',
                basicMsgTemplate: globals.config.has('Butler.slackNotification.serviceStopped.basicMsgTemplate')
                    ? globals.config.get('Butler.slackNotification.serviceStopped.basicMsgTemplate')
                    : '',
                channel: globals.config.has('Butler.slackNotification.serviceStopped.channel')
                    ? globals.config.get('Butler.slackNotification.serviceStopped.channel')
                    : '',
            };
        }

        return result;
    } catch (err) {
        globals.logger.error(`[QSEOW] SLACK SERVICE MONITOR: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Sends a Slack message using the specified configuration and template context.
 * @param {object} slackConfig - Slack configuration.
 * @param {object} templateContext - Context for the Handlebars template.
 * @param {string} msgType - Type of the message.
 * @returns {Promise<void>}
 */
async function sendSlack(slackConfig, templateContext, msgType) {
    try {
        let compiledTemplate;
        let renderedText = null;
        let slackMsg = null;
        const msg = slackConfig;

        if (slackConfig.messageType === 'basic') {
            // Compile template
            compiledTemplate = handlebars.compile(slackConfig.basicMsgTemplate);
            renderedText = compiledTemplate(templateContext);

            slackMsg = {
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: renderedText,
                        },
                    },
                    {
                        type: 'divider',
                    },
                    {
                        type: 'actions',
                        elements: [
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    emoji: true,
                                    text: 'Open QMC',
                                },
                                style: 'primary',
                                url: templateContext.qlikSenseQMC,
                            },
                            {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    emoji: true,
                                    text: 'Open Hub',
                                },
                                style: 'primary',
                                url: templateContext.qlikSenseHub,
                            },
                        ],
                    },
                ],
            };
        } else if (slackConfig.messageType === 'formatted') {
            try {
                if (fs.existsSync(slackConfig.templateFile) === true) {
                    // Read template file
                    const template = fs.readFileSync(slackConfig.templateFile, 'utf8');

                    // Compile template
                    compiledTemplate = handlebars.compile(template);

                    // Register handlebars helper to compare values
                    handlebars.registerHelper('eq', function (a, b) {
                        return a === b;
                    });

                    // Render Slack message using template. Do not convert to &lt; and &gt; as Slack will not render the message correctly
                    slackMsg = compiledTemplate(templateContext);

                    globals.logger.debug(`[QSEOW] SLACK SEND: Rendered message:\n${slackMsg}`);
                } else {
                    globals.logger.error(`[QSEOW] SLACK SEND: Could not open Slack template file ${slackConfig.templateFile}.`);
                }
            } catch (err) {
                globals.logger.error(`[QSEOW] SLACK SEND: Error processing Slack template file: ${globals.getErrorMessage(err)}`);
            }
        }

        if (slackMsg !== null) {
            msg.text = slackMsg;
            const res = await slackSend(msg, globals.logger);
            if (res !== undefined) {
                globals.logger.debug(`[QSEOW] SLACK SEND: Result from calling slackSend: ${res.statusText} (${res.status}): ${res.data}`);
            }
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] SLACK SEND: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends a reload task failure notification to Slack.
 * @param {object} reloadParams - Parameters for the reload task.
 * @returns {void}
 */
export function sendReloadTaskFailureNotificationSlack(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] SLACK RELOAD TASK FAILED: Rate limiting check passed for failed task notification. Task name: "${reloadParams.taskName}"`,
                );
                globals.logger.verbose(
                    `[QSEOW] SLACK RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const slackConfig = getSlackReloadFailedNotificationConfigOk();
                if (slackConfig === false) {
                    return 1;
                }

                // Get app owner
                const appOwner = await getAppOwner(reloadParams.appId);

                // Get script logs, if enabled in the config file
                const scriptLogData = reloadParams.scriptLog;

                // Handle case where scriptLog retrieval failed
                if (scriptLogData === null || scriptLogData === undefined) {
                    globals.logger.warn(
                        `[QSEOW] SLACK RELOAD TASK FAILED: Script log data is not available. Slack notification will be sent without script log details.`,
                    );
                } else {
                    // Reduce script log lines to only the ones we want to send to Slack
                    scriptLogData.scriptLogHeadCount = globals.config.get('Butler.slackNotification.reloadTaskFailure.headScriptLogLines');
                    scriptLogData.scriptLogTailCount = globals.config.get('Butler.slackNotification.reloadTaskFailure.tailScriptLogLines');

                    if (scriptLogData?.scriptLogFull?.length > 0) {
                        scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

                        scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                            .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                    }

                    globals.logger.debug(`[QSEOW] SLACK RELOAD TASK FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);
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

                // These are the template fields that can be used in Slack body
                // Regular expression for converting escapöing single quote

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

                // Properly escape strings for JSON embedding using JSON.stringify
                // This ensures all special characters are correctly escaped for JSON
                const escapeForJson = (str) => {
                    // Use JSON.stringify to handle all escaping, then remove outer quotes
                    return JSON.stringify(str).slice(1, -1);
                };

                templateContext.scriptLogHead = escapeForJson(templateContext.scriptLogHead);
                templateContext.scriptLogTail = escapeForJson(templateContext.scriptLogTail);
                templateContext.executionDetailsConcatenated = escapeForJson(templateContext.executionDetailsConcatenated);

                // Check if script log is longer than max characters for text fields sent to Slack API
                // https://api.slack.com/reference/block-kit/blocks#section_fields
                if (templateContext.scriptLogHead.length >= SLACK_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] SLACK: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Slack.`,
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

                if (templateContext.scriptLogTail.length >= SLACK_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] SLACK: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Slack.`,
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

                await sendSlack(slackConfig, templateContext, 'reload');
            } catch (err) {
                globals.logger.error(`[QSEOW] SLACK RELOAD TASK FAILED: ${globals.getErrorMessage(err)}`);
            }
            return true;
        })
        .catch((err) => {
            globals.logger.warn(
                `[QSEOW] SLACK RELOAD TASK FAILED: Rate limiting failed. Not sending reload notification Slack for task "${reloadParams.taskName}"`,
            );
            globals.logger.debug(`[QSEOW] SLACK RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
        });
}

/**
 * Sends a reload task aborted notification to Slack.
 * @param {object} reloadParams - Parameters for the reload task.
 * @returns {void}
 */
export function sendReloadTaskAbortedNotificationSlack(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] SLACK RELOAD TASK ABORTED: Rate limiting check passed for aborted task notification. Task name: "${reloadParams.taskName}"`,
                );
                globals.logger.verbose(
                    `[QSEOW] SLACK RELOAD TASK ABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const slackConfig = getSlackReloadAbortedNotificationConfigOk();
                if (slackConfig === false) {
                    return 1;
                }

                // Get app owner
                const appOwner = await getAppOwner(reloadParams.appId);

                // Get script logs, if enabled in the config file
                const scriptLogData = reloadParams.scriptLog;

                // Handle case where scriptLog retrieval failed
                if (scriptLogData === null || scriptLogData === undefined) {
                    globals.logger.warn(
                        `[QSEOW] SLACK RELOAD TASK ABORTED: Script log data is not available. Slack notification will be sent without script log details.`,
                    );
                } else {
                    // Reduce script log lines to only the ones we want to send to Slack
                    scriptLogData.scriptLogHeadCount = globals.config.get('Butler.slackNotification.reloadTaskAborted.headScriptLogLines');
                    scriptLogData.scriptLogTailCount = globals.config.get('Butler.slackNotification.reloadTaskAborted.tailScriptLogLines');

                    if (scriptLogData?.scriptLogFull?.length > 0) {
                        scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

                        scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                            .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                    }

                    globals.logger.debug(`[QSEOW] SLACK RELOAD TASK ABORTED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);
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

                // These are the template fields that can be used in Slack body
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

                // Check if script log is longer than max characters for text fields sent to Slack API
                // https://api.slack.com/reference/block-kit/blocks#section_fields
                if (templateContext.scriptLogHead.length >= SLACK_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] SLACK: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Slack.`,
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

                if (templateContext.scriptLogTail.length >= SLACK_TEXT_FIELD_MAX_LENGTH) {
                    globals.logger.warn(
                        `[QSEOW] SLACK: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Slack.`,
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

                await sendSlack(slackConfig, templateContext, 'reload');
            } catch (err) {
                globals.logger.error(`[QSEOW] SLACK RELOAD TASK ABORTED: ${globals.getErrorMessage(err)}`);
            }
            return true;
        })
        .catch((err) => {
            globals.logger.verbose(
                `[QSEOW] SLACK RELOAD TASK ABORTED: Rate limiting failed. Not sending reload notification Slack for task "${reloadParams.taskName}"`,
            );
            globals.logger.verbose(`[QSEOW] SLACK RELOAD TASK ABORTED: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
        });
}

/**
 * Sends a service monitor notification to Slack.
 * @param {object} serviceParams - Parameters for the service.
 * @returns {void}
 */
export function sendServiceMonitorNotificationSlack(serviceParams) {
    rateLimiterMemoryServiceMonitor
        .consume(`${serviceParams.host}|${serviceParams.serviceName}`, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] SLACK SERVICE MONITOR: Rate limiting check passed for service monitor notification. Host: "${serviceParams.host}", service: "${serviceParams.serviceName}"`,
                );
                globals.logger.verbose(`[QSEOW] SLACK SERVICE MONITOR: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const slackConfig = getSlackServiceMonitorNotificationConfig(serviceParams.serviceStatus);
                if (slackConfig === false) {
                    return 1;
                }

                // Get generic URLs from config file. Can be used as template fields.
                let genericUrls = globals.config.get('Butler.genericUrls');
                if (!genericUrls) {
                    // No URLs defined in the config file. Set to empty array
                    genericUrls = [];
                }

                // These are the template fields that can be used in Slack body
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
                    await sendSlack(slackConfig, templateContext, 'serviceStopped');
                } else if (serviceParams.serviceStatus === 'RUNNING') {
                    await sendSlack(slackConfig, templateContext, 'serviceStarted');
                }
            } catch (err) {
                globals.logger.error(`[QSEOW] SLACK SERVICE MONITOR: ${globals.getErrorMessage(err)}`);
            }
            return true;
        })
        .catch((err) => {
            globals.logger.warn(
                `[QSEOW] SLACK SERVICE MONITOR: Rate limiting failed. Not sending service monitor notification for service "${serviceParams.serviceName}" on host "${serviceParams.host}"`,
            );
            globals.logger.debug(`[QSEOW] SLACK SERVICE MONITOR: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
        });
}
