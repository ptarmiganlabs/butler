import globals from '../../../globals.js';
import { getTaskCustomPropertyValues, isCustomPropertyValueSet } from '../../../qrs_util/task_cp_util.js';
import { getQlikSenseUrls } from '../get_qs_urls.js';
import { isSmtpConfigOk, rateLimiterMemorySuccessDistribute } from './config.js';
import { sendEmail } from '../../smtp_core.js';

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
