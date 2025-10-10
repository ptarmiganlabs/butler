/* eslint-disable consistent-return */
import nodemailer from 'nodemailer';

import hbs from 'nodemailer-express-handlebars';
import expressHandlebars from 'express-handlebars';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import emailValidator from 'email-validator';
import globals from '../../globals.js';
import { getTaskCustomPropertyValues, isCustomPropertyValueSet } from '../../qrs_util/task_cp_util.js';
import getAppOwner from '../../qrs_util/get_app_owner.js';
import { getQlikSenseUrls } from './get_qs_urls.js';

let rateLimiterMemorySuccessReloads;
let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;
let rateLimiterMemorySuccessDistribute;
let rateLimiterMemoryFailedDistribute;
let rateLimiterMemoryServiceMonitor;

if (globals.config.has('Butler.emailNotification.reloadTaskSuccess.rateLimit')) {
    rateLimiterMemorySuccessReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.reloadTaskSuccess.rateLimit'),
    });
} else {
    rateLimiterMemorySuccessReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

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

if (globals.config.has('Butler.emailNotification.distributeTaskSuccess.rateLimit')) {
    rateLimiterMemorySuccessDistribute = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.distributeTaskSuccess.rateLimit'),
    });
} else {
    rateLimiterMemorySuccessDistribute = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.distributeTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedDistribute = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.distributeTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedDistribute = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.serviceStopped.rateLimit')) {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.serviceStopped.rateLimit'),
    });
} else {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({ points: 1, duration: 300 });
}

/**
 * Checks if SMTP configuration is valid.
 * @returns {boolean} True if SMTP configuration is valid, false otherwise.
 */
export function isSmtpConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.enable')) {
            // SMTP is disabled
            globals.logger.error('[QSEOW] EMAIL CONFIG: SMTP notifications are disabled in config file - will not send email');
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email reload success notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
function isEmailReloadSuccessNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.reloadTaskSuccess.enable')) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Reload success email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email reload failure notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
function isEmailReloadFailedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.reloadTaskFailure.enable')) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Reload failure email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email reload aborted notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
function isEmailReloadAbortedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.reloadTaskAborted.enable')) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Reload aborted email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email service monitor notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
function isEmailServiceMonitorNotificationConfig() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.get('Butler.serviceMonitor.enable') ||
            !globals.config.get('Butler.serviceMonitor.alertDestination.email.enable')
        ) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Service monitor email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Retrieves SMTP options from the configuration.
 * @returns {object} SMTP options.
 */
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

/**
 * Sends an email using the specified parameters.
 * @param {string} from - Sender email address.
 * @param {string[]} recipientsEmail - Array of recipient email addresses.
 * @param {string} emailPriority - Email priority.
 * @param {string} subjectHandlebars - Handlebars template for the email subject.
 * @param {string} viewPath - Path to the email template.
 * @param {string} bodyFileHandlebars - Handlebars template for the email body.
 * @param {object} templateContext - Context for the Handlebars template.
 * @returns {Promise<void>}
 */
export async function sendEmail(from, recipientsEmail, emailPriority, subjectHandlebars, viewPath, bodyFileHandlebars, templateContext) {
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

        // Register handlebars helper to compare values
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
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
                globals.logger.debug(`[QSEOW] EMAIL CONFIG: SMTP status: ${smtpStatus}`);
                globals.logger.debug(`[QSEOW] EMAIL CONFIG: Message=${JSON.stringify(message, null, 2)}`);

                if (smtpStatus) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = await transporter.sendMail(message);
                    globals.logger.debug(
                        `[QSEOW] EMAIL CONFIG: Sending reload failure notification result: ${JSON.stringify(result, null, 2)}`,
                    );
                } else {
                    globals.logger.warn('[QSEOW] EMAIL CONFIG: SMTP transporter not ready');
                }
            } else {
                globals.logger.warn(`[QSEOW] EMAIL CONFIG: Recipient email adress not valid: ${recipientEmail}`);
            }
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends a basic email using the specified parameters.
 * @param {string} from - Sender email address.
 * @param {string[]} recipientsEmail - Array of recipient email addresses.
 * @param {string} emailPriority - Email priority.
 * @param {string} subject - Email subject.
 * @param {string} body - Email body.
 * @returns {Promise<void>}
 */
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
                globals.logger.debug(`[QSEOW] SMTP BASIC: SMTP status: ${smtpStatus}`);
                globals.logger.debug(`[QSEOW] SMTP BASIC: Message=${JSON.stringify(message, null, 2)}`);

                if (smtpStatus) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = await transporter.sendMail(message);
                    globals.logger.debug(`[QSEOW] SMTP BASIC: Sending email result: ${JSON.stringify(result, null, 2)}`);
                } else {
                    globals.logger.warn('SMTP BASIC: SMTP transporter not ready');
                }
            } else {
                globals.logger.warn(`[QSEOW] SMTP BASIC: Recipient email adress not valid: ${recipientEmail}`);
            }
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] SMTP BASIC: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends a reload task failure notification email.
 * @param {object} reloadParams - Parameters for the reload task.
 * @returns {Promise<void>}
 */
export async function sendReloadTaskFailureNotificationEmail(reloadParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all failed tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName
    //    is set for the failed task, alerts should be sent to all emails in that CP

    // Building the send list:
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
        'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.reloadTaskFailure.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [], appOwner: [] };

    // 1. Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        reloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all failed reload tasks?
    if (globals.config.get('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Added global send list for failed task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the failed task has email alerts enabled
        // 2.2 No : Does the failed reload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(reloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
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
                        `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: No app owners on include list for failed task. No app owners will receive notification emails.`,
                    );
                }
            }

            // Now evaluate the app owner exclude list
            // 3.2 Is there an app owner exclude list?
            const excludeUsers = globals.config.get('Butler.emailNotification.reloadTaskFailure.appOwnerAlert.excludeOwner.user');
            const matchExcludedUsers = excludeUsers?.filter(
                (user) => user.directory === appOwner.directory && user.userId === appOwner.userId,
            );
            if (matchExcludedUsers?.length > 0) {
                // App owner is in list of app owners that should NOT receive notification emails
                // Remove app owner email address from app owner send list (if it's already there)
                // 3.2.1 Yes: Remove entries on the exclude list from app owner send list
                appOwnerSendList = appOwnerSendList?.filter(
                    (user) => user.directory !== appOwner.directory && user.userId !== appOwner.userId,
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
                    `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: No email addresses defined for app owner's alert email for app "${reloadParams.appName}", ID=${reloadParams.appId}`,
                );
            }
        } else {
            globals.logger.warn(
                `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: No email address for owner of app "${reloadParams.appName}", ID=${reloadParams.appId}`,
            );
        }
    }

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // Debug
    globals.logger.verbose(
        `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Final send list for failed task "${reloadParams.taskName}": ${JSON.stringify(
            mainSendListUnique,
            null,
            2,
        )}`,
    );
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: App owner recipients: ${emailRecipientsVerbose.appOwner}`);
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Shared all tasks recipients: ${emailRecipientsVerbose.shared}`);
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Task specific recipients: ${emailRecipientsVerbose.taskSpecific}`);

    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailReloadFailedNotificationConfigOk() === false) {
        return 1;
    }

    // Get script logs, if enabled in the config file
    const scriptLogData = reloadParams.scriptLog;

    // Handle case where scriptLog retrieval failed
    if (scriptLogData === null || scriptLogData === undefined) {
        globals.logger.warn(
            `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Script log data is not available. Email will be sent without script log details.`,
        );
    } else {
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
    }

    globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // Construct URL to the failing app
    // Note that senseUrls.appBaseUrl may or may not end with a slash.
    // Handle both cases.
    let appUrl = '';
    if (senseUrls.appBaseUrl.endsWith('/')) {
        appUrl = `${senseUrls.appBaseUrl}${reloadParams.appId}`;
    } else {
        appUrl = `${senseUrls.appBaseUrl}/${reloadParams.appId}`;
    }

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
    }

    // These are the template fields that can be used in email subject and body
    const templateContext = {
        hostName: reloadParams.hostName,
        user: reloadParams.user,
        taskName: reloadParams.taskName,
        taskId: reloadParams.taskId,
        taskCustomProperties: reloadParams.qs_taskCustomProperties,
        taskTags: reloadParams.qs_taskTags,
        taskIsManuallyTriggered: reloadParams.qs_taskMetadata.isManuallyTriggered,
        taskIsPartialReload: reloadParams.qs_taskMetadata.isPartialReload,
        taskMaxRetries: reloadParams.qs_taskMetadata.maxRetries,
        taskModifiedByUsername: reloadParams.qs_taskMetadata.modifiedByUserName,
        taskModifiedDate: reloadParams.qs_taskMetadata.modifiedDate,
        taskSessionTimeout: reloadParams.qs_taskMetadata.taskSessionTimeout,
        taskNextExecution:
            reloadParams.qs_taskMetadata.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                ? 'Never'
                : reloadParams.qs_taskMetadata.operational.nextExecution,
        appName: reloadParams.appName,
        appId: reloadParams.appId,
        appUrl,
        appDescription: reloadParams.qs_appMetadata?.description,
        appFileSize: reloadParams.qs_appMetadata?.fileSize,
        appLastSuccessfulReload: reloadParams.qs_appMetadata?.lastReloadTime,
        appLastModifiedDate: reloadParams.qs_appMetadata?.modifiedDate,
        appLastModifiedByUserName: reloadParams.qs_appMetadata?.modifiedByUserName,
        appPublishTime: reloadParams.qs_appMetadata?.publishTime,
        appPublished: reloadParams.qs_appMetadata?.published,
        appStreamName: reloadParams.qs_appMetadata?.stream,
        appCustomProperties: reloadParams.qs_appCustomProperties,
        appTags: reloadParams.qs_appTags,
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
        scriptLogSizeRows: scriptLogData.scriptLogSizeRows,
        scriptLogSizeCharacters: scriptLogData.scriptLogSizeCharacters,
        scriptLogHead: scriptLogData.scriptLogHead,
        scriptLogTail: scriptLogData.scriptLogTail,
        scriptLogTailCount: scriptLogData.scriptLogTailCount,
        scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        genericUrls,
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
                        `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Rate limiting check passed for failed task notification. Task name: "${reloadParams.taskName}", Recipient: "${recipientEmailAddress}"`,
                    );
                    globals.logger.debug(
                        `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.priority'),
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.subject'),
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.reloadTaskFailure.htmlTemplateFile'),
                            templateContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}

/**
 * Sends a reload task aborted notification email.
 * @param {object} reloadParams - Parameters for the reload task.
 * @returns {Promise<void>}
 */
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
        'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.reloadTaskAborted.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [], appOwner: [] };

    // 1. Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        reloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all aborted reload tasks?
    if (globals.config.get('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Added global send list for failed task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the aborted task has email alerts enabled
        // 2.2 No : Does the aborted reload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(reloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
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
                (user) => user.directory === appOwner.directory && user.userId === appOwner.userId,
            );
            if (matchExcludedUsers?.length > 0) {
                // App owner is in list of app owners that should NOT receive notification emails
                // Remove app owner email address from app owner send list (if it's already there)
                // 3.2.1 Yes: Remove entries on the exclude list from app owner send list
                appOwnerSendList = appOwnerSendList?.filter(
                    (user) => user.directory !== appOwner.directory && user.userId !== appOwner.userId,
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
                    `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: No email addresses defined for alert email to app "${reloadParams.appName}", ID=${reloadParams.appId}`,
                );
            }
        } else {
            globals.logger.warn(
                `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: No email address for owner of app "${reloadParams.appName}", ID=${reloadParams.appId}`,
            );
        }
    }

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // Debug
    globals.logger.verbose(
        `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Final send list for failed task "${reloadParams.taskName}": ${JSON.stringify(
            mainSendListUnique,
            null,
            2,
        )}`,
    );
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: App owner recipients: ${emailRecipientsVerbose.appOwner}`);
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Shared all tasks recipients: ${emailRecipientsVerbose.shared}`);
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Task specific recipients: ${emailRecipientsVerbose.taskSpecific}`);

    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailReloadAbortedNotificationConfigOk() === false) {
        return 1;
    }

    // Get script logs, if enabled in the config file
    const scriptLogData = reloadParams.scriptLog;

    // Handle case where scriptLog retrieval failed
    if (scriptLogData === null || scriptLogData === undefined) {
        globals.logger.warn(
            `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Script log data is not available. Email will be sent without script log details.`,
        );
    } else {
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
    }

    globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // Construct URL to the failing app
    // Note that senseUrls.appBaseUrl may or may not end with a slash.
    // Handle both cases.
    let appUrl = '';
    if (senseUrls.appBaseUrl.endsWith('/')) {
        appUrl = `${senseUrls.appBaseUrl}${reloadParams.appId}`;
    } else {
        appUrl = `${senseUrls.appBaseUrl}/${reloadParams.appId}`;
    }

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
    }

    // These are the template fields that can be used in email subject and body
    const templateContext = {
        hostName: reloadParams.hostName,
        user: reloadParams.user,
        taskName: reloadParams.taskName,
        taskId: reloadParams.taskId,
        taskCustomProperties: reloadParams.qs_taskCustomProperties,
        taskTags: reloadParams.qs_taskTags,
        taskIsManuallyTriggered: reloadParams.qs_taskMetadata.isManuallyTriggered,
        taskIsPartialReload: reloadParams.qs_taskMetadata.isPartialReload,
        taskMaxRetries: reloadParams.qs_taskMetadata.maxRetries,
        taskModifiedByUsername: reloadParams.qs_taskMetadata.modifiedByUserName,
        taskModifiedDate: reloadParams.qs_taskMetadata.modifiedDate,
        taskSessionTimeout: reloadParams.qs_taskMetadata.taskSessionTimeout,
        taskNextExecution:
            reloadParams.qs_taskMetadata.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                ? 'Never'
                : reloadParams.qs_taskMetadata.operational.nextExecution,
        appName: reloadParams.appName,
        appId: reloadParams.appId,
        appUrl,
        appDescription: reloadParams.qs_appMetadata?.description,
        appFileSize: reloadParams.qs_appMetadata?.fileSize,
        appLastSuccessfulReload: reloadParams.qs_appMetadata?.lastReloadTime,
        appLastModifiedDate: reloadParams.qs_appMetadata?.modifiedDate,
        appLastModifiedByUserName: reloadParams.qs_appMetadata?.modifiedByUserName,
        appPublishTime: reloadParams.qs_appMetadata?.publishTime,
        appPublished: reloadParams.qs_appMetadata?.published,
        appStreamName: reloadParams.qs_appMetadata?.stream,
        appCustomProperties: reloadParams.qs_appCustomProperties,
        appTags: reloadParams.qs_appTags,
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
        scriptLogSizeRows: scriptLogData.scriptLogSizeRows,
        scriptLogSizeCharacters: scriptLogData.scriptLogSizeCharacters,
        scriptLogHead: scriptLogData.scriptLogHead,
        scriptLogTail: scriptLogData.scriptLogTail,
        scriptLogTailCount: scriptLogData.scriptLogTailCount,
        scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        genericUrls,
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
                        `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Rate limiting check passed for aborted task notification. Task name: "${reloadParams.taskName}", Recipient: "${recipientEmailAddress}"`,
                    );
                    globals.logger.debug(
                        `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.priority'),
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.subject'),
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.reloadTaskAborted.htmlTemplateFile'),
                            templateContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK ABORTED ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}

/**
 * Sends a distribute task failure notification email.
 * @param {object} distributeParams - Parameters for the distribute task.
 * @returns {Promise<void>}
 */
export async function sendDistributeTaskFailureNotificationEmail(distributeParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.distributeTaskFailure.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all failed distribute tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.distributeTaskFailure.alertEnabledByEmailAddress.customPropertyName
    //    is set for the failed task, alerts should be sent to all emails in that CP

    // Building the send list:
    // 1 Add task-specific notification email addresses (set via custom property on distribute tasks) to send list.
    // 2 Should alert emails be sent for all failed distribute tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the failed distribute task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recipients to send list
    // 3 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.distributeTaskFailure.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.distributeTaskFailure.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.distributeTaskFailure.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.distributeTaskFailure.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [] };

    // 1. Add task-specific notification email addresses (set via custom property on distribute tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        distributeParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all failed distribute tasks?
    if (globals.config.get('Butler.emailNotification.distributeTaskFailure.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Added global send list for failed task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the failed task has email alerts enabled
        // 2.2 No : Does the failed distribute task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(distributeParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            // 2.2.1 Yes: Add system-wide list of recipients to send list
            if (globalSendList?.length > 0) {
                mainSendList = mainSendList.concat(globalSendList);
                emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
            }
        } else {
            // 2.2.2 No : Don't add recipients to send list
        }
    }

    // 3 Remove any duplicate recipients in send list
    mainSendList = [...new Set(mainSendList)];

    globals.logger.verbose(`[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Reduced email send list: ${JSON.stringify(mainSendList, null, 2)}`);

    globals.logger.debug(
        `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Email recipients:\n${JSON.stringify(emailRecipientsVerbose, null, 2)}`,
    );

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
    }

    // These are the template fields that can be used in email subject and body
    const templateContext = {
        hostName: distributeParams.hostName,
        user: distributeParams.user,
        taskName: distributeParams.taskName,
        taskId: distributeParams.taskId,
        taskCustomProperties: distributeParams.qs_taskCustomProperties,
        taskTags: distributeParams.qs_taskTags,
        taskIsManuallyTriggered: distributeParams.qs_taskMetadata?.isManuallyTriggered,
        taskMaxRetries: distributeParams.qs_taskMetadata?.maxRetries,
        taskModifiedByUsername: distributeParams.qs_taskMetadata?.modifiedByUserName,
        taskModifiedDate: distributeParams.qs_taskMetadata?.modifiedDate,
        taskSessionTimeout: distributeParams.qs_taskMetadata?.taskSessionTimeout,
        taskNextExecution:
            distributeParams.qs_taskMetadata?.operational?.nextExecution === '1753-01-01T00:00:00.000Z'
                ? 'Never'
                : distributeParams.qs_taskMetadata?.operational?.nextExecution,
        executionStatusNum: distributeParams.executionStatusNum,
        executionStatusText: distributeParams.executionStatusText,
        logTimeStamp: distributeParams.logTimeStamp,
        logLevel: distributeParams.logLevel,
        logMessage: distributeParams.logMessage,
        executionId: distributeParams.executionId,
        executionDetails: distributeParams.executionDetails,
        executionDetailsConcatenated: distributeParams.executionDetailsConcatenated,
        executionDuration: distributeParams.executionDuration,
        executionStartTime: distributeParams.executionStartTime,
        executionStopTime: distributeParams.executionStopTime,
        executingNodeName: distributeParams.executingNodeName,
        qlikSenseQMC: senseUrls?.qmcUrl,
        qlikSenseHub: senseUrls?.hubUrl,
        genericUrls,
        butlerVersion: globals.appVersion,
    };

    globals.logger.debug(`[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Template context:\n${JSON.stringify(templateContext, null, 2)}`);

    // Sending emails to all recipients
    // eslint-disable-next-line no-restricted-syntax
    for (const recipientEmailAddress of mainSendList) {
        // Make sure rate limiting is not causing emails to be skipped
        rateLimiterMemoryFailedDistribute
            .consume(`${distributeParams.taskId}|${recipientEmailAddress}`, 1)
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Sending distribution task failed notification email to ${recipientEmailAddress}, for task "${distributeParams.taskName}"`,
                    );
                    globals.logger.verbose(
                        `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.distributeTaskFailure.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.distributeTaskFailure.priority'),
                            globals.config.get('Butler.emailNotification.distributeTaskFailure.subject'),
                            globals.config.get('Butler.emailNotification.distributeTaskFailure.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.distributeTaskFailure.htmlTemplateFile'),
                            templateContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Rate limiting failed. Not sending distribute notification email for task "${distributeParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL DISTRIBUTE TASK FAILED ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}

/**
 * Sends a distribute task success notification email.
 * @param {object} distributeParams - Parameters for the distribute task.
 * @returns {Promise<void>}
 */
export async function sendDistributeTaskSuccessNotificationEmail(distributeParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.distributeTaskSuccess.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all successful distribute tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.distributeTaskSuccess.alertEnabledByEmailAddress.customPropertyName
    //    is set for the successful task, alerts should be sent to all emails in that CP

    // Building the send list:
    // 1 Add task-specific notification email addresses (set via custom property on distribute tasks) to send list.
    // 2 Should alert emails be sent for all successful distribute tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the successful distribute task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recipients to send list
    // 3 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.distributeTaskSuccess.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.distributeTaskSuccess.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.distributeTaskSuccess.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.distributeTaskSuccess.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [] };

    // 1. Add task-specific notification email addresses (set via custom property on distribute tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        distributeParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all successful distribute tasks?
    if (globals.config.get('Butler.emailNotification.distributeTaskSuccess.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Added global send list for successful task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the successful task has email alerts enabled
        // 2.2 No : Does the successful distribute task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(distributeParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            // 2.2.1 Yes: Add system-wide list of recipients to send list
            if (globalSendList?.length > 0) {
                mainSendList = mainSendList.concat(globalSendList);
                emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
            }
        } else {
            // 2.2.2 No : Don't add recipients to send list
        }
    }

    // 3 Remove any duplicate recipients in send list
    mainSendList = [...new Set(mainSendList)];

    globals.logger.verbose(
        `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Reduced email send list: ${JSON.stringify(mainSendList, null, 2)}`,
    );

    globals.logger.debug(
        `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Email recipients:\n${JSON.stringify(emailRecipientsVerbose, null, 2)}`,
    );

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
    }

    // These are the template fields that can be used in email subject and body
    const templateContext = {
        hostName: distributeParams.hostName,
        user: distributeParams.user,
        taskName: distributeParams.taskName,
        taskId: distributeParams.taskId,
        taskCustomProperties: distributeParams.qs_taskCustomProperties,
        taskTags: distributeParams.qs_taskTags,
        taskIsManuallyTriggered: distributeParams.qs_taskMetadata?.isManuallyTriggered,
        taskMaxRetries: distributeParams.qs_taskMetadata?.maxRetries,
        taskModifiedByUsername: distributeParams.qs_taskMetadata?.modifiedByUserName,
        taskModifiedDate: distributeParams.qs_taskMetadata?.modifiedDate,
        taskSessionTimeout: distributeParams.qs_taskMetadata?.taskSessionTimeout,
        taskNextExecution:
            distributeParams.qs_taskMetadata?.operational?.nextExecution === '1753-01-01T00:00:00.000Z'
                ? 'Never'
                : distributeParams.qs_taskMetadata?.operational?.nextExecution,
        executionStatusNum: distributeParams.executionStatusNum,
        executionStatusText: distributeParams.executionStatusText,
        logTimeStamp: distributeParams.logTimeStamp,
        logLevel: distributeParams.logLevel,
        logMessage: distributeParams.logMessage,
        executionId: distributeParams.executionId,
        executionDetails: distributeParams.executionDetails,
        executionDetailsConcatenated: distributeParams.executionDetailsConcatenated,
        executionDuration: distributeParams.executionDuration,
        executionStartTime: distributeParams.executionStartTime,
        executionStopTime: distributeParams.executionStopTime,
        executingNodeName: distributeParams.executingNodeName,
        qlikSenseQMC: senseUrls?.qmcUrl,
        qlikSenseHub: senseUrls?.hubUrl,
        genericUrls,
        butlerVersion: globals.appVersion,
    };

    globals.logger.debug(`[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Template context:\n${JSON.stringify(templateContext, null, 2)}`);

    // Sending emails to all recipients
    // eslint-disable-next-line no-restricted-syntax
    for (const recipientEmailAddress of mainSendList) {
        // Make sure rate limiting is not causing emails to be skipped
        rateLimiterMemorySuccessDistribute
            .consume(`${distributeParams.taskId}|${recipientEmailAddress}`, 1)
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Sending distribution task success notification email to ${recipientEmailAddress}, for task "${distributeParams.taskName}"`,
                    );
                    globals.logger.verbose(
                        `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.distributeTaskSuccess.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.distributeTaskSuccess.priority'),
                            globals.config.get('Butler.emailNotification.distributeTaskSuccess.subject'),
                            globals.config.get('Butler.emailNotification.distributeTaskSuccess.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.distributeTaskSuccess.htmlTemplateFile'),
                            templateContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Rate limiting failed. Not sending distribute notification email for task "${distributeParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(
                    `[QSEOW] EMAIL DISTRIBUTE TASK SUCCESS ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`,
                );
            });
    }
}

/**
 * Sends a reload task success notification email.
 * @param {object} reloadParams - Parameters for the reload task.
 * @returns {Promise<void>}
 */
export async function sendReloadTaskSuccessNotificationEmail(reloadParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all successful reload tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.reloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName
    //    is set for the successful task, alerts should be sent to all emails in that CP

    // Building the send list:
    // 1 Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    // 2 Should alert emails be sent for all successful reload tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the successful reload task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recpients to send list
    // 3 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.reloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.reloadTaskSuccess.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [] };

    // 1. Add task-specific notfication email adressess (set via custom property on reload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        reloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all successful reload tasks?
    if (globals.config.get('Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Added global send list for succeesful task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the successful task has email alerts enabled
        // 2.2 No : Does the failed reload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(reloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
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

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // Debug
    globals.logger.verbose(
        `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Final send list for successful task "${reloadParams.taskName}": ${JSON.stringify(
            mainSendListUnique,
            null,
            2,
        )}`,
    );
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Shared all tasks recipients: ${emailRecipientsVerbose.shared}`);
    globals.logger.verbose(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Task specific recipients: ${emailRecipientsVerbose.taskSpecific}`);

    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailReloadSuccessNotificationConfigOk() === false) {
        return 1;
    }

    // Get script logs, if enabled in the config file
    const scriptLogData = reloadParams.scriptLog;

    // Handle case where scriptLog retrieval failed
    if (scriptLogData === null || scriptLogData === undefined) {
        globals.logger.warn(
            `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Script log data is not available. Email will be sent without script log details.`,
        );
    } else {
        // Reduce script log lines to only the ones we want to send in email
        scriptLogData.scriptLogHeadCount = globals.config.get('Butler.emailNotification.reloadTaskSuccess.headScriptLogLines');
        scriptLogData.scriptLogTailCount = globals.config.get('Butler.emailNotification.reloadTaskSuccess.tailScriptLogLines');

        if (scriptLogData?.scriptLogFull?.length > 0) {
            scriptLogData.scriptLogHead = scriptLogData.scriptLogFull.slice(0, scriptLogData.scriptLogHeadCount).join('\r\n');

            scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                .join('\r\n');
        } else {
            scriptLogData.scriptLogHead = '';
            scriptLogData.scriptLogTail = '';
        }

        globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Script log head:\n${scriptLogData.scriptLogHead}`);
        globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Script log tail:\n${scriptLogData.scriptLogTail}`);
    }

    // Get app owner
    const appOwner = await getAppOwner(reloadParams.appId);

    // Get Sense URLs from config file. Can be used as template fields.
    const senseUrls = getQlikSenseUrls();

    // Construct URL to the failing app
    // Note that senseUrls.appBaseUrl may or may not end with a slash.
    // Handle both cases.
    let appUrl = '';
    if (senseUrls.appBaseUrl.endsWith('/')) {
        appUrl = `${senseUrls.appBaseUrl}${reloadParams.appId}`;
    } else {
        appUrl = `${senseUrls.appBaseUrl}/${reloadParams.appId}`;
    }

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
    }

    // These are the template fields that can be used in email subject and body
    const templateContext = {
        hostName: reloadParams.hostName,
        user: reloadParams.user,
        taskName: reloadParams.taskName,
        taskId: reloadParams.taskId,
        taskCustomProperties: reloadParams.qs_taskCustomProperties,
        taskTags: reloadParams.qs_taskTags,
        taskIsManuallyTriggered: reloadParams.qs_taskMetadata.isManuallyTriggered,
        taskIsPartialReload: reloadParams.qs_taskMetadata.isPartialReload,
        taskMaxRetries: reloadParams.qs_taskMetadata.maxRetries,
        taskModifiedByUsername: reloadParams.qs_taskMetadata.modifiedByUserName,
        taskModifiedDate: reloadParams.qs_taskMetadata.modifiedDate,
        taskSessionTimeout: reloadParams.qs_taskMetadata.taskSessionTimeout,
        taskNextExecution:
            reloadParams.qs_taskMetadata.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                ? 'Never'
                : reloadParams.qs_taskMetadata.operational.nextExecution,
        appName: reloadParams.appName,
        appId: reloadParams.appId,
        appUrl,
        appDescription: reloadParams.qs_appMetadata?.description,
        appFileSize: reloadParams.qs_appMetadata?.fileSize,
        appLastSuccessfulReload: reloadParams.qs_appMetadata?.lastReloadTime,
        appLastModifiedDate: reloadParams.qs_appMetadata?.modifiedDate,
        appLastModifiedByUserName: reloadParams.qs_appMetadata?.modifiedByUserName,
        appPublishTime: reloadParams.qs_appMetadata?.publishTime,
        appPublished: reloadParams.qs_appMetadata?.published,
        appStreamName: reloadParams.qs_appMetadata?.stream,
        appCustomProperties: reloadParams.qs_appCustomProperties,
        appTags: reloadParams.qs_appTags,
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
        scriptLogSizeRows: scriptLogData.scriptLogSizeRows,
        scriptLogSizeCharacters: scriptLogData.scriptLogSizeCharacters,
        scriptLogHead: scriptLogData.scriptLogHead,
        scriptLogTail: scriptLogData.scriptLogTail,
        scriptLogTailCount: scriptLogData.scriptLogTailCount,
        scriptLogHeadCount: scriptLogData.scriptLogHeadCount,
        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        genericUrls,
        appOwnerName: appOwner.userName,
        appOwnerUserId: appOwner.userId,
        appOwnerUserDirectory: appOwner.directory,
        appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
    };

    // eslint-disable-next-line no-restricted-syntax
    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemorySuccessReloads
            .consume(`${reloadParams.taskId}|${recipientEmailAddress}`, 1)
            // eslint-disable-next-line no-loop-func
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Rate limiting check passed for successful task notification. Task name: "${reloadParams.taskName}", Recipient: "${recipientEmailAddress}"`,
                    );
                    globals.logger.debug(
                        `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.reloadTaskSuccess.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.reloadTaskSuccess.priority'),
                            globals.config.get('Butler.emailNotification.reloadTaskSuccess.subject'),
                            globals.config.get('Butler.emailNotification.reloadTaskSuccess.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.reloadTaskSuccess.htmlTemplateFile'),
                            templateContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Rate limiting failed. Not sending reload notification email for task "${reloadParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}

/**
 * Sends a service monitor notification email.
 * @param {object} serviceParams - Parameters for the service.
 * @returns {Promise<void>}
 */
export async function sendServiceMonitorNotificationEmail(serviceParams) {
    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailServiceMonitorNotificationConfig() === false) {
        return 1;
    }

    // Get generic URLs from config file. Can be used as template fields.
    let genericUrls = globals.config.get('Butler.genericUrls');
    if (!genericUrls) {
        // No URLs defined in the config file. Set to empty array
        genericUrls = [];
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
        genericUrls,
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
        globals.logger.warn(`[QSEOW] EMAIL SERVICE MONITOR: No recipients to send alert email to.`);
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
                        `[QSEOW] EMAIL SERVICE MONITOR: Rate limiting check passed for service monitor notification. Host: "${serviceParams.host}", service: "${serviceParams.serviceName}", recipient: "${recipientEmailAddress}"`,
                    );
                    globals.logger.debug(
                        `[QSEOW] EMAIL SERVICE MONITOR: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        if (serviceParams.serviceStatus === 'STOPPED') {
                            sendEmail(
                                globals.config.get('Butler.emailNotification.serviceStopped.fromAddress'),
                                [recipientEmailAddress],
                                globals.config.get('Butler.emailNotification.serviceStopped.priority'),
                                globals.config.get('Butler.emailNotification.serviceStopped.subject'),
                                globals.config.get('Butler.emailNotification.serviceStopped.bodyFileDirectory'),
                                globals.config.get('Butler.emailNotification.serviceStopped.htmlTemplateFile'),
                                templateContext,
                            );
                        } else if (serviceParams.serviceStatus === 'RUNNING') {
                            sendEmail(
                                globals.config.get('Butler.emailNotification.serviceStarted.fromAddress'),
                                [recipientEmailAddress],
                                globals.config.get('Butler.emailNotification.serviceStarted.priority'),
                                globals.config.get('Butler.emailNotification.serviceStarted.subject'),
                                globals.config.get('Butler.emailNotification.serviceStarted.bodyFileDirectory'),
                                globals.config.get('Butler.emailNotification.serviceStarted.htmlTemplateFile'),
                                templateContext,
                            );
                        }
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL SERVICE MONITOR: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL SERVICE MONITOR: ${globals.getErrorMessage(err)}`);
                }
            })
            // eslint-disable-next-line no-loop-func
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL SERVICE MONITOR: Rate limiting failed. Not sending reload notification email for service service "${serviceParams.serviceName}" on host "${serviceParams.host}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL SERVICE MONITOR: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}
