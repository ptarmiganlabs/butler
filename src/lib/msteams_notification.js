const fs = require('fs');
const handlebars = require('handlebars');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const globals = require('../globals');
const scriptLog = require('./scriptlog');

let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;

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

function getTeamsReloadFailedNotificationConfigOk() {
    try {
        // First make sure Teams sending is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable') ||
            !globals.config.has('Butler.teamsNotification.reloadTaskFailure.webhookURL') ||
            !globals.config.has('Butler.teamsNotification.reloadTaskFailure.messageType')
        ) {
            // Not enough info in config file
            globals.logger.error(
                'TEAMSFAILED: Reload failure Teams config info missing in Butler config file'
            );
            return false;
        }

        if (!globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable')) {
            // Teams task falure notifications are disabled
            globals.logger.error(
                "TEAMSFAILED: Reload failure Teams notifications are disabled in config file - won't send Teams message"
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') !==
                'basic' &&
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') !==
                'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `TEAMSFAILED: Invalid Teams message type: ${globals.config.get(
                    'Butler.teamsNotification.reloadTaskFailure.messageType'
                )}`
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') === 'basic'
        ) {
            // Basic formatting. Make sure requried parameters are present
            if (
                !globals.config.has('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate')
            ) {
                // No message text in config file.
                globals.logger.error('TEAMSFAILED: No message text in config file.');
                return false;
            }
        } else if (
            globals.config.get('Butler.teamsNotification.reloadTaskFailure.messageType') ===
            'formatted'
        ) {
            // Extended formatting using Teams blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.reloadTaskFailure.templateFile')) {
                globals.logger.error(
                    'TEAMSFAILED: Message template file not specified in config file.'
                );
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.teamsNotification.reloadTaskFailure.webhookURL'),
            messageType: globals.config.get(
                'Butler.teamsNotification.reloadTaskFailure.messageType'
            ),
            templateFile: globals.config.get(
                'Butler.teamsNotification.reloadTaskFailure.templateFile'
            ),

            headScriptLogLines: globals.config.has(
                'Butler.teamsNotification.reloadTaskFailure.headScriptLogLines'
            )
                ? globals.config.get(
                      'Butler.teamsNotification.reloadTaskFailure.headScriptLogLines'
                  )
                : 15,
            tailScriptLogLines: globals.config.has(
                'Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines'
            )
                ? globals.config.get(
                      'Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines'
                  )
                : 15,
            rateLimit: globals.config.has('Butler.teamsNotification.reloadTaskFailure.rateLimit')
                ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has(
                'Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate'
            )
                ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate')
                : '',
        };
    } catch (err) {
        globals.logger.error(`TEAMSFAILED: ${err}`);
        return false;
    }
}

function getTeamsReloadAbortedNotificationConfigOk() {
    try {
        // First make sure Teams sending is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.teamsNotification.reloadTaskAborted.enable') ||
            !globals.config.has('Butler.teamsNotification.reloadTaskAborted.webhookURL') ||
            !globals.config.has('Butler.teamsNotification.reloadTaskAborted.messageType')
        ) {
            // Not enough info in config file
            globals.logger.error(
                'TEAMSABORTED: Reload aborted Teams config info missing in Butler config file'
            );
            return false;
        }

        if (!globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable')) {
            // Teams task aborted notifications are disabled
            globals.logger.error(
                "TEAMSABORTED: Reload aborted Teams notifications are disabled in config file - won't send Teams message"
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') !==
                'basic' &&
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') !==
                'formatted'
        ) {
            // Invalid Teams message type
            globals.logger.error(
                `TEAMSABORTED: Invalid Teams message type: ${globals.config.get(
                    'Butler.teamsNotification.reloadTaskAborted.messageType'
                )}`
            );
            return false;
        }

        if (
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') === 'basic'
        ) {
            // Basic formatting. Make sure requried parameters are present
            if (
                !globals.config.has('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate')
            ) {
                // No message text in config file.
                globals.logger.error('TEAMSABORTED: No message text in config file.');
                return false;
            }
        } else if (
            globals.config.get('Butler.teamsNotification.reloadTaskAborted.messageType') ===
            'formatted'
        ) {
            // Extended formatting using Teams blocks. Make sure requried parameters are present
            if (!globals.config.has('Butler.teamsNotification.reloadTaskAborted.templateFile')) {
                globals.logger.error(
                    'TEAMSABORTED: Message template file not specified in config file.'
                );
                return false;
            }
        }

        return {
            webhookUrl: globals.config.get('Butler.teamsNotification.reloadTaskAborted.webhookURL'),
            messageType: globals.config.get(
                'Butler.teamsNotification.reloadTaskAborted.messageType'
            ),
            templateFile: globals.config.get(
                'Butler.teamsNotification.reloadTaskAborted.templateFile'
            ),

            headScriptLogLines: globals.config.has(
                'Butler.teamsNotification.reloadTaskAborted.headScriptLogLines'
            )
                ? globals.config.get(
                      'Butler.teamsNotification.reloadTaskAborted.headScriptLogLines'
                  )
                : 15,
            tailScriptLogLines: globals.config.has(
                'Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines'
            )
                ? globals.config.get(
                      'Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines'
                  )
                : 15,
            rateLimit: globals.config.has('Butler.teamsNotification.reloadTaskAborted.rateLimit')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.rateLimit')
                : '',
            basicMsgTemplate: globals.config.has(
                'Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate'
            )
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate')
                : '',
            channel: globals.config.has('Butler.teamsNotification.reloadTaskAborted.channel')
                ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.channel')
                : '',
        };
    } catch (err) {
        globals.logger.error(`TEAMSABORTED: ${err}`);
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

async function sendTeams(teamsWebhookObj, teamsConfig, templateContext) {
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
            const template = fs.readFileSync(teamsConfig.templateFile, 'utf8');
            compiledTemplate = handlebars.compile(template);
            renderedText = compiledTemplate(templateContext);

            // Parse the JSON string to get rid of extra linebreaks etc.
            msg = JSON.parse(renderedText);
        }

        const res = await teamsWebhookObj.send(JSON.stringify(msg));

        globals.logger.debug(
            `TEAMSNOTIF: Result from calling TeamsApi.TeamsSend: ${res.statusText} (${res.status}): ${res.data}`
        );
    } catch (err) {
        globals.logger.error(`TEAMSNOTIF: ${err}`);
    }
}

function sendReloadTaskFailureNotificationTeams(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TEAMSFAILED: Rate limiting ok: Sending reload failure notification Teams for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(
                    `TEAMSFAILED: Rate limiting details "${JSON.stringify(
                        rateLimiterRes,
                        null,
                        2
                    )}"`
                );

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const teamsConfig = getTeamsReloadFailedNotificationConfigOk();
                if (teamsConfig === false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                const scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get(
                        'Butler.teamsNotification.reloadTaskFailure.headScriptLogLines'
                    ),
                    globals.config.get(
                        'Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines'
                    )
                );
                globals.logger.debug(
                    `TEAMSFAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`
                );

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in Teams body
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
                        .replace(/([\n])/gm, '\\n\\n')
                        .replace(/([\t])/gm, '\\t'),
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
                };

                sendTeams(globals.teamsTaskFailureObj, teamsConfig, templateContext);
            } catch (err) {
                globals.logger.error(`TEAMSFAILED: ${err}`);
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.warn(
                `TEAMSFAILED: Rate limiting failed. Not sending reload notification Teams for task "${reloadParams.taskName}"`
            );
            globals.logger.debug(
                `TEAMSFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
            );
        });
}

function sendReloadTaskAbortedNotificationTeams(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TEAMSABORTED: Rate limiting ok: Sending reload aborted notification Teams for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(
                    `TEAMSABORTED: Rate limiting details "${JSON.stringify(
                        rateLimiterRes,
                        null,
                        2
                    )}"`
                );

                // Make sure Teams sending is enabled in the config file and that we have all required settings
                const TeamsConfig = getTeamsReloadAbortedNotificationConfigOk();
                if (TeamsConfig === false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                const scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get(
                        'Butler.teamsNotification.reloadTaskAborted.headScriptLogLines'
                    ),
                    globals.config.get(
                        'Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines'
                    )
                );
                globals.logger.debug(
                    `TEAMSABORTED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`
                );

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in Teams body
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
                        .replace(/([\n])/gm, '\\n\\n')
                        .replace(/([\t])/gm, '\\t'),
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
                };

                sendTeams(globals.teamsTaskAbortedObj, TeamsConfig, templateContext);
            } catch (err) {
                globals.logger.error(`TEAMSABORTED: ${err}`);
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `TEAMSABORTED: Rate limiting failed. Not sending reload notification Teams for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(
                `TEAMSABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
            );
        });
}

module.exports = {
    sendReloadTaskFailureNotificationTeams,
    sendReloadTaskAbortedNotificationTeams,
};
