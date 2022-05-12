/* eslint-disable consistent-return */

const fs = require('fs');
const handlebars = require('handlebars');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const globals = require('../globals');
const scriptLog = require('./scriptlog');
const slackApi = require('./slack_api');

let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;

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

function getSlackReloadFailedNotificationConfigOk() {
    try {
        // First make sure Slack sending is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.slackNotification.reloadTaskFailure.enable') ||
            !globals.config.has('Butler.slackNotification.reloadTaskFailure.webhookURL') ||
            !globals.config.has('Butler.slackNotification.reloadTaskFailure.messageType')
        ) {
            // Not enough info in config file
            globals.logger.error('TASK FAILED ALERT SLACK: Reload failure Slack config info missing in Butler config file');
            return false;
        }

        if (!globals.config.get('Butler.slackNotification.reloadTaskFailure.enable')) {
            // Slack task falure notifications are disabled
            globals.logger.error(
                "TASK FAILED ALERT SLACK: Reload failure Slack notifications are disabled in config file - won't send Slack message"
            );
            return false;
        }

        if (
            globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') !== 'basic' &&
            globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') !== 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `TASK FAILED ALERT SLACK: Invalid Slack message type: ${globals.config.get(
                    'Butler.slackNotification.reloadTaskFailure.messageType'
                )}`
            );
            return false;
        }

        if (globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskFailure.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('TASK FAILED ALERT SLACK: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.reloadTaskFailure.messageType') === 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskFailure.templateFile')) {
                globals.logger.error('TASK FAILED ALERT SLACK: Message template file not specified in config file.');
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
        globals.logger.error(`TASK FAILED ALERT SLACK: ${err}`);
        return false;
    }
}

function getSlackReloadAbortedNotificationConfigOk() {
    try {
        // First make sure Slack sending is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.slackNotification.reloadTaskAborted.enable') ||
            !globals.config.has('Butler.slackNotification.reloadTaskAborted.webhookURL') ||
            !globals.config.has('Butler.slackNotification.reloadTaskAborted.messageType')
        ) {
            // Not enough info in config file
            globals.logger.error('TASK ABORTED ALERT SLACK: Reload aborted Slack config info missing in Butler config file');
            return false;
        }

        if (!globals.config.get('Butler.slackNotification.reloadTaskAborted.enable')) {
            // Slack task aborted notifications are disabled
            globals.logger.error(
                "TASK ABORTED ALERT SLACK: Reload aborted Slack notifications are disabled in config file - won't send Slack message"
            );
            return false;
        }

        if (
            globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') !== 'basic' &&
            globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') !== 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(
                `TASK ABORTED ALERT SLACK: Invalid Slack message type: ${globals.config.get(
                    'Butler.slackNotification.reloadTaskAborted.messageType'
                )}`
            );
            return false;
        }

        if (globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') === 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskAborted.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('TASK ABORTED ALERT SLACK: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.reloadTaskAborted.messageType') === 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reloadTaskAborted.templateFile')) {
                globals.logger.error('TASK ABORTED ALERT SLACK: Message template file not specified in config file.');
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
        globals.logger.error(`TASK ABORTED ALERT SLACK: ${err}`);
        return false;
    }
}

function getQlikSenseUrls() {
    let qmcUrl = '';
    let hubUrl = '';

    if (globals.config.has('Butler.qlikSenseUrls.qmc')) {
        qmcUrl = globals.config.get('Butler.qlikSenseUrls.qmc');
    }

    if (globals.config.has('Butler.qlikSenseUrls.hub')) {
        hubUrl = globals.config.get('Butler.qlikSenseUrls.hub');
    }

    return {
        qmcUrl,
        hubUrl,
    };
}

async function sendSlack(slackConfig, templateContext) {
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
                    const template = fs.readFileSync(slackConfig.templateFile, 'utf8');
                    compiledTemplate = handlebars.compile(template);
                    slackMsg = compiledTemplate(templateContext);
                } else {
                    globals.logger.error(`SLACKNOTIF: Could not open Slack template file ${slackConfig.templateFile}.`);
                }
            } catch (err) {
                globals.logger.error(`SLACKNOTIF: Error processing Slack template file: ${err}`);
            }
        }

        if (slackMsg !== null) {
            msg.text = slackMsg;
            const res = await slackApi.slackSend(msg, globals.logger);
            if (res !== undefined) {
                globals.logger.debug(`SLACKNOTIF: Result from calling slackApi.slackSend: ${res.statusText} (${res.status}): ${res.data}`);
            }
        }
    } catch (err) {
        globals.logger.error(`SLACKNOTIF: ${err}`);
    }
}

function sendReloadTaskFailureNotificationSlack(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TASK FAILED ALERT SLACK: Rate limiting ok: Sending reload failure notification Slack for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(`TASK FAILED ALERT SLACK: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const slackConfig = getSlackReloadFailedNotificationConfigOk();
                if (slackConfig === false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                const scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.slackNotification.reloadTaskFailure.headScriptLogLines'),
                    globals.config.get('Butler.slackNotification.reloadTaskFailure.tailScriptLogLines')
                );
                globals.logger.debug(`TASK FAILED ALERT SLACK: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in Slack body
                const templateContext = {
                    hostName: reloadParams.hostName,
                    user: reloadParams.user,
                    taskName: reloadParams.taskName,
                    taskId: reloadParams.taskId,
                    appName: reloadParams.appName,
                    appId: reloadParams.appId,
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
                };

                // Check if script log is longer than 3000 characters, which is max for text fields sent to Slack API
                // https://api.slack.com/reference/block-kit/blocks#section_fields
                if (templateContext.scriptLogHead.length >= 3000) {
                    globals.logger.warn(
                        `SLACK: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Slack.`
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
                        `SLACK: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Slack.`
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

                sendSlack(slackConfig, templateContext);
            } catch (err) {
                globals.logger.error(`TASK FAILED ALERT SLACK: ${err}`);
            }
        })
        .catch((err) => {
            globals.logger.warn(
                `TASK FAILED ALERT SLACK: Rate limiting failed. Not sending reload notification Slack for task "${reloadParams.taskName}"`
            );
            globals.logger.debug(`TASK FAILED ALERT SLACK: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
        });
}

function sendReloadTaskAbortedNotificationSlack(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TASK ABORTED ALERT SLACK: Rate limiting ok: Sending reload aborted notification Slack for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(`TASK ABORTED ALERT SLACK: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const slackConfig = getSlackReloadAbortedNotificationConfigOk();
                if (slackConfig === false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                const scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.slackNotification.reloadTaskAborted.headScriptLogLines'),
                    globals.config.get('Butler.slackNotification.reloadTaskAborted.tailScriptLogLines')
                );
                globals.logger.debug(`TASK ABORTED ALERT SLACK: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in Slack body
                const templateContext = {
                    hostName: reloadParams.hostName,
                    user: reloadParams.user,
                    taskName: reloadParams.taskName,
                    taskId: reloadParams.taskId,
                    appName: reloadParams.appName,
                    appId: reloadParams.appId,
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
                };

                // Check if script log is longer than 3000 characters, which is max for text fields sent to Slack API
                // https://api.slack.com/reference/block-kit/blocks#section_fields
                if (templateContext.scriptLogHead.length >= 3000) {
                    globals.logger.warn(
                        `SLACK: Script log head field is too long (${templateContext.scriptLogHead.length}), will truncate before posting to Slack.`
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
                        `SLACK: Script log head field is too long (${templateContext.scriptLogTail.length}), will truncate before posting to Slack.`
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

                sendSlack(slackConfig, templateContext);
            } catch (err) {
                globals.logger.error(`TASK ABORTED ALERT SLACK: ${err}`);
            }
        })
        .catch((err) => {
            globals.logger.verbose(
                `TASK ABORTED ALERT SLACK: Rate limiting failed. Not sending reload notification Slack for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(`TASK ABORTED ALERT SLACK: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
        });
}

module.exports = {
    sendReloadTaskFailureNotificationSlack,
    sendReloadTaskAbortedNotificationSlack,
};
