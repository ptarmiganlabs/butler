/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

var globals = require('../globals');
var scriptLog = require('./scriptlog.js');
var slackApi = require('./slack_api.js');
const fs = require('fs');

const handlebars = require('handlebars');
const { RateLimiterMemory } = require('rate-limiter-flexible');

var rateLimiterMemoryFailedReloads = undefined,
    rateLimiterMemoryAbortedReloads = undefined;

if (globals.config.has('Butler.slackNotification.reladTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.slackNotification.reladTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.slackNotification.reladTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.slackNotification.reladTaskAborted.rateLimit'),
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
            !globals.config.has('Butler.slackNotification.reladTaskFailure.enable') ||
            !globals.config.has('Butler.slackNotification.reladTaskFailure.webhookURL') ||
            !globals.config.has('Butler.slackNotification.reladTaskFailure.messageType')
        ) {
            // Not enough info in config file
            globals.logger.error('SLACKFAILED: Reload failure Slack config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.slackNotification.reladTaskFailure.enable')) {
            // Slack task falure notifications are disabled
            globals.logger.error('SLACKFAILED: Reload failure Slack notifications are disabled in config file - won\'t send Slack message');
            return false;
        } else if (
            globals.config.get('Butler.slackNotification.reladTaskFailure.messageType') != 'basic' &&
            globals.config.get('Butler.slackNotification.reladTaskFailure.messageType') != 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(`SLACKFAILED: Invalid Slack message type: ${globals.config.get('Butler.slackNotification.reladTaskFailure.messageType')}`);
            return false;
        } else if (globals.config.get('Butler.slackNotification.reladTaskFailure.messageType') == 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reladTaskFailure.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('SLACKFAILED: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.reladTaskFailure.messageType') == 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reladTaskFailure.markdownTemplateFile')) {
                globals.logger.error('SLACKFAILED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.slackNotification.reladTaskFailure.webhookURL'),
            messageType: globals.config.get('Butler.slackNotification.reladTaskFailure.messageType'),
            markdownTemplateFile: globals.config.get('Butler.slackNotification.reladTaskFailure.markdownTemplateFile'),

            headScriptLogLines: globals.config.has('Butler.slackNotification.reladTaskFailure.headScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.headScriptLogLines')
                : 15,
            tailScriptLogLines: globals.config.has('Butler.slackNotification.reladTaskFailure.tailScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.tailScriptLogLines')
                : 15,
            fromUser: globals.config.has('Butler.slackNotification.reladTaskFailure.fromUser')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.fromUser')
                : '',
            iconEmoji: globals.config.has('Butler.slackNotification.reladTaskFailure.iconEmoji')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.iconEmoji')
                : '',
            rateLimit: globals.config.has('Butler.slackNotification.reladTaskFailure.rateLimit')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has('Butler.slackNotification.reladTaskFailure.basicMsgTemplate')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.basicMsgTemplate')
                : '',
            channel: globals.config.has('Butler.slackNotification.reladTaskFailure.channel')
                ? globals.config.get('Butler.slackNotification.reladTaskFailure.channel')
                : '',
        };
    } catch (err) {
        globals.logger.error(`SLACKFAILED: ${err}`);
        return false;
    }
}

function getSlackReloadAbortedNotificationConfigOk() {
    try {
        // First make sure Slack sending is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.slackNotification.reladTaskAborted.enable') ||
            !globals.config.has('Butler.slackNotification.reladTaskAborted.webhookURL') ||
            !globals.config.has('Butler.slackNotification.reladTaskAborted.messageType')
        ) {
            // Not enough info in config file
            globals.logger.error('SLACKABORTED: Reload aborted Slack config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.slackNotification.reladTaskAborted.enable')) {
            // Slack task aborted notifications are disabled
            globals.logger.error('SLACKABORTED: Reload aborted Slack notifications are disabled in config file - won\'t send Slack message');
            return false;
        } else if (
            globals.config.get('Butler.slackNotification.reladTaskAborted.messageType') != 'basic' &&
            globals.config.get('Butler.slackNotification.reladTaskAborted.messageType') != 'formatted'
        ) {
            // Invalid Slack message type
            globals.logger.error(`SLACKABORTED: Invalid Slack message type: ${globals.config.get('Butler.slackNotification.reladTaskAborted.messageType')}`);
            return false;
        } else if (globals.config.get('Butler.slackNotification.reladTaskAborted.messageType') == 'basic') {
            // Basic formatting. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reladTaskAborted.basicMsgTemplate')) {
                // No message text in config file.
                globals.logger.error('SLACKABORTED: No message text in config file.');
                return false;
            }
        } else if (globals.config.get('Butler.slackNotification.reladTaskAborted.messageType') == 'formatted') {
            // Extended formatting using Slack blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.slackNotification.reladTaskAborted.markdownTemplateFile')) {
                globals.logger.error('SLACKABORTED: Message template file not specified in config file.');
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.slackNotification.reladTaskAborted.webhookURL'),
            messageType: globals.config.get('Butler.slackNotification.reladTaskAborted.messageType'),
            markdownTemplateFile: globals.config.get('Butler.slackNotification.reladTaskAborted.markdownTemplateFile'),

            headScriptLogLines: globals.config.has('Butler.slackNotification.reladTaskAborted.headScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.headScriptLogLines')
                : 15,
            tailScriptLogLines: globals.config.has('Butler.slackNotification.reladTaskAborted.tailScriptLogLines')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.tailScriptLogLines')
                : 15,
            fromUser: globals.config.has('Butler.slackNotification.reladTaskAborted.fromUser')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.fromUser')
                : '',
            iconEmoji: globals.config.has('Butler.slackNotification.reladTaskAborted.iconEmoji')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.iconEmoji')
                : '',
            rateLimit: globals.config.has('Butler.slackNotification.reladTaskAborted.rateLimit')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has('Butler.slackNotification.reladTaskAborted.basicMsgTemplate')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.basicMsgTemplate')
                : '',
            channel: globals.config.has('Butler.slackNotification.reladTaskAborted.channel')
                ? globals.config.get('Butler.slackNotification.reladTaskAborted.channel')
                : '',
        };
    } catch (err) {
        globals.logger.error(`SLACKABORTED: ${err}`);
        return false;
    }
}

function getQlikSenseUrls() {
    let qmcUrl = '',
        hubUrl = '';

    if (globals.config.has('Butler.qlikSenseUrls.qmc')) {
        qmcUrl = globals.config.get('Butler.qlikSenseUrls.qmc');
    }

    if (globals.config.has('Butler.qlikSenseUrls.hub')) {
        hubUrl = globals.config.get('Butler.qlikSenseUrls.hub');
    }

    return {
        qmcUrl: qmcUrl,
        hubUrl: hubUrl,
    };
}

async function sendSlack(slackConfig, templateContext) {
    try {
        let compiledTemplate,
            renderedText = null;

        if (slackConfig.messageType == 'basic') {
            compiledTemplate = handlebars.compile(slackConfig.basicMsgTemplate);
        } else if (slackConfig.messageType == 'formatted') {
            var template = fs.readFileSync(slackConfig.markdownTemplateFile, 'utf8');
            compiledTemplate = handlebars.compile(template);
        }
        renderedText = compiledTemplate(templateContext);

        let msg = slackConfig;
        msg.text = renderedText;

        let res = await slackApi.slackSend(msg, globals.logger);
        globals.logger.debug(`SLACKNOTIF: Result from calling slackApi.slackSend: ${res.statusText} (${res.status}): ${res.data}`);
    } catch (err) {
        globals.logger.error(`SLACKNOTIF: ${err}`);
    }
}

function sendReloadTaskFailureNotificationSlack(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async rateLimiterRes => {
            try {
                globals.logger.info(`SLACKFAILED: Rate limiting ok: Sending reload failure notification Slack for task "${reloadParams.taskName}"`);
                globals.logger.verbose(`SLACKFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                let slackConfig = getSlackReloadFailedNotificationConfigOk();
                if (slackConfig == false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                let scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.slackNotification.reladTaskFailure.headScriptLogLines'),
                    globals.config.get('Butler.slackNotification.reladTaskFailure.tailScriptLogLines'),
                );
                globals.logger.debug(`SLACKFAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Get Sense URLs from config file. Can be used as template fields.
                let senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in Slack body
                let templateContext = {
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
                    scriptLogHead: scriptLogData.scriptLogHead,
                    scriptLogTail: scriptLogData.scriptLogTail
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
                    qliksSenseQMC: senseUrls.qmcUrl,
                    qliksSenseHub: senseUrls.hubUrl,
                };

                sendSlack(slackConfig, templateContext);
            } catch (err) {
                globals.logger.error(`SLACKFAILED: ${err}`);
            }
        })
        .catch(rateLimiterRes => {
            globals.logger.verbose(`SLACKFAILED: Rate limiting failed. Not sending reload notification Slack for task "${reloadParams.taskName}"`);
            globals.logger.verbose(`SLACKFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

function sendReloadTaskAbortedNotificationSlack(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async rateLimiterRes => {
            try {
                globals.logger.info(`SLACKABORTED: Rate limiting ok: Sending reload aborted notification Slack for task "${reloadParams.taskName}"`);
                globals.logger.verbose(`SLACKABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                let slackConfig = getSlackReloadAbortedNotificationConfigOk();
                if (slackConfig == false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                let scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.slackNotification.reladTaskAborted.headScriptLogLines'),
                    globals.config.get('Butler.slackNotification.reladTaskAborted.tailScriptLogLines'),
                );
                globals.logger.debug(`SLACKABORTED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Get Sense URLs from config file. Can be used as template fields.
                let senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in Slack body
                let templateContext = {
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
                    scriptLogHead: scriptLogData.scriptLogHead,
                    scriptLogTail: scriptLogData.scriptLogTail
                        .replace(/([\r])/gm, '')
                        .replace(/([\n])/gm, '\\n')
                        .replace(/([\t])/gm, '\\t'),
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
                    qliksSenseQMC: senseUrls.qmcUrl,
                    qliksSenseHub: senseUrls.hubUrl,
                };

                sendSlack(slackConfig, templateContext);
            } catch (err) {
                globals.logger.error(`SLACKABORTED: ${err}`);
            }
        })
        .catch(rateLimiterRes => {
            globals.logger.verbose(`SLACKABORTED: Rate limiting failed. Not sending reload notification Slack for task "${reloadParams.taskName}"`);
            globals.logger.verbose(`SLACKABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

module.exports = {
    sendReloadTaskFailureNotificationSlack,
    sendReloadTaskAbortedNotificationSlack,
};
