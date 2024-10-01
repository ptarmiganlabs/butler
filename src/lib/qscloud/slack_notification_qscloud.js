import fs from 'fs';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import slackSend from '../slack_api.js';
import { getQlikSenseCloudUserInfo } from './api/user.js';
import { getQlikSenseCloudAppInfo } from './api/app.js';
import { getQlikSenseCloudUrls } from './util.js';

let rateLimiterMemoryFailedReloads;

if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

function getAppReloadFailedSlackConfig() {
    try {
        if (!globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable')) {
            // Slack task falure notifications are disabled
            globals.logger.error(
                "SLACK ALERT - QS CLOUD APP RELOAD FAILED: Reload failure Slack notifications are disabled in config file - won't send Slack message",
            );
            return false;
        }

        if (
            globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType') !==
                'basic' &&
            globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType') !==
                'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `SLACK ALERT - QS CLOUD APP RELOAD FAILED: Invalid Slack message type: ${globals.config.get(
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType',
                )}`,
            );
            return false;
        }

        if (
            globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType') === 'basic'
        ) {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('SLACK ALERT - QS CLOUD APP RELOAD FAILED: No message text in config file.');
                return false;
            }
        } else if (
            globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType') ===
            'formatted'
        ) {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.templateFile')) {
                globals.logger.error('SLACK ALERT - QS CLOUD APP RELOAD FAILED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.webhookURL'),
            messageType: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType'),
            templateFile: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.templateFile',
            ),

            headScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.headScriptLogLines',
            ),
            tailScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.tailScriptLogLines',
            ),
            fromUser: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.fromUser'),
            iconEmoji: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.iconEmoji'),
            rateLimit: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.rateLimit'),
            basicMsgTemplate: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicMsgTemplate',
            ),
            channel: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.channel'),
        };
    } catch (err) {
        globals.logger.error(`SLACK ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
        return false;
    }
}

async function sendSlack(slackConfig, templateContext, msgType) {
    try {
        let compiledTemplate;
        let renderedText = null;
        let slackMsg = null;
        const msg = slackConfig;

        if (slackConfig.messageType === 'basic') {
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

                    // Compile the template
                    compiledTemplate = handlebars.compile(template);

                    if (msgType === 'reload') {
                        // Escape any back slashes in the script logs
                        const regExpText = /(?!\\n)\\{1}/gm;
                        globals.logger.debug(`SLACK SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`);
                        globals.logger.debug(`SLACK SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`);

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    } else if (msgType === 'qscloud-app-reload') {
                        // Escape any back slashes in the script logs
                        const regExpText = /(?!\\n)\\{1}/gm;
                        globals.logger.debug(`SLACK SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`);
                        globals.logger.debug(`SLACK SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`);

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    }

                    slackMsg = compiledTemplate(templateContext);

                    globals.logger.debug(`SLACK SEND: Rendered message:\n${slackMsg}`);
                } else {
                    globals.logger.error(`SLACK SEND: Could not open Slack template file ${slackConfig.templateFile}.`);
                }
            } catch (err) {
                globals.logger.error(`SLACK SEND: Error processing Slack template file: ${err}`);
            }
        }

        if (slackMsg !== null) {
            slackConfig.text = slackMsg;
            const res = await slackSend(slackConfig, globals.logger);

            if (res !== undefined) {
                globals.logger.debug(`SLACK SEND: Result from calling SlackApi.SlackSend: ${res.statusText} (${res.status}): ${res.data}`);
            }
        }
    } catch (err) {
        globals.logger.error(`SLACK SEND: ${err}`);
    }
}

// Function to send Qlik Sense Cloud app reload failed alert
export function sendQlikSenseCloudAppReloadFailureNotificationSlack(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.reloadId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `SLACK ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting check passed for failed task notification. App name: "${reloadParams.appName}"`,
                );
                globals.logger.verbose(
                    `SLACK ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const slackConfig = getAppReloadFailedSlackConfig();
                if (slackConfig === false) {
                    return 1;
                }

                // Get app owner info
                const appOwner = await getQlikSenseCloudUserInfo(reloadParams.ownerId);

                // Get script logs, if enabled in the config file
                // If the value is false, the script log could not be obtained
                let scriptLogData = {};

                if (reloadParams.scriptLog === false) {
                    scriptLogData = {
                        scriptLogFull: [],
                        scriptLogSize: 0,
                        scriptLogHead: '',
                        scriptLogHeadCount: 0,
                        scriptLogTail: '',
                        scriptLogTailCount: 0,
                    };
                } else {
                    // Reduce script log lines to only the ones we want to send to Slack
                    scriptLogData.scriptLogHeadCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.headScriptLogLines',
                    );
                    scriptLogData.scriptLogTailCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.tailScriptLogLines',
                    );

                    if (reloadParams.scriptLog?.scriptLogFull?.length > 0) {
                        // Get length of script log (character count)
                        scriptLogData.scriptLogSize = reloadParams.scriptLog.scriptLogFull.length;

                        // Get the first and last n lines of the script log
                        scriptLogData.scriptLogHead = reloadParams.scriptLog.scriptLogFull
                            .slice(0, reloadParams.scriptLog.scriptLogHeadCount)
                            .join('\r\n');

                        scriptLogData.scriptLogTail = reloadParams.scriptLog.scriptLogFull
                            .slice(Math.max(reloadParams.scriptLog.scriptLogFull.length - reloadParams.scriptLog.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                        scriptLogData.scriptLogSize = 0;
                    }

                    globals.logger.debug(
                        `SLACK ALERT - QS CLOUD APP RELOAD FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`,
                    );
                }

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseCloudUrls();

                // These are the template fields that can be used in Slack body
                const templateContext = {
                    tenantId: reloadParams.tenantId,
                    tenantComment: reloadParams.tenantComment,
                    tenantUrl: reloadParams.tenantUrl,

                    userId: reloadParams.userId,
                    userName: appOwner === undefined ? 'Unknown' : appOwner.name,

                    appId: reloadParams.appId,
                    appName: reloadParams.appName,
                    appDescription: reloadParams.appInfo.attributes.description,
                    appUrl: reloadParams.appUrl,
                    appHasSectionAccess: reloadParams.appInfo.attributes.hasSectionAccess,
                    appIsPublished: reloadParams.appInfo.attributes.published,
                    appPublishTime: reloadParams.appInfo.attributes.publishTime,
                    appThumbnail: reloadParams.appInfo.attributes.thumbnail,

                    reloadTrigger: reloadParams.reloadTrigger,
                    source: reloadParams.source,
                    eventType: reloadParams.eventType,
                    eventTypeVersion: reloadParams.eventTypeVersion,
                    endedWithMemoryConstraint: reloadParams.endedWithMemoryConstraint,
                    isDirectQueryMode: reloadParams.isDirectQueryMode,
                    isPartialReload: reloadParams.isPartialReload,
                    isSessionApp: reloadParams.isSessionApp,
                    isSkipStore: reloadParams.isSkipStore,

                    peakMemoryBytes: reloadParams.peakMemoryBytes.toLocaleString(),
                    reloadId: reloadParams.reloadId,
                    rowLimit: reloadParams.rowLimit.toLocaleString(),
                    statements: reloadParams.statements,
                    status: reloadParams.status,
                    usageDuration: reloadParams.duration,
                    sizeMemoryBytes: reloadParams.sizeMemory.toLocaleString(),
                    appFileSize: reloadParams.appItems.resourceSize.appFile.toLocaleString(),

                    errorCode: reloadParams.reloadInfo.errorCode,
                    errorMessage: reloadParams.reloadInfo.errorMessage,
                    logMessage: reloadParams.reloadInfo.log
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    executionDuration: reloadParams.reloadInfo.executionDuration,
                    executionStartTime: reloadParams.reloadInfo.executionStartTime,
                    executionStopTime: reloadParams.reloadInfo.executionStopTime,
                    executionStatusText: reloadParams.reloadInfo.status,
                    scriptLogSize: scriptLogData.scriptLogSize.toLocaleString(),
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

                    appOwnerName: appOwner.name,
                    appOwnerUserId: appOwner.id,
                    appOwnerPicture: appOwner.picture,
                    appOwnerEmail: appOwner.email,
                };

                // Replace all single and double quotes in scriptLogHead and scriptLogTail with escaped dittos
                // This is needed to avoid breaking the Slack message JSON
                const regExpSingle = /'/gm;
                const regExpDouble = /"/gm;
                templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpSingle, "'").replace(regExpDouble, "\\'");
                templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpSingle, "'").replace(regExpDouble, "\\'");

                // Replace all single and double quotes in logMessage with escaped ditto
                // This is needed to avoid breaking the Slack message JSON
                templateContext.logMessage = templateContext.logMessage.replace(regExpSingle, "\\'").replace(regExpDouble, "\\'");

                // Check if script log is longer than 3000 characters. Truncate if so.
                if (templateContext.scriptLogHead.length >= 3000) {
                    globals.logger.warn(
                        `SLACK: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Slack.`,
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

                if (templateContext.scriptLogTail.length >= 3000) {
                    globals.logger.warn(
                        `SLACK: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Slack.`,
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

                sendSlack(slackConfig, templateContext, 'qscloud-app-reload');
            } catch (err) {
                globals.logger.error(`SLACK ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.warn(
                `SLACK ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting failed. Not sending reload notification Slack for app [${reloadParams.appId}] "${reloadParams.appName}"`,
            );
            globals.logger.debug(
                `SLACK ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
            );
        });
}