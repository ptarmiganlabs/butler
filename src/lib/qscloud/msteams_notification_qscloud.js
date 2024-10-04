/* eslint-disable import/prefer-default-export */
import fs from 'fs';

import { Webhook, SimpleTextCard } from 'ms-teams-wrapper';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import { getQlikSenseCloudUserInfo } from './api/user.js';
import { getQlikSenseCloudAppInfo } from './api/app.js';
import { getQlikSenseCloudUrls } from './util.js';

let rateLimiterMemoryFailedReloads;

if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

function getAppReloadFailedTeamsConfig() {
    try {
        if (!globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable')) {
            // Teams task falure notifications are disabled
            globals.logger.error(
                "TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Reload failure Teams notifications are disabled in config file - won't send Teams message",
            );
            return false;
        }

        if (
            globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') !==
                'basic' &&
            globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') !==
                'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Invalid Teams message type: ${globals.config.get(
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType',
                )}`,
            );
            return false;
        }

        return {
            webhookUrl: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL'),
            messageType: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType'),
            templateFile: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile',
            ),

            headScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines',
            ),
            tailScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines',
            ),
            rateLimit: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit'),
            basicMsgTemplate: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate',
            ),
        };
    } catch (err) {
        globals.logger.error(`TEAMS ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
        return false;
    }
}

async function sendTeams(teamsWebhookUrl, teamsConfig, templateContext, msgType) {
    try {
        let compiledTemplate;
        let renderedText = null;
        let msg = null;

        if (teamsConfig.messageType === 'basic') {
            compiledTemplate = handlebars.compile(teamsConfig.basicMsgTemplate);
            renderedText = compiledTemplate(templateContext);

            msg = {
                type: 'message',
                attachments: [
                    {
                        contentType: 'application/vnd.microsoft.card.adaptive',
                        contentUrl: null,
                        content: {
                            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                            type: 'AdaptiveCard',
                            version: '1.3',
                            body: [
                                {
                                    type: 'TextBlock',
                                    size: 'large',
                                    weight: 'bolder',
                                    text: renderedText,
                                    style: 'heading',
                                    wrap: true,
                                },
                                {
                                    type: 'ActionSet',
                                    spacing: 'extraLarge',
                                    separator: true,
                                    actions: [
                                        {
                                            type: 'Action.OpenUrl',
                                            title: 'Open QMC',
                                            tooltip: 'Open management console in Qlik Sense Cloud',
                                            url: templateContext.qlikSenseQMC,
                                            role: 'button',
                                        },
                                    ],
                                },
                            ],
                        },
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
                        globals.logger.debug(`TEAMS SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`);
                        globals.logger.debug(`TEAMS SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`);

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    } else if (msgType === 'qscloud-app-reload') {
                        // Escape any back slashes in the script logs
                        const regExpText = /(?!\\n)\\{1}/gm;
                        globals.logger.debug(`TEAMS SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`);
                        globals.logger.debug(`TEAMS SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`);

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    }

                    renderedText = compiledTemplate(templateContext);

                    globals.logger.debug(`TEAMS SEND: Rendered message:\n${renderedText}`);

                    // Parse the JSON string to get rid of extra linebreaks etc.
                    msg = JSON.parse(renderedText);
                } else {
                    globals.logger.error(`TEAMS SEND: Could not open Teams template file ${teamsConfig.templateFile}.`);
                }
            } catch (err) {
                globals.logger.error(`TEAMS SEND: Error processing Teams template file: ${err}`);
            }
        }

        if (msg !== null) {
            const webhook = new Webhook(teamsWebhookUrl, msg);
            const res = await webhook.sendMessage();

            if (res !== undefined) {
                globals.logger.debug(`TEAMS SEND: Result from calling TeamsApi.TeamsSend: ${res.statusText} (${res.status}): ${res.data}`);
            }
        }
    } catch (err) {
        globals.logger.error(`TEAMS SEND: ${err}`);
    }
}

// Function to send Qlik Sense Cloud app reload failed alert
export function sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.reloadId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting check passed for failed task notification. App name: "${reloadParams.appName}"`,
                );
                globals.logger.verbose(
                    `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const teamsConfig = getAppReloadFailedTeamsConfig();
                if (teamsConfig === false) {
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
                    // Reduce script log lines to only the ones we want to send to Teams
                    scriptLogData.scriptLogHeadCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines',
                    );
                    scriptLogData.scriptLogTailCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines',
                    );

                    if (reloadParams.scriptLog?.scriptLogFull?.length > 0) {
                        scriptLogData.scriptLogHead = reloadParams.scriptLog.scriptLogFull
                            .slice(0, reloadParams.scriptLog.scriptLogHeadCount)
                            .join('\r\n');

                        scriptLogData.scriptLogTail = reloadParams.scriptLog.scriptLogFull
                            .slice(Math.max(reloadParams.scriptLog.scriptLogFull.length - reloadParams.scriptLog.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                    }

                    // Get length of script log (character count)
                    scriptLogData.scriptLogSize = reloadParams.scriptLog.scriptLogFull.length;

                    globals.logger.debug(
                        `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`,
                    );
                }

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseCloudUrls();

                // Get generic URLs from config file. Can be used as template fields.
                let genericUrls = globals.config.get('Butler.genericUrls');
                if (!genericUrls) {
                    // No URLs defined in the config file. Set to empty array
                    genericUrls = [];
                }

                // These are the template fields that can be used in Teams body
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
                    genericUrls,

                    appOwnerName: appOwner.name,
                    appOwnerUserId: appOwner.id,
                    appOwnerPicture: appOwner.picture,
                    appOwnerEmail: appOwner.email,
                };

                // Check if script log is longer than 3000 characters. Truncate if so.
                if (templateContext.scriptLogHead.length >= 3000) {
                    globals.logger.warn(
                        `TEAMS: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Teams.`,
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
                        `TEAMS: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Teams.`,
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

                const { webhookUrl } = teamsConfig;
                sendTeams(webhookUrl, teamsConfig, templateContext, 'qscloud-app-reload');
            } catch (err) {
                globals.logger.error(`TEAMS ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.warn(
                `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting failed. Not sending reload notification Teams for app [${reloadParams.appId}] "${reloadParams.appName}"`,
            );
            globals.logger.debug(
                `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
            );
        });
}
