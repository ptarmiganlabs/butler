import globals from '../../../globals.js';
import { getTaskCustomPropertyValues, isCustomPropertyValueSet } from '../../../qrs_util/task_cp_util.js';
import getAppOwner from '../../../qrs_util/get_app_owner.js';
import { getQlikSenseUrls } from '../get_qs_urls.js';
import { isSmtpConfigOk, isEmailReloadSuccessNotificationConfigOk, rateLimiterMemorySuccessReloads } from './config.js';
import { sendEmail } from '../../smtp_core.js';

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

    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemorySuccessReloads
            .consume(`${reloadParams.taskId}|${recipientEmailAddress}`, 1)
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL RELOAD TASK SUCCESS ALERT: Sending reload task success notification email to ${recipientEmailAddress}, for task "${reloadParams.taskName}"`,
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
