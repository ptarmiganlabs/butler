/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

var globals = require('../globals');
var scriptLog = require('./scriptlog.js');
var qrs_util = require('../qrs_util');

const nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
var expressHandlebars = require('express-handlebars');
const handlebars = require('handlebars');
const { RateLimiterMemory } = require('rate-limiter-flexible');
var emailValidator = require('email-validator');

var rateLimiterMemoryFailedReloads = undefined,
    rateLimiterMemoryAbortedReloads = undefined;

if (globals.config.has('Butler.emailNotification.reloadTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({ points: 1, duration: globals.config.get('Butler.emailNotification.reloadTaskFailure.rateLimit') });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.reloadTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.reloadTaskAborted.rateLimit'),
    });
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
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.includeAll') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.user') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.excludeOwner.user') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.headScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.tailScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.priority') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.subject') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.bodyFileDirectory') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.htmlTemplateFile') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.fromAdress') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.toAdress') ||
            globals.config.get('Butler.emailNotification.reloadTaskFailure.toAdress').length == 0
        ) {
            // Not enough info in config file
            globals.logger.error('SMTP: Reload failure email config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.emailNotification.reloadTaskFailure.enable')) {
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
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.includeAll') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.user') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.excludeOwner.user') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.headScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.tailScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.priority') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.subject') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.bodyFileDirectory') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.htmlTemplateFile') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.fromAdress') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.toAdress') ||
            globals.config.get('Butler.emailNotification.reloadTaskAborted.toAdress').length == 0
        ) {
            // Not enough info in config file
            globals.logger.error('SMTP: Reload aborted email config info missing in Butler config file');
            return false;
        } else if (!globals.config.get('Butler.emailNotification.reloadTaskAborted.enable')) {
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

async function sendEmail(from, recipientsEmail, emailPriority, subjectHandlebars, viewPath, bodyFileHandlebars, templateContext) {
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
            viewPath: viewPath ,
        });

        // Attach the template plugin to the nodemailer transporter
        transporter.use('compile', sut);

        // Process subject template
        const subjectTemplate = handlebars.compile(subjectHandlebars);
        let subject = subjectTemplate(templateContext);

        // Loop over all email recipients
        for (const recipientEmail of recipientsEmail) {
            // Verify that email address is valid
            if (emailValidator.validate(recipientEmail) == true) {
                // Recipient email address has valid format
                // Set up mail object
                let message = {
                    priority: emailPriority,
                    from: from,
                    to: recipientEmail,
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
            } else {
                globals.logger.warn(`SMTP: Recipient email adress not valid: ${recipientEmail}`);
            }
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
                globals.logger.debug(`SMTPFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                if (isSmtpConfigOk() == false) {
                    return 1;
                }

                if (isEmailReloadFailedNotificationConfigOk() == false) {
                    return 1;
                }

                // Get script logs, if enabled in the config file
                let scriptLogData = await scriptLog.getScriptLog(
                    reloadParams.taskId,
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.headScriptLogLines'),
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.tailScriptLogLines'),
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
                    qlikSenseQMC: senseUrls.qmcUrl,
                    qlikSenseHub: senseUrls.hubUrl,
                };
                // If enabled in config file: Add app owners to list of recipients
                let recipientEmails = [];
                if (globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.enable') == true) {
                    // App owners (at least some of them - maybe all) should get notification email
                    let appOwner = await qrs_util.getAppOwner.getAppOwner(reloadParams.appId);

                    if (globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.includeOwner.includeAll') == true) {
                        // All app owners should get notification email. Disregard any include and exclude lists. 
                        recipientEmails = appOwner.emails;                        
                    } else {
                        // Is app owner on include list, i.e. list of app owners that should get notification emails?
                        let includeUsers = globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.includeOwner.user');
                        let matchUsers = includeUsers.filter(user => (user.directory == appOwner.directory) && (user.userId == appOwner.userId));
                        if (matchUsers.length > 0) {
                            // App owner is in list of included users
                            recipientEmails = appOwner.emails;
                        } else {
                            recipientEmails = [];
                        }
                    }

                    // Now evaluate the exclude list, if there is one
                    let excludeUsers = globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.excludeOwner.user');
                    let matchUsers = excludeUsers.filter(user => (user.directory == appOwner.directory) && (user.userId == appOwner.userId));
                    if (matchUsers.length > 0) {
                        // App owner is in list of users to exclude from receiving notification emails
                        recipientEmails = [];
                    } else {
                        recipientEmails = appOwner.emails;
                    }
                }


                sendEmail(
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.fromAdress'),
                    recipientEmails.concat(globals.config.get('Butler.emailNotification.reloadTaskFailure.toAdress')),
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.priority'),
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.subject'),
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.bodyFileDirectory'),
                    globals.config.get('Butler.emailNotification.reloadTaskFailure.htmlTemplateFile'),
                    templateContext,
                );
            } catch (err) {
                globals.logger.error(`SMTPFAILED: ${err}`);
            }
        })
        .catch(rateLimiterRes => {
            globals.logger.verbose(`SMTPFAILED: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}"`);
            globals.logger.debug(`SMTPFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
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
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.headScriptLogLines'),
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.tailScriptLogLines'),
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
                    qlikSenseQMC: senseUrls.qmcUrl,
                    qlikSenseHub: senseUrls.hubUrl,
                };

                // If enabled in config file: Add app owners to list of recipients
                let recipientEmails = [];
                if (globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.enable') == true) {
                    // App owners (at least some of them - maybe all) should get notification email
                    let appOwner = await qrs_util.getAppOwner.getAppOwner(reloadParams.appId);

                    if (globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.includeAll') == true) {
                        // All app owners should get notification email. Disregard any include and exclude lists. 
                        recipientEmails = appOwner.emails;                        
                    } else {
                        // Is app owner on include list, i.e. list of app owners that should get notification emails?
                        let includeUsers = globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.user');
                        let matchUsers = includeUsers.filter(user => (user.directory == appOwner.directory) && (user.userId == appOwner.userId));
                        if (matchUsers.length > 0) {
                            // App owner is in list of included users
                            recipientEmails = appOwner.emails;
                        } else {
                            recipientEmails = [];
                        }
                    }

                    // Now evaluate the exclude list, if there is one
                    let excludeUsers = globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.excludeOwner.user');
                    let matchUsers = excludeUsers.filter(user => (user.directory == appOwner.directory) && (user.userId == appOwner.userId));
                    if (matchUsers.length > 0) {
                        // App owner is in list of users to exclude from receiving notification emails
                        recipientEmails = [];
                    } else {
                        recipientEmails = appOwner.emails;
                    }
                }

                // Note: Butler.emailNotification.reloadTaskAborted.toAdress is an array, sendEmail() should send individual emails to everyone in that array
                sendEmail(
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.fromAdress'),
                    recipientEmails.concat(globals.config.get('Butler.emailNotification.reloadTaskAborted.toAdress')),
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.priority')
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.subject'),
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.bodyFileDirectory'),
                    globals.config.get('Butler.emailNotification.reloadTaskAborted.htmlTemplateFile'),
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
