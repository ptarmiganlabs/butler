/* eslint-disable consistent-return */
import nodemailer from 'nodemailer';

import hbs from 'nodemailer-express-handlebars';
import expressHandlebars from 'express-handlebars';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import emailValidator from 'email-validator';
import globals from '../globals.js';
import { getTaskCustomPropertyValues, isCustomPropertyValueSet } from '../qrs_util/task_cp_util.js';
import getAppOwner from '../qrs_util/get_app_owner.js';


let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;
let rateLimiterMemoryServiceMonitor;

if (globals.config.has('Butler.emailNotification.reloadTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.reloadTaskFailure.rateLimit'),
    });
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

if (globals.config.has('Butler.emailNotification.serviceStopped.rateLimit')) {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.serviceStopped.rateLimit'),
    });
} else {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({ points: 1, duration: 300 });
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
            globals.logger.error('EMAIL CONFIG: Email config info missing in Butler config file');
            return false;
        }
        if (!globals.config.get('Butler.emailNotification.enable')) {
            // SMTP is disabled
            globals.logger.error("EMAIL CONFIG: SMTP notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`EMAIL CONFIG: ${err}`);
        return false;
    }
}

function isEmailReloadFailedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.includeOwner.includeAll') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.includeOwner.user') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.excludeOwner.user') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.headScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.tailScriptLogLines') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.priority') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.subject') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.bodyFileDirectory') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.htmlTemplateFile') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.fromAdress') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.recipients') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enabledValue') ||
            !globals.config.has('Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName')
        ) {
            // Not enough info in config file
            globals.logger.error('EMAIL CONFIG: Reload failure email config info missing in Butler config file');
            return false;
        }
        if (!globals.config.get('Butler.emailNotification.reloadTaskFailure.enable')) {
            // SMTP is disabled
            globals.logger.error("EMAIL CONFIG: Reload failure email notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`EMAIL CONFIG: ${err}`);
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
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.recipients') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enable') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enabledValue') ||
            !globals.config.has('Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName')
        ) {
            // Not enough info in config file
            globals.logger.error('EMAIL CONFIG: Reload aborted email config info missing in Butler config file');
            return false;
        }
        if (!globals.config.get('Butler.emailNotification.reloadTaskAborted.enable')) {
            // SMTP is disabled
            globals.logger.error("EMAIL CONFIG: Reload aborted email notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`EMAIL CONFIG: ${err}`);
        return false;
    }
}

function isEmailServiceMonitorNotificationConfig() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.has('Butler.serviceMonitor.enable') ||
            !globals.config.has('Butler.serviceMonitor.alertDestination.email.enable') ||
            !globals.config.has('Butler.emailNotification.serviceStopped.priority') ||
            !globals.config.has('Butler.emailNotification.serviceStopped.subject') ||
            !globals.config.has('Butler.emailNotification.serviceStopped.bodyFileDirectory') ||
            !globals.config.has('Butler.emailNotification.serviceStopped.htmlTemplateFile') ||
            !globals.config.has('Butler.emailNotification.serviceStopped.fromAdress') ||
            !globals.config.has('Butler.emailNotification.serviceStopped.recipients')
        ) {
            // Not enough info in config file
            globals.logger.error('EMAIL CONFIG: service monitor email config info missing in Butler config file');
            return false;
        }
        if (
            !globals.config.get('Butler.serviceMonitor.enable') ||
            !globals.config.get('Butler.serviceMonitor.alertDestination.email.enable')
        ) {
            // SMTP is disabled
            globals.logger.error("EMAIL CONFIG: Service monitor email notifications are disabled in config file - won't send email");
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`EMAIL CONFIG: ${err}`);
        return false;
    }
}

function getSmtpOptions() {
    const smtpOptions = {
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
    let qmcUrl = '';
    let hubUrl = '';

    if (globals.config.has('Butler.qlikSenseUrls.qmc')) {
        qmcUrl = globals.config.get('Butler.qlikSenseUrls.qmc');
    }

    if (globals.config.has('Butler.qlikSenseUrls.hub')) {
        hubUrl = globals.config.get('Butler.qlikSenseUrls.hub');
    }

    return { qmcUrl, hubUrl };
}

async function sendEmail(from, recipientsEmail, emailPriority, subjectHandlebars, viewPath, bodyFileHandlebars, templateContext) {
    try {
        // First make sure email sending is enabled in the config file and that we have all required SMTP settings
        if (isSmtpConfigOk() === false) {
            return 1;
        }

        const smtpOptions = getSmtpOptions();
        const transporter = nodemailer.createTransport(smtpOptions);

        const viewEngine = expressHandlebars.create({
            partialsDir: 'partials/',
            defaultLayout: false,
        });

        const sut = hbs({
            viewEngine,
            viewPath,
        });

        // Attach the template plugin to the nodemailer transporter
        transporter.use('compile', sut);

        // Process subject template
        const subjectTemplate = handlebars.compile(subjectHandlebars);
        const subject = subjectTemplate(templateContext);

        // Loop over all email recipients
        // eslint-disable-next-line no-restricted-syntax
        for (const recipientEmail of recipientsEmail) {
            // Verify that email address is valid
            if (emailValidator.validate(recipientEmail) === true) {
                // Recipient email address has valid format
                // Set up mail object
                const message = {
                    priority: emailPriority,
                    from,
                    to: recipientEmail,
                    subject,
                    template: bodyFileHandlebars,
                    context: templateContext,
                };

                // Verify SMTP configuration
                // eslint-disable-next-line no-await-in-loop
                const smtpStatus = await transporter.verify();
                globals.logger.debug(`EMAIL CONFIG: SMTP status: ${smtpStatus}`);
                globals.logger.debug(`EMAIL CONFIG: Message=${JSON.stringify(message, null, 2)}`);

                if (smtpStatus) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = await transporter.sendMail(message);
                    globals.logger.debug(`EMAIL CONFIG: Sending reload failure notification result: ${JSON.stringify(result, null, 2)}`);
                } else {
                    globals.logger.warn('EMAIL CONFIG: SMTP transporter not ready');
                }
            } else {
                globals.logger.warn(`EMAIL CONFIG: Recipient email adress not valid: ${recipientEmail}`);
            }
        }
    } catch (err) {
        globals.logger.error(`EMAIL CONFIG: ${err}`);
    }
}

export async function sendEmailBasic(from, recipientsEmail, emailPriority, subject, body) {
    try {
        // First make sure email sending is enabled in the config file and that we have all required SMTP settings
        if (isSmtpConfigOk() === false) {
            return 1;
        }

        const smtpOptions = getSmtpOptions();
        const transporter = nodemailer.createTransport(smtpOptions);

        // Loop over all email recipients
        // eslint-disable-next-line no-restricted-syntax
        for (const recipientEmail of recipientsEmail) {
            // Verify that email address is valid
            if (emailValidator.validate(recipientEmail) === true) {
                // Recipient email address has valid format
                // Set up mail object
                const message = {
                    priority: emailPriority,
                    from,
                    to: recipientEmail,
                    subject,
                    text: body,
                };

                // Verify SMTP configuration
                // eslint-disable-next-line no-await-in-loop
                const smtpStatus = await transporter.verify();
                globals.logger.debug(`SMTP BASIC: SMTP status: ${smtpStatus}`);
                globals.logger.debug(`SMTP BASIC: Message=${JSON.stringify(message, null, 2)}`);

                if (smtpStatus) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = await transporter.sendMail(message);
                    globals.logger.debug(`SMTP BASIC: Sending email result: ${JSON.stringify(result, null, 2)}`);
                } else {
                    globals.logger.warn('SMTP BASIC: SMTP transporter not ready');
                }
            } else {
                globals.logger.warn(`SMTP BASIC: Recipient email adress not valid: ${recipientEmail}`);
            }
        }
    } catch (err) {
        globals.logger.error(`SMTP BASIC: ${err}`);
    }
}

export async function sendReloadTaskFailureNotificationEmail(reloadParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all failed tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName
    //    is set for the failed task, alerts should be sent to all emails in that CP

    // 1 Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    // 2 Should alert emails be sent for all failed reload tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the failed reload task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recpients to send list
    // 3 Should app owners get alerts?
    // 3.1 Yes: Should all app owners get alerts?
    // 3.1.1 Yes: Add app owners' email addresses to app owner send list
    // 3.1.2 No : Add list of specified app owners' email addresses to app owner send list
    // 3.2 Is there an app owner exclude list?
    // 3.2.1 Yes: Remove entries on the exclude list from app owner send list
    // 3.3 Add app owner send list to main send list
    // 4 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName'
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enabledValue'
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName'
    );
    const globalSendList = globals.config.get('Butler.emailNotification.reloadTaskFailure.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [], appOwner: [] };

    // 1. Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        reloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `EMAIL RELOAD TASK FAILED ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all failed reload tasks?
    if (globals.config.get('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`EMAIL RELOAD TASK FAILED ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `EMAIL RELOAD TASK FAILED ALERT: Added global send list for failed task: ${JSON.stringify(globalSendList, null, 2)}`
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the failed task has email alerts enabled
        // 2.2 No : Does the failed reload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `EMAIL RELOAD TASK FAILED ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`
        );

        const sendAlert = await isCustomPropertyValueSet(reloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `EMAIL RELOAD TASK FAILED ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`
            );
            // 2.2.1 Yes: Add system-wide list of recipients to send list
            if (globalSendList?.length > 0) {
                mainSendList = mainSendList.concat(globalSendList);
                emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
            }
        } else {
            // 2.2.2 No : Don't add recpients to send list
        }
    }

    // Get app owner
    const appOwner = await getAppOwner(reloadParams.appId);

    // If enabled in config file: Add app owners (excluding those that don't have an email address!) to list of recipients
    // 3 Should app owners get alerts?
    if (globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.enable') === true) {
        // App owners (at least some of them - maybe all) should get notification email
        // 3.1 Yes: Should all app owners get alerts?
        let appOwnerSendList = [];

        // If the current app's owner doesn't have an email address there is nothing to do
        if (appOwner.emails.length > 0) {
            if (globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.includeOwner.includeAll') === true) {
                // 3.1.1 Yes: Add app owners' email addresses to app owner send list
                appOwnerSendList.push({
                    email: appOwner.emails,
                    directory: appOwner.directory,
                    userId: appOwner.userId,
                });
            } else {
                // Is app owner on include list, i.e. list of app owners that should get notification emails?
                // 3.1.2 No : Add list of specified app owners' email addresses to app owner send list
                const includeUsers = globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.includeOwner.user');
                const matchUsers = includeUsers?.filter((user) => user.directory === appOwner.directory && user.userId === appOwner.userId);
                if (matchUsers?.length > 0) {
                    // App owner is in list of included users. Add to app owner send list.
                    appOwnerSendList.push({
                        email: appOwner.emails,
                        directory: appOwner.directory,
                        userId: appOwner.userId,
                    });
                } else {
                    // No app owners on include list. Warn about this.
                    globals.logger.warn(
                        `EMAIL RELOAD TASK FAILED ALERT: No app owners on include list for failed task. No app owners will receive notification emails.`
                    );
                }
            }

            // Now evaluate the app owner exclude list
            // 3.2 Is there an app owner exclude list?
            const excludeUsers = globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.excludeOwner.user');
            const matchExcludedUsers = excludeUsers?.filter(
                (user) => user.directory === appOwner.directory && user.userId === appOwner.userId
            );
            if (matchExcludedUsers?.length > 0) {
                // App owner is in list of app owners that should NOT receive notification emails
                // Remove app owner email address from app owner send list (if it's already there)
                // 3.2.1 Yes: Remove entries on the exclude list from app owner send list
                appOwnerSendList = appOwnerSendList?.filter(
                    (user) => user.directory !== appOwner.directory && user.userId !== appOwner.userId
                );
            }
            // 3.3 Add app owner send list to main send list
            const appOwnerSendListEmails = appOwnerSendList?.map((item) => item.email);
            if (appOwnerSendListEmails?.length > 0) {
                mainSendList = mainSendList?.concat(appOwnerSendListEmails[0]);
                emailRecipientsVerbose.appOwner = emailRecipientsVerbose.appOwner.concat(appOwnerSendListEmails[0]);
            }

            // Does the main sendlist contain any email addresses? Warn if not
            if (mainSendList?.length === 0) {
                globals.logger.warn(
                    `EMAIL RELOAD TASK FAILED ALERT: No email addresses defined for app owner's alert email for app "${reloadParams.appName}", ID=${reloadParams.appId}`
                );
            }
        } else {
            globals.logger.warn(
                `EMAIL RELOAD TASK FAILED ALERT: No email address for owner of app "${reloadParams.appName}", ID=${reloadParams.appId}`
            );
        }
    }

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // Debug
    globals.logger.verbose(
        `EMAIL RELOAD TASK FAILED ALERT: Final send list for failed task "${reloadParams.taskName}": ${JSON.stringify(
            mainSendListUnique,
            null,
            2
        )}`
    );
    globals.logger.verbose(`EMAIL RELOAD TASK FAILED ALERT: App owner recipients: ${emailRecipientsVerbose.appOwner}`);
    globals.logger.verbose(`EMAIL RELOAD TASK FAILED ALERT: Shared all tasks recipients: ${emailRecipientsVerbose.shared}`);
    globals.logger.verbose(`EMAIL RELOAD TASK FAILED ALERT: Task specific recipients: ${emailRecipientsVerbose.taskSpecific}`);

    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailReloadFailedNotificationConfigOk() === false) {
        return 1;
    }

    // Get script logs, if enabled in the config file
    const scriptLogData = reloadParams.scriptLog;

    // Reduce script log lines to only the ones we want to send in email
    scriptLogData.scriptLogHeadCount = globals.config.get('Butler.emailNotification.reloadTaskFailure.headScriptLogLines');
    scriptLogData.scriptLogTailCount = globals.config.get('Butler.emailNotification.reloadTaskFailure.tailScriptLogLines');

    if (scriptLogData?.scriptLogFull?.length > 0) {
        scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

        scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
            .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
            .join('\r\n');
    } else {
        scriptLogData.scriptLogHead = '';
        scriptLogData.scriptLogTail = '';
    }

    globals.logger.debug(`EMAIL RELOAD TASK FAILED ALERT: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // These are the template fields that can be used in email subject and body
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
        scriptLogSize: scriptLogData.scriptLogSize,
        scriptLogHead: scriptLogData.scriptLogHead,
        scriptLogTail: scriptLogData.scriptLogTail,
        scriptLogTailCount: scriptLogData.scriptLogTailCount,
        scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        appOwnerName: appOwner.userName,
        appOwnerUserId: appOwner.userId,
        appOwnerUserDirectory: appOwner.directory,
        appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemoryFailedReloads
            .consume(`${reloadParams.taskId}|${recipientEmailAddress}`, 1)
            // eslint-disable-next-line no-loop-func
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `EMAIL RELOAD TASK FAILED ALERT: Rate limiting check passed for failed task notification. Task name: "${reloadParams.taskName}", Recipient: "${recipientEmailAddress}"`
                    );
                    globals.logger.debug(
                        `EMAIL RELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.fromAdress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.priority'),
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.subject'),
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.htmlTemplateFile'),
                            templateContext
                        );
                    } else {
                        globals.logger.warn(`EMAIL RELOAD TASK FAILED ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`EMAIL RELOAD TASK FAILED ALERT: ${err}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `EMAIL RELOAD TASK FAILED ALERT: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}" to "${recipientEmailAddress}"`
                );
                globals.logger.debug(`EMAIL RELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}

export async function sendReloadTaskAbortedNotificationEmail(reloadParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all aborted tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName
    //    is set for the aborted task, alerts should be sent to all emails in that CP

    // 1 Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    // 2 Should alert emails be sent for all aborted reload tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the aborted reload task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recpients to send list
    // 3 Should app owners get alerts?
    // 3.1 Yes: Should all app owners get alerts?
    // 3.1.1 Yes: Add app owners' email addresses to app owner send list
    // 3.1.2 No : Add list of specified app owners' email addresses to app owner send list
    // 3.2 Is there an app owner exclude list?
    // 3.2.1 Yes: Remove entries on the exclude list from app owner send list
    // 3.3 Add app owner send list to main send list
    // 4 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName'
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enabledValue'
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName'
    );
    const globalSendList = globals.config.get('Butler.emailNotification.reloadTaskAborted.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [], appOwner: [] };

    // 1. Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        reloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `EMAIL RELOAD TASK ABORTED ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all aborted reload tasks?
    if (globals.config.get('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`EMAIL RELOAD TASK ABORTED ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `EMAIL RELOAD TASK ABORTED ALERT: Added global send list for failed task: ${JSON.stringify(globalSendList, null, 2)}`
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the aborted task has email alerts enabled
        // 2.2 No : Does the aborted reload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `EMAIL RELOAD TASK ABORTED ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`
        );

        const sendAlert = await isCustomPropertyValueSet(reloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `EMAIL RELOAD TASK ABORTED ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`
            );
            // 2.2.1 Yes: Add system-wide list of recipients to send list
            if (globalSendList?.length > 0) {
                mainSendList = mainSendList.concat(globalSendList);
                emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
            }
        } else {
            // 2.2.2 No : Don't add recpients to send list
        }
    }

    // Get app owner
    const appOwner = await getAppOwner(reloadParams.appId);

    // If enabled in config file: Add app owners (excluding those that don't have an email address!) to list of recipients
    // 3 Should app owners get alerts?
    if (globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.enable') === true) {
        // App owners (at least some of them - maybe all) should get notification email
        // 3.1 Yes: Should all app owners get alerts?
        let appOwnerSendList = [];

        // If the current app's owner doesn't have an email address there is nothing to do
        if (appOwner.emails.length > 0) {
            if (globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.includeAll') === true) {
                // 3.1.1 Yes: Add app owners' email addresses to app owner send list
                appOwnerSendList.push({
                    email: appOwner.emails,
                    directory: appOwner.directory,
                    userId: appOwner.userId,
                });
            } else {
                // Is app owner on include list, i.e. list of app owners that should get notification emails?
                // 3.1.2 No : Add list of specified app owners' email addresses to app owner send list
                const includeUsers = globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.includeOwner.user');
                const matchUsers = includeUsers?.filter((user) => user.directory === appOwner.directory && user.userId === appOwner.userId);
                if (matchUsers?.length > 0) {
                    // App owner is in list of included users. Add to app owner send list.
                    appOwnerSendList.push({
                        email: appOwner.emails,
                        directory: appOwner.directory,
                        userId: appOwner.userId,
                    });
                }
            }

            // Now evaluate the app owner exclude list
            // 3.2 Is there an app owner exclude list?
            const excludeUsers = globals.config.get('Butler.emailNotification.reloadTaskAborted.appOwnerAlert.excludeOwner.user');
            const matchExcludedUsers = excludeUsers?.filter(
                (user) => user.directory === appOwner.directory && user.userId === appOwner.userId
            );
            if (matchExcludedUsers?.length > 0) {
                // App owner is in list of app owners that should NOT receive notification emails
                // Remove app owner email address from app owner send list (if it's already there)
                // 3.2.1 Yes: Remove entries on the exclude list from app owner send list
                appOwnerSendList = appOwnerSendList?.filter(
                    (user) => user.directory !== appOwner.directory && user.userId !== appOwner.userId
                );
            }
            // 3.3 Add app owner send list to main send list
            const appOwnerSendListEmails = appOwnerSendList?.map((item) => item.email);
            if (appOwnerSendListEmails?.length > 0) {
                mainSendList = mainSendList?.concat(appOwnerSendListEmails[0]);
                emailRecipientsVerbose.appOwner = emailRecipientsVerbose.appOwner.concat(appOwnerSendListEmails[0]);
            }

            // Does the main sendlist contain any email addresses? Warn if not
            if (mainSendList?.length === 0) {
                globals.logger.warn(
                    `EMAIL RELOAD TASK ABORTED ALERT: No email addresses defined for alert email to app "${reloadParams.appName}", ID=${reloadParams.appId}`
                );
            }
        } else {
            globals.logger.warn(
                `EMAIL RELOAD TASK ABORTED ALERT: No email address for owner of app "${reloadParams.appName}", ID=${reloadParams.appId}`
            );
        }
    }

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // Debug
    globals.logger.verbose(
        `EMAIL RELOAD TASK ABORTED ALERT: Final send list for failed task "${reloadParams.taskName}": ${JSON.stringify(
            mainSendListUnique,
            null,
            2
        )}`
    );
    globals.logger.verbose(`EMAIL RELOAD TASK ABORTED ALERT: App owner recipients: ${emailRecipientsVerbose.appOwner}`);
    globals.logger.verbose(`EMAIL RELOAD TASK ABORTED ALERT: Shared all tasks recipients: ${emailRecipientsVerbose.shared}`);
    globals.logger.verbose(`EMAIL RELOAD TASK ABORTED ALERT: Task specific recipients: ${emailRecipientsVerbose.taskSpecific}`);

    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailReloadAbortedNotificationConfigOk() === false) {
        return 1;
    }

    // Get script logs, if enabled in the config file
    const scriptLogData = reloadParams.scriptLog;

    // Reduce script log lines to only the ones we want to send in email
    scriptLogData.scriptLogHeadCount = globals.config.get('Butler.emailNotification.reloadTaskAborted.headScriptLogLines');
    scriptLogData.scriptLogTailCount = globals.config.get('Butler.emailNotification.reloadTaskAborted.tailScriptLogLines');

    if (scriptLogData?.scriptLogFull?.length > 0) {
        scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

        scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
            .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
            .join('\r\n');
    } else {
        scriptLogData.scriptLogHead = '';
        scriptLogData.scriptLogTail = '';
    }

    globals.logger.debug(`EMAIL RELOAD TASK ABORTED ALERT: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // These are the template fields that can be used in email subject and body
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
        scriptLogSize: scriptLogData.scriptLogSize,
        scriptLogHead: scriptLogData.scriptLogHead,
        scriptLogTail: scriptLogData.scriptLogTail,
        scriptLogTailCount: scriptLogData.scriptLogTailCount,
        scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        appOwnerName: appOwner.userName,
        appOwnerUserId: appOwner.userId,
        appOwnerUserDirectory: appOwner.directory,
        appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemoryAbortedReloads
            .consume(`${reloadParams.taskId}|${recipientEmailAddress}`, 1)
            // eslint-disable-next-line no-loop-func
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `EMAIL RELOAD TASK ABORTED ALERT: Rate limiting check passed for aborted task notification. Task name: "${reloadParams.taskName}", Recipient: "${recipientEmailAddress}"`
                    );
                    globals.logger.debug(
                        `EMAIL RELOAD TASK ABORTED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.fromAdress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.priority'),
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.subject'),
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.htmlTemplateFile'),
                            templateContext
                        );
                    } else {
                        globals.logger.warn(`EMAIL RELOAD TASK ABORTED ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`EMAIL RELOAD TASK ABORTED ALERT: ${err}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `EMAIL RELOAD TASK ABORTED ALERT: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}" to "${recipientEmailAddress}"`
                );
                globals.logger.debug(`EMAIL RELOAD TASK ABORTED ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}

export async function sendServiceMonitorNotificationEmail(serviceParams) {
    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailServiceMonitorNotificationConfig() === false) {
        return 1;
    }

    // These are the template fields that can be used in email subject and body
    const templateContext = {
        host: serviceParams.host,
        serviceStatus: serviceParams.serviceStatus,
        servicePrevStatus: serviceParams.prevState,
        serviceName: serviceParams.serviceName,
        serviceDisplayName: serviceParams.serviceDetails.displayName,
        serviceFriendlyName: serviceParams.serviceFriendlyName,
        serviceStartType: serviceParams.serviceDetails.startType,
        serviceExePath: serviceParams.serviceDetails.exePath,
    };

    let globalSendList;
    if (serviceParams.serviceStatus === 'STOPPED') {
        globalSendList = globals.config.get('Butler.emailNotification.serviceStopped.recipients');
    } else if (serviceParams.serviceStatus === 'RUNNING') {
        globalSendList = globals.config.get('Butler.emailNotification.serviceStarted.recipients');
    }

    let mainSendList = [];

    if (globalSendList?.length > 0) {
        mainSendList = mainSendList.concat(globalSendList);
    } else {
        // Warn there are no recipients to send email to
        globals.logger.warn(`EMAIL SERVICE MONITOR: No recipients to send alert email to.`);
    }

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // eslint-disable-next-line no-restricted-syntax
    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemoryServiceMonitor
            .consume(`${serviceParams.host}|${serviceParams.serviceName}|${recipientEmailAddress}`, 1)
            // eslint-disable-next-line no-loop-func
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `EMAIL SERVICE MONITOR: Rate limiting check passed for service monitor notification. Host: "${serviceParams.host}", service: "${serviceParams.serviceName}", recipient: "${recipientEmailAddress}"`
                    );
                    globals.logger.debug(`EMAIL SERVICE MONITOR: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        if (serviceParams.serviceStatus === 'STOPPED') {
                            sendEmail(
                                globals.config.get('Butler.emailNotification.serviceStopped.fromAdress'),
                                [recipientEmailAddress],
                                globals.config.get('Butler.emailNotification.serviceStopped.priority'),
                                globals.config.get('Butler.emailNotification.serviceStopped.subject'),
                                globals.config.get('Butler.emailNotification.serviceStopped.bodyFileDirectory'),
                                globals.config.get('Butler.emailNotification.serviceStopped.htmlTemplateFile'),
                                templateContext
                            );
                        } else if (serviceParams.serviceStatus === 'RUNNING') {
                            sendEmail(
                                globals.config.get('Butler.emailNotification.serviceStarted.fromAdress'),
                                [recipientEmailAddress],
                                globals.config.get('Butler.emailNotification.serviceStarted.priority'),
                                globals.config.get('Butler.emailNotification.serviceStarted.subject'),
                                globals.config.get('Butler.emailNotification.serviceStarted.bodyFileDirectory'),
                                globals.config.get('Butler.emailNotification.serviceStarted.htmlTemplateFile'),
                                templateContext
                            );
                        }
                    } else {
                        globals.logger.warn(`EMAIL SERVICE MONITOR: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`EMAIL SERVICE MONITOR: ${err}`);
                }
            })
            // eslint-disable-next-line no-loop-func
            .catch((err) => {
                globals.logger.warn(
                    `EMAIL SERVICE MONITOR: Rate limiting failed. Not sending reload notification email for service service "${serviceParams.serviceName}" on host "${serviceParams.host}" to "${recipientEmailAddress}"`
                );
                globals.logger.debug(`EMAIL SERVICE MONITOR: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}
