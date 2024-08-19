/* eslint-disable import/prefer-default-export */
import fs from 'fs';

import { Webhook, SimpleTextCard } from 'ms-teams-wrapper';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import { getQlikSenseCloudUserInfo } from './api/user.js';
import { getQlikSenseCloudAppInfo } from './api/app.js';
// import getAppOwner from '../../qrs_util/get_app_owner.js';

let rateLimiterMemoryFailedReloads;

if (globals.config.has('Butler.teamsNotification.reloadTaskFailure.rateLimit')) {
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
                "TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Reload failure Teams notifications are disabled in config file - won't send Teams message"
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
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType'
                )}`
            );
            return false;
        }

        return {
            webhookUrl: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL'),
            messageType: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType'),
            templateFile: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile'
            ),

            headScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines'
            ),
            tailScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines'
            ),
            rateLimit: globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit'),
            basicMsgTemplate: globals.config.has(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate'
            ),
        };
    } catch (err) {
        globals.logger.error(`TEAMS ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
        return false;
    }
}

function getQlikSenseCloudUrls() {
    let qmcUrl = '';
    let hubUrl = '';

    if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc')) {
        qmcUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
    }

    if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub')) {
        hubUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');
    }

    return {
        qmcUrl,
        hubUrl,
    };
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
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting check passed for failed task notification. App name: "${reloadParams.appName}"`
                );
                globals.logger.verbose(
                    `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
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
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines'
                    );
                    scriptLogData.scriptLogTailCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines'
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
                        `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`
                    );
                }

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseCloudUrls();

                // These are the template fields that can be used in Teams body
                const templateContext = {
                    tenantId: reloadParams.tenantId,
                    userId: reloadParams.userId,
                    userName: appOwner === undefined ? 'Unknown' : appOwner.name,
                    appName: reloadParams.appName,
                    appId: reloadParams.appId,
                    errorCode: reloadParams.reloadInfo.errorCode,
                    errorMessage: reloadParams.reloadInfo.errorMessage,
                    logMessage: reloadParams.reloadInfo.log
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n\\n')
                        .replace(/([\t])/gm, '\\t'),
                    executionDuration: reloadParams.reloadInfo.executionDuration,
                    executionStartTime: reloadParams.reloadInfo.executionStartTime,
                    executionStopTime: reloadParams.reloadInfo.executionStopTime,
                    executionStatusText: reloadParams.reloadInfo.status,
                    scriptLogSize: scriptLogData.scriptLogSize,
                    scriptLogHead: scriptLogData.scriptLogHead
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTail: scriptLogData.scriptLogTail
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n\\n')
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

                // Check if script log is longer than 3000 characters. Truncate if so.
                if (templateContext.scriptLogHead.length >= 3000) {
                    globals.logger.warn(
                        `TEAMS: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Teams.`
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
                        `TEAMS: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Teams.`
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
                `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting failed. Not sending reload notification Teams for task "${reloadParams.taskName}"`
            );
            globals.logger.debug(
                `TEAMS ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
            );
        });
}
