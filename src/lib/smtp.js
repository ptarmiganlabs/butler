var globals = require('../globals');
var scriptLog = require('./scriptlog.js');

const nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
var expressHandlebars = require('express-handlebars');
const handlebars = require('handlebars');
const { RateLimiterMemory } = require('rate-limiter-flexible');

var rateLimiterMemoryFailedReloads = undefined,
    rateLimiterMemoryAbortedReloads = undefined;

if (globals.config.has('Butler.emailNotification.reladTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({ points: 1, duration: globals.config.get('Butler.emailNotification.reladTaskFailure.rateLimit') });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.reladTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({ points: 1, duration: globals.config.get('Butler.emailNotification.reladTaskAborted.rateLimit') });
} else {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

function isSmtpConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.has('Butler.emailNotification.enable') ||
            !globals.config.has('Butler.emailNotification.smtp.host') ||
            !globals.config.has('Butler.emailNotification.smtp.port') ||
            !globals.config.has('Butler.emailNotification.smtp.secure') ||
            !globals.config.has('Butler.emailNotification.smtp.tls') ||
            !globals.config.has('Butler.emailNotification.smtp.tls.rejectUnauthorized') ||
            !globals.config.has('Butler.emailNotification.smtp.tls.serverName') ||
            !globals.config.has('Butler.emailNotification.smtp.tls.ignoreTLS') ||
            !globals.config.has('Butler.emailNotification.smtp.tls.requireTLS') ||
            !globals.config.has('Butler.emailNotification.smtp.auth.enable')
        ) {
            // Not enough info in config file
            globals.logger.error('SMTP: Email config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.emailNotification.enable')) {
            // SMTP is disabled
            globals.logger.error("SMTP: SMTP notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`SMTP: ${err}`);
        return false;
    }
}

function isEmailReloadFailedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.has('Butler.emailNotification.reladTaskFailure.enable') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.headScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.tailScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.priority') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.subject') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.bodyFileDirectory') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.htmlTemplateFile') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.fromAdress') ||
            !globals.config.has('Butler.emailNotification.reladTaskFailure.toAdress') ||
            globals.config.get('Butler.emailNotification.reladTaskFailure.toAdress').length == 0
        ) {
            // Not enough info in config file
            globals.logger.error('SMTP: Reload failure email config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.emailNotification.reladTaskFailure.enable')) {
            // SMTP is disabled
            globals.logger.error("SMTP: Reload failure email notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`SMTP: ${err}`);
        return false;
    }
}

function isEmailReloadAbortedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.has('Butler.emailNotification.reladTaskAborted.enable') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.headScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.tailScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.priority') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.subject') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.bodyFileDirectory') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.htmlTemplateFile') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.fromAdress') ||
            !globals.config.has('Butler.emailNotification.reladTaskAborted.toAdress') ||
            globals.config.get('Butler.emailNotification.reladTaskAborted.toAdress').length == 0
        ) {
            // Not enough info in config file
            globals.logger.error('SMTP: Reload aborted email config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.emailNotification.reladTaskAborted.enable')) {
            // SMTP is disabled
            globals.logger.error("SMTP: Reload aborted email notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`SMTP: ${err}`);
        return false;
    }
}

function getSmtpOptions() {
    let smtpOptions = {
        host: globals.config.get('Butler.emailNotification.smtp.host'),
        port: globals.config.get('Butler.emailNotification.smtp.port'),
        secure: globals.config.get('Butler.emailNotification.smtp.secure'),
        tls: {
            rejectUnauthorized: globals.config.get('Butler.emailNotification.smtp.tls.rejectUnauthorized'),
            serverName: globals.config.get('Butler.emailNotification.smtp.tls.serverName'),
            ignoreTLS: globals.config.get('Butler.emailNotification.smtp.tls.ignoreTLS'),
            requireTLS: globals.config.get('Butler.emailNotification.smtp.tls.requireTLS'),
        },
    };

    if (globals.config.get('Butler.emailNotification.smtp.auth.enable')) {
        smtpOptions.auth = {
            user: globals.config.get('Butler.emailNotification.smtp.auth.user'),
            pass: globals.config.get('Butler.emailNotification.smtp.auth.password'),
        };
    }

    return smtpOptions;
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

    return { qmcUrl: qmcUrl, hubUrl: hubUrl };
}

async function sendEmail(from, to, subjectHandlebars, bodyFileHandlebars, templateContext) {
    try {
        // First make sure email sending is enabled in the config file and that we have all required SMTP settings
        if (isSmtpConfigOk() == false) {
            return 1;
        }

        let smtpOptions = getSmtpOptions();
        const transporter = nodemailer.createTransport(smtpOptions);

        let viewEngine = expressHandlebars.create({
            partialsDir: 'partials/',
            defaultLayout: false,
        });

        let sut = hbs({
            viewEngine: viewEngine,
            viewPath: globals.config.get('Butler.emailNotification.reladTaskFailure.bodyFileDirectory'),
        });

        // Attach the template plugin to the nodemailer transporter
        transporter.use('compile', sut);

        // Process subject template
        const subjectTemplate = handlebars.compile(subjectHandlebars);
        let subject = subjectTemplate(templateContext);

        // Set up mail object
        let message = {
            priority: globals.config.get('Butler.emailNotification.reladTaskFailure.priority'),
            from: from,
            to: to,
            subject: subject,
            template: bodyFileHandlebars,
            context: templateContext,
        };

        // Verify SMTP configuration
        let smtpStatus = await transporter.verify();
        globals.logger.debug(`SMTP: SMTP status: ${smtpStatus}`);
        globals.logger.debug(`SMTP: Message=${JSON.stringify(message, null, 2)}`);

        if (smtpStatus) {
            let result = await transporter.sendMail(message);
            globals.logger.debug(`SMTP: Sending reload failure notification result: ${JSON.stringify(result, null, 2)}`);
        } else {
            globals.logger.warn('SMTP: SMTP transporter not ready');
        }
    } catch (err) {
        globals.logger.error(`SMTP: ${err}`);
    }
}

function sendReloadTaskFailureNotificationEmail(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async rateLimiterRes => {
            try {
                globals.logger.info(`SMTPFAILED: Rate limiting ok: Sending reload failure notification email for task "${reloadParams.taskName}"`);
                globals.logger.verbose(`SMTPFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                if (isSmtpConfigOk() == false) {
                    return 1;
                }

                if (isEmailReloadFailedNotificationConfigOk() == false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                let scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.emailNotification.reladTaskFailure.headScriptLogLines'),
                    globals.config.get('Butler.emailNotification.reladTaskFailure.tailScriptLogLines'),
                );
                globals.logger.debug(`SMTPFAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Get Sense URLs from config file. Can be used as template fields.
                let senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in email subject and body
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
                    scriptLogSize: scriptLogData.scriptLogSize,
                    scriptLogHead: scriptLogData.scriptLogHead,
                    scriptLogTail: scriptLogData.scriptLogTail,
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
                    qliksSenseQMC: senseUrls.qmcUrl,
                    qliksSenseHub: senseUrls.hubUrl,
                };

                sendEmail(
                    globals.config.get('Butler.emailNotification.reladTaskFailure.fromAdress'),
                    globals.config.get('Butler.emailNotification.reladTaskFailure.toAdress'),
                    globals.config.get('Butler.emailNotification.reladTaskFailure.subject'),
                    globals.config.get('Butler.emailNotification.reladTaskFailure.htmlTemplateFile'),
                    templateContext,
                );
            } catch (err) {
                globals.logger.error(`SMTPFAILED: ${err}`);
            }
        })
        .catch(rateLimiterRes => {
            globals.logger.verbose(`SMTPFAILED: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}"`);
            globals.logger.verbose(`SMTPFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

function sendReloadTaskAbortedNotificationEmail(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async rateLimiterRes => {
            try {
                globals.logger.info(`SMTPABORTED: Rate limiting ok: Sending reload aborted notification email for task "${reloadParams.taskName}"`);
                globals.logger.verbose(`SMTPABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                if (isSmtpConfigOk() == false) {
                    return 1;
                }

                if (isEmailReloadAbortedNotificationConfigOk() == false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                let scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.emailNotification.reladTaskAborted.headScriptLogLines'),
                    globals.config.get('Butler.emailNotification.reladTaskAborted.tailScriptLogLines'),
                );
                globals.logger.debug(`SMTPABORTED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Get Sense URLs from config file. Can be used as template fields.
                let senseUrls = getQlikSenseUrls();

                // These are the template fields that can be used in email subject and body
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
                    scriptLogSize: scriptLogData.scriptLogSize,
                    scriptLogHead: scriptLogData.scriptLogHead,
                    scriptLogTail: scriptLogData.scriptLogTail,
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
                    qliksSenseQMC: senseUrls.qmcUrl,
                    qliksSenseHub: senseUrls.hubUrl,
                };

                sendEmail(
                    globals.config.get('Butler.emailNotification.reladTaskAborted.fromAdress'),
                    globals.config.get('Butler.emailNotification.reladTaskAborted.toAdress'),
                    globals.config.get('Butler.emailNotification.reladTaskAborted.subject'),
                    globals.config.get('Butler.emailNotification.reladTaskAborted.htmlTemplateFile'),
                    templateContext,
                );
            } catch (err) {
                globals.logger.error(`SMTPABORTED: ${err}`);
            }
        })
        .catch(rateLimiterRes => {
            globals.logger.verbose(`SMTPABORTED: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}"`);
            globals.logger.verbose(`SMTPABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

module.exports = {
    sendReloadTaskFailureNotificationEmail,
    sendReloadTaskAbortedNotificationEmail,
};
