import globals from '../../../globals.js';
import { getTaskCustomPropertyValues, isCustomPropertyValueSet } from '../../../qrs_util/task_cp_util.js';
import { getQlikSenseUrls } from '../get_qs_urls.js';
import { isSmtpConfigOk, isEmailPreloadFailedNotificationConfigOk, rateLimiterMemoryFailedPreloads } from './config.js';
import { sendEmail } from '../../smtp_core.js';

/**
 * Sends a preload task failure notification email.
 * @param {object} preloadParams - Parameters for the preload task.
 * @returns {Promise<void>}
 */
export async function sendPreloadTaskFailureNotificationEmail(preloadParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.preloadTaskFailure.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all failed preload tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.preloadTaskFailure.alertEnabledByEmailAddress.customPropertyName
    //    is set for the failed task, alerts should be sent to all emails in that CP

    // Building the send list:
    // 1 Add task-specific notification email addresses (set via custom property on preload tasks) to send list.
    // 2 Should alert emails be sent for all failed preload tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the failed preload task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recipients to send list
    // 3 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.preloadTaskFailure.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.preloadTaskFailure.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.preloadTaskFailure.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.preloadTaskFailure.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [] };

    // 1. Add task-specific notification email addresses (set via custom property on preload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        preloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all failed preload tasks?
    if (globals.config.get('Butler.emailNotification.preloadTaskFailure.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Added global send list for failed task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the failed task has email alerts enabled
        // 2.2 No : Does the failed preload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(preloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
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

    globals.logger.verbose(`[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Reduced email send list: ${JSON.stringify(mainSendList, null, 2)}`);

    globals.logger.debug(
        `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Email recipients (verbose): ${JSON.stringify(emailRecipientsVerbose, null, 2)}`,
    );

    // Should email(s) be sent?
    if (mainSendList.length === 0) {
        globals.logger.info(
            `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: No email recipients available for task ${preloadParams.taskName} (${preloadParams.taskId}). Not sending email.`,
        );
        return;
    }

    // Make sure SMTP is properly configured
    if (isSmtpConfigOk() === false) {
        return;
    }

    // Make sure preload task failure email config is enabled
    if (isEmailPreloadFailedNotificationConfigOk() === false) {
        return;
    }

    // Get Qlik Sense URLs
    const qlikSenseUrls = getQlikSenseUrls();

    // Build email context (preload tasks do not have script logs)
    const emailContext = {
        taskName: preloadParams.taskName,
        taskId: preloadParams.taskId,
        executingNodeName: preloadParams.taskInfo?.executingNodeName || 'N/A',
        executionStatusNum: preloadParams.taskInfo?.executionStatusNum || 'N/A',
        executionStatusText: preloadParams.taskInfo?.executionStatusText || 'N/A',
        executionDetailsText: preloadParams.taskInfo?.executionDetailsText || 'N/A',
        executionStartTime: preloadParams.taskInfo?.executionStartTime || {},
        executionStopTime: preloadParams.taskInfo?.executionStopTime || {},
        executionDuration: preloadParams.taskInfo?.executionDuration || {},
        taskNextExecution: preloadParams.taskInfo?.nextExecutionISO || 'N/A',
        user: preloadParams.user,
        logLevel: preloadParams.logLevel,
        logMessage: preloadParams.logMessage,
        taskTags: preloadParams.qs_taskTags,
        taskCustomProperties: preloadParams.qs_taskCustomProperties,
        qlikSenseQMC: qlikSenseUrls.qmcUrl,
        qlikSenseHub: qlikSenseUrls.hubUrl,
        genericUrls: qlikSenseUrls.genericUrls || [],
        emailRecipients: emailRecipientsVerbose,
    };

    const mainSendListUnique = [...new Set(mainSendList)];

    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemoryFailedPreloads
            .consume(`${preloadParams.taskId}|${recipientEmailAddress}`, 1)
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Sending preload task failed notification email to ${recipientEmailAddress}, for task "${preloadParams.taskName}"`,
                    );
                    globals.logger.verbose(
                        `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.preloadTaskFailure.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.preloadTaskFailure.priority'),
                            globals.config.get('Butler.emailNotification.preloadTaskFailure.subject'),
                            globals.config.get('Butler.emailNotification.preloadTaskFailure.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.preloadTaskFailure.htmlTemplateFile'),
                            emailContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Rate limiting failed. Not sending preload notification email for task "${preloadParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL PRELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}
