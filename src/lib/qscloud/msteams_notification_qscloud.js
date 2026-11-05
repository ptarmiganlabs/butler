/**
 * Qlik Sense Cloud Microsoft Teams Notification Module.
 *
 * This module sends Microsoft Teams notifications for Qlik Sense Cloud (QSC) events.
 * Currently supports:
 * - App reload failure notifications
 *
 * Uses Handlebars templates for message formatting with rate limiting.
 */

import fs from 'fs';

import { Webhook } from 'ms-teams-wrapper';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import { MSTEAMS_TEXT_FIELD_MAX_LENGTH } from '../../constants.js';
import { prepareQlikSenseCloudAppReloadTemplateContext, escapeLineBreaksAndTabsForJson } from './template_context.js';
import { prepareQlikSenseCloudScriptLogForNotification } from './scriptlog.js';

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

/**
 * Retrieves the Teams configuration for app reload failure notifications.
 * @returns {Object|boolean} The Teams configuration object or false if configuration is invalid.
 */
function getAppReloadFailedTeamsConfig() {
    try {
        if (!globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable')) {
            // Teams task falure notifications are disabled
            globals.logger.error(
                "[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Reload failure Teams notifications are disabled in config file - won't send Teams message",
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
                `[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Invalid Teams message type: ${globals.config.get(
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
        globals.logger.error(`[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Sends a Teams message based on the provided configuration and template context.
 * @param {string} teamsWebhookUrl - The Teams webhook URL.
 * @param {Object} teamsConfig - The Teams configuration object.
 * @param {Object} templateContext - The context for the Handlebars template.
 * @param {string} msgType - The type of message to send.
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
                        globals.logger.debug(
                            `[QSCLOUD] TEAMS SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`,
                        );
                        globals.logger.debug(
                            `[QSCLOUD] TEAMS SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`,
                        );

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    } else if (msgType === 'qscloud-app-reload') {
                        // Escape any back slashes in the script logs
                        const regExpText = /(?!\\n)\\{1}/gm;
                        globals.logger.debug(
                            `[QSCLOUD] TEAMS SEND: Script log head escaping: ${regExpText.exec(templateContext.scriptLogHead)}`,
                        );
                        globals.logger.debug(
                            `[QSCLOUD] TEAMS SEND: Script log tail escaping: ${regExpText.exec(templateContext.scriptLogTail)}`,
                        );

                        templateContext.scriptLogHead = templateContext.scriptLogHead.replace(regExpText, '\\\\');
                        templateContext.scriptLogTail = templateContext.scriptLogTail.replace(regExpText, '\\\\');
                    }

                    renderedText = compiledTemplate(templateContext);

                    globals.logger.debug(`[QSCLOUD] TEAMS SEND: Rendered message:\n${renderedText}`);

                    // Parse the JSON string to get rid of extra linebreaks etc.
                    msg = JSON.parse(renderedText);
                } else {
                    globals.logger.error(`[QSCLOUD] TEAMS SEND: Could not open Teams template file ${teamsConfig.templateFile}.`);
                }
            } catch (err) {
                globals.logger.error(`[QSCLOUD] TEAMS SEND: Error processing Teams template file: ${globals.getErrorMessage(err)}`);
            }
        }

        if (msg !== null) {
            const webhook = new Webhook(teamsWebhookUrl, msg);
            const res = await webhook.sendMessage();

            if (res !== undefined) {
                globals.logger.debug(
                    `[QSCLOUD] TEAMS SEND: Result from calling TeamsApi.TeamsSend: ${res.statusText} (${res.status}): ${res.data}`,
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

        globals.logger.error(`[QSCLOUD] TEAMS SEND: ${errorMsg}`);
    }
}

/**
 * Sends a Teams notification for a Qlik Sense Cloud app reload failure.
 * @param {Object} reloadParams - The parameters related to the app reload.
 */
export function sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.reloadId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Rate limiting check passed for failed task notification. App name: "${reloadParams.appName}"`,
                );
                globals.logger.verbose(
                    `[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const teamsConfig = getAppReloadFailedTeamsConfig();
                if (teamsConfig === false) {
                    return 1;
                }

                // Reduce full script log to head and tail adapted for Teams
                // If reloadParams.scriptLog is false, the script log could not be obtained
                const scriptLogData = prepareQlikSenseCloudScriptLogForNotification(
                    reloadParams.scriptLog,
                    globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines',
                    ),
                    globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines',
                    ),
                );
                globals.logger.debug(
                    `[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`,
                );

                // These are the template fields that can be used in Teams body
                const templateContext = prepareQlikSenseCloudAppReloadTemplateContext(reloadParams, scriptLogData);

                // The Teams template is JSON, so line breaks and tabs in the log message and script log are written as escape sequences
                templateContext.logMessage = escapeLineBreaksAndTabsForJson(templateContext.logMessage);
                templateContext.scriptLogHead = escapeLineBreaksAndTabsForJson(templateContext.scriptLogHead);
                templateContext.scriptLogTail = escapeLineBreaksAndTabsForJson(templateContext.scriptLogTail);

                // Check if script log is longer than max characters. Truncate if so.
                if (templateContext.scriptLogHead.length >= MSTEAMS_TEXT_FIELD_MAX_LENGTH) {
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

                if (templateContext.scriptLogTail.length >= MSTEAMS_TEXT_FIELD_MAX_LENGTH) {
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
                await sendTeams(webhookUrl, teamsConfig, templateContext, 'qscloud-app-reload');
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

                globals.logger.error(`[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: ${errorMsg}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.warn(
                `[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Rate limiting failed. Not sending reload notification Teams for app [${reloadParams.appId}] "${reloadParams.appName}"`,
            );
            globals.logger.debug(
                `[QSCLOUD] TEAMS ALERT - APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
            );
        });
}
