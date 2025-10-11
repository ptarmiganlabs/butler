import globals from '../../../globals.js';
import { getTaskCustomPropertyValues, isCustomPropertyValueSet } from '../../../qrs_util/task_cp_util.js';
import { getQlikSenseUrls } from '../get_qs_urls.js';
import { isSmtpConfigOk, isEmailPreloadSuccessNotificationConfigOk, rateLimiterMemorySuccessPreloads } from './config.js';
import { sendEmail } from '../../smtp_core.js';

/**
 * Sends a preload task success notification email.
 * @param {object} preloadParams - Parameters for the preload task.
 * @returns {Promise<void>}
 */
export async function sendPreloadTaskSuccessNotificationEmail(preloadParams) {
    // Determine if an alert should be sent or not
    // 1. If config setting Butler.emailNotification.preloadTaskSuccess.alertEnableByCustomProperty.enable is true
    //     ... only send alerts for the tasks that have "enabledValue" set
    //     ... If that CP is false send alerts for all successful preload tasks.
    // 2. If the custom property defined in config setting Butler.emailNotification.preloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName
    //    is set for the successful task, alerts should be sent to all emails in that CP

    // Building the send list:
    // 1 Add task-specific notification email addresses (set via custom property on preload tasks) to send list.
    // 2 Should alert emails be sent for all successful preload tasks?
    // 2.1 Yes: Add system-wide list of recipients to send list
    // 2.2 No : Does the successful preload task have alerts turned on (using custom property)?
    // 2.2.1 Yes: Add system-wide list of recipients to send list
    // 2.2.2 No : Don't add recipients to send list
    // 3 Remove any duplicate recipients in send list

    const emailAlertCpName = globals.config.get(
        'Butler.emailNotification.preloadTaskSuccess.alertEnableByCustomProperty.customPropertyName',
    );
    const emailAlertCpEnabledValue = globals.config.get(
        'Butler.emailNotification.preloadTaskSuccess.alertEnableByCustomProperty.enabledValue',
    );
    const emailAlertCpTaskSpecificEmailAddressName = globals.config.get(
        'Butler.emailNotification.preloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName',
    );
    const globalSendList = globals.config.get('Butler.emailNotification.preloadTaskSuccess.recipients');

    let mainSendList = [];
    const emailRecipientsVerbose = { taskSpecific: [], common: [] };

    // 1. Add task-specific notification email addresses (set via custom property on preload tasks) to send list.
    const taskSpecificAlertEmailAddresses = await getTaskCustomPropertyValues(
        preloadParams.taskId,
        emailAlertCpTaskSpecificEmailAddressName,
    );

    if (taskSpecificAlertEmailAddresses?.length > 0) {
        globals.logger.debug(
            `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Added task specific send list: ${JSON.stringify(taskSpecificAlertEmailAddresses, null, 2)}`,
        );

        mainSendList = mainSendList.concat(taskSpecificAlertEmailAddresses);
        emailRecipientsVerbose.taskSpecific = emailRecipientsVerbose.taskSpecific.concat(taskSpecificAlertEmailAddresses);
    }

    // 2 Should alert emails be sent for all successful preload tasks?
    if (globals.config.get('Butler.emailNotification.preloadTaskSuccess.alertEnableByCustomProperty.enable') === false) {
        // 2.1 Yes: Add system-wide list of recipients to send list
        globals.logger.verbose(`[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Send alert emails for all tasks`);

        if (globalSendList?.length > 0) {
            globals.logger.debug(
                `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Added global send list for successful task: ${JSON.stringify(globalSendList, null, 2)}`,
            );
            mainSendList = mainSendList.concat(globalSendList);
            emailRecipientsVerbose.common = emailRecipientsVerbose.common.concat(globalSendList);
        }
    } else {
        // Only send alert email if the successful task has email alerts enabled
        // 2.2 No : Does the successful preload task have alerts turned on (using custom property)?
        globals.logger.verbose(
            `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Only send alert emails for tasks with email-alert-CP "${emailAlertCpName}" set`,
        );

        const sendAlert = await isCustomPropertyValueSet(preloadParams.taskId, emailAlertCpName, emailAlertCpEnabledValue);

        if (sendAlert === true) {
            globals.logger.debug(
                `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Added send list based on email-alert-CP: ${JSON.stringify(globalSendList, null, 2)}`,
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

    // Make sure send list does not contain any duplicate email addresses
    const mainSendListUnique = [...new Set(mainSendList)];

    // Debug
    globals.logger.verbose(
        `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Final send list for successful task "${preloadParams.taskName}": ${JSON.stringify(
            mainSendListUnique,
            null,
            2,
        )}`,
    );
    globals.logger.verbose(`[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Common recipients: ${emailRecipientsVerbose.common}`);
    globals.logger.verbose(`[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Task specific recipients: ${emailRecipientsVerbose.taskSpecific}`);

    if (isSmtpConfigOk() === false) {
        return 1;
    }

    if (isEmailPreloadSuccessNotificationConfigOk() === false) {
        return 1;
    }

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
        hostName: preloadParams.hostName,
        user: preloadParams.user,
        taskName: preloadParams.taskName,
        taskId: preloadParams.taskId,
        taskCustomProperties: preloadParams.qs_taskCustomProperties,
        taskTags: preloadParams.qs_taskTags,
        taskIsManuallyTriggered: preloadParams.qs_taskMetadata.isManuallyTriggered,
        taskModifiedByUsername: preloadParams.qs_taskMetadata.modifiedByUserName,
        taskModifiedDate: preloadParams.qs_taskMetadata.modifiedDate,
        taskNextExecution:
            preloadParams.qs_taskMetadata.operational.nextExecution === '1753-01-01T00:00:00.000Z'
                ? 'Never'
                : preloadParams.qs_taskMetadata.operational.nextExecution,
        appName: preloadParams.appName,
        appId: preloadParams.appId,
        logTimeStamp: preloadParams.logTimeStamp,
        logLevel: preloadParams.logLevel,
        logMessage: preloadParams.logMessage,
        executingNodeName: preloadParams.taskInfo.executingNodeName,
        executionDuration: preloadParams.taskInfo.executionDuration,
        executionStartTime: preloadParams.taskInfo.executionStartTime,
        executionStopTime: preloadParams.taskInfo.executionStopTime,
        executionStatusNum: preloadParams.taskInfo.executionStatusNum,
        executionStatusText: preloadParams.taskInfo.executionStatusText,
        qlikSenseQMC: senseUrls.qmcUrl,
        qlikSenseHub: senseUrls.hubUrl,
        genericUrls,
    };

    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemorySuccessPreloads
            .consume(`${preloadParams.taskId}|${recipientEmailAddress}`, 1)
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Rate limiting check passed for successful task notification. Task name: "${preloadParams.taskName}", Recipient: "${recipientEmailAddress}"`,
                    );
                    globals.logger.debug(
                        `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                    );

                    // Only send email if there is at least one recipient
                    if (recipientEmailAddress.length > 0) {
                        sendEmail(
                            globals.config.get('Butler.emailNotification.preloadTaskSuccess.fromAddress'),
                            [recipientEmailAddress],
                            globals.config.get('Butler.emailNotification.preloadTaskSuccess.priority'),
                            globals.config.get('Butler.emailNotification.preloadTaskSuccess.subject'),
                            globals.config.get('Butler.emailNotification.preloadTaskSuccess.bodyFileDirectory'),
                            globals.config.get('Butler.emailNotification.preloadTaskSuccess.htmlTemplateFile'),
                            templateContext,
                        );
                    } else {
                        globals.logger.warn(`[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: No recipients to send alert email to.`);
                    }
                } catch (err) {
                    globals.logger.error(`[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: ${globals.getErrorMessage(err)}`);
                }
            })
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Rate limiting failed. Not sending preload notification email for task "${preloadParams.taskName}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL PRELOAD TASK SUCCESS ALERT: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}
