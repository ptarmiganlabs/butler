import fs from 'fs';
import handlebars from 'handlebars';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import globals from '../../globals.js';
import { getQlikSenseCloudUserInfo } from './api/user.js';
import { getQlikSenseCloudAppInfo } from './api/app.js';
import { getQlikSenseCloudUrls } from './util.js';
import { sendEmail, isSmtpConfigOk } from '../smtp.js';

let rateLimiterMemoryFailedReloads;
let emailConfig;

if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

function getAppReloadFailedEmailConfig() {
    try {
        // Is email alerts on failed reloads enabled?
        if (!globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable')) {
            globals.logger.error(
                'EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Email alerts on failed reloads are disabled in the config file.',
            );
            return false;
        }

        // Get app owner alert settings.
        const appOwnerAlert = JSON.parse(
            JSON.stringify(
                globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert'),
            ),
        );

        return {
            emailAlertByTagEnable: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable',
            ),
            emailAlertByTagName: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.tag',
            ),
            appOwnerAlert,
            rateLimit: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.rateLimit'),
            headScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.headScriptLogLines',
            ),
            tailScriptLogLines: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.tailScriptLogLines',
            ),
            priority: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.priority'),
            subject: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.subject'),
            bodyFileDirectory: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.bodyFileDirectory',
            ),
            htmlTemplateFile: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.htmlTemplateFile',
            ),
            fromAddress: globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.fromAddress'),
            globalSendList: globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients',
            ),
        };
    } catch (err) {
        globals.logger.error(`EMAIL ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
        return false;
    }
}

// Function to send Qlik Sense Cloud app reload failed alert as email
export function sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.reloadId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting check passed for failed task notification. App name: "${reloadParams.appName}"`,
                );
                globals.logger.verbose(
                    `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Logic for determining if alert email should be sent or not
                // 1. If config setting Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enabled is false, do not send email
                // 2. If config setting Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable is true,
                //      ...only send email if the app has the tag specified in Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.tag
                //
                // Logic for determining list of email recipients
                // 1. Should alert emails be sent for all failed reload tasks?
                //    Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable = true => only send email if app has tag
                //    Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable = false => send email for all failed reloads
                //    1. Yes: Add system-wide list of recipients to send list. This list is defined in Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients[]
                //    2. No: Does the app whose reload failed have a tag that enables alert emails?
                //       1. Yes: Add system-wide list of recipients to send list. This list is defined in Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients[]
                //       2. No: Don't add recpients to send list
                // 2. Should app owners get alerts? Determined by Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.enable, which is a boolean
                //    1. Yes: Should *all* app owners get alerts? Determined by Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.includeAll, which is a boolean
                //       1. Yes: Add app owner's email address to app owner send list
                //       2. No: Is the app owner included in the Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user[] array?
                //          1. Yes: Add app owner's email address to app owner send list
                //          2. No: Don't add app owner's email address to app owner send list
                //    2. Is there an app owner exclusion list? Determined by Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.[]
                //       1. Yes: Is the app owner's email address in the exclusion list?
                //          1. Yes: Remove the app owner's email address from the app owner send list (if it's there)
                // 3. Add app owner send list to main send list
                // 4. Remove any duplicate email addresses from the main send list

                // Make sure email sending is enabled in the config file and that we have all required settings
                emailConfig = getAppReloadFailedEmailConfig();
                if (emailConfig === false) {
                    return 1;
                }

                // Get send list based on logic described above
                let globalSendList = [];

                // Get recipients based on app tags (or for all failed reloads)
                if (emailConfig.emailAlertByTagEnable === false) {
                    // Email alerts are enabled for all failed app reloads, not just those with a specific tag set
                    if (emailConfig?.globalSendList?.length < 0) {
                        // Add global send list from YAML config file to main send list
                        globalSendList.push(...emailConfig.globalSendList);
                    }
                } else {
                    // Check if app has the tag that enables email alerts. If not found, do not add anything to the main send list
                    // The app tag names are in reloadParams.meta.tags[].name
                    const alertTag = emailConfig.emailAlertByTagName;
                    const appTags = reloadParams.appItems.meta.tags;
                    const appHasAlertTag = appTags.find((tag) => tag.name === alertTag);

                    if (appTags === undefined || appTags?.length === 0 || appHasAlertTag === undefined) {
                        globals.logger.warn(
                            `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: App [${reloadParams.appId}] "${reloadParams.appName}" does not have the tag "${alertTag}" set. Not sending alert email based on app tag.`,
                        );
                    } else if (appHasAlertTag !== undefined) {
                        // Add global send list from YAML config file to main send list
                        globalSendList.push(...emailConfig.globalSendList);
                    }
                }

                // Get app owner info
                const appOwner = await getQlikSenseCloudUserInfo(reloadParams.ownerId);

                // Get recipients based on app owner settings
                // Build separate list of app owner email addresses
                if (emailConfig.appOwnerAlert.enable === true) {
                    let appOwnerSendList = [];

                    if (appOwner.email === undefined || appOwner?.email?.length === 0) {
                        globals.logger.warn(
                            `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: App owner email address is not set for app [${reloadParams.appId}] "${reloadParams.appName}". Not sending alert email to app owner "${appOwner.name}".`,
                        );
                    } else {
                        // App owner email address exists.

                        // Should *all* app owners get alerts?
                        if (emailConfig.appOwnerAlert.includeOwner.includeAll === true) {
                            // Add app owner's email address to app owner send list.
                            // Only do this if the email address length is greater than 0
                            appOwnerSendList.push(appOwner.email);
                        } else {
                            // Check if app owner's email address is in the include list
                            const appOwnerIncludeList = emailConfig.appOwnerAlert.includeOwner?.user;
                            if (appOwnerIncludeList !== undefined && appOwnerIncludeList.length > 0) {
                                const appOwnerIsIncluded = appOwnerIncludeList.find((owner) => owner.email === appOwner.email);

                                if (appOwnerIsIncluded !== undefined) {
                                    // Add app owner's email address to app owner send list
                                    appOwnerSendList.push(appOwner.email);
                                }
                            }
                        }

                        // Now evaluate the exclusion list
                        const appOwnerExcludeList = emailConfig.appOwnerAlert.excludeOwner?.user;
                        if (appOwnerExcludeList !== undefined && appOwnerExcludeList.length > 0) {
                            // Exclusion list found.
                            // Remove all entries in exclude list from app owner send list
                            appOwnerSendList = appOwnerSendList.filter((ownerEmail) => {
                                const appOwnerIsExcluded = appOwnerExcludeList.find((exclude) => exclude.email === ownerEmail);
                                if (appOwnerIsExcluded === undefined) {
                                    return ownerEmail;
                                }
                            });
                        }

                        // Add app owner send list to main send list
                        globalSendList.push(...appOwnerSendList);
                    }
                }

                // Remove any duplicate email addresses from the main send list
                globalSendList = [...new Set(globalSendList)];

                // Check if we have any email addresses to send to
                if (globalSendList.length === 0) {
                    globals.logger.warn(
                        `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: No email addresses found to send alert email for app [${reloadParams.appId}] "${reloadParams.appName}".`,
                    );
                    return false;
                }

                if (isSmtpConfigOk() === false) {
                    return false;
                }

                // Get script logs, if enabled in the config file
                // If the value is false, the script log could not be obtained
                let scriptLogData = {};

                if (reloadParams.scriptLog === false) {
                    scriptLogData = {
                        scriptLogFull: [],
                        scriptLogSize: 0,
                        scriptLogHead: '',
                        scriptLogHeadCount: 0,
                        scriptLogTail: '',
                        scriptLogTailCount: 0,
                    };
                } else {
                    // Reduce script log lines to only the ones we want to send to email
                    scriptLogData.scriptLogHeadCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.headScriptLogLines',
                    );
                    scriptLogData.scriptLogTailCount = globals.config.get(
                        'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.tailScriptLogLines',
                    );

                    if (reloadParams.scriptLog?.scriptLogFull?.length > 0) {
                        // Get length of script log (character count)
                        scriptLogData.scriptLogSize = reloadParams.scriptLog.scriptLogFull.length;

                        // Get the first and last n lines of the script log
                        scriptLogData.scriptLogHead = reloadParams.scriptLog.scriptLogFull
                            .slice(0, reloadParams.scriptLog.scriptLogHeadCount)
                            .join('\r\n');

                        scriptLogData.scriptLogTail = reloadParams.scriptLog.scriptLogFull
                            .slice(Math.max(reloadParams.scriptLog.scriptLogFull.length - reloadParams.scriptLog.scriptLogTailCount, 0))
                            .join('\r\n');
                    } else {
                        scriptLogData.scriptLogHead = '';
                        scriptLogData.scriptLogTail = '';
                        scriptLogData.scriptLogSize = 0;
                    }

                    globals.logger.debug(
                        `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`,
                    );
                }

                // Format log message line breaks to work in HTML email
                if (reloadParams.reloadInfo.log !== undefined) {
                    // Replace \n with \r\n
                    reloadParams.reloadInfo.log = reloadParams.reloadInfo.log.replace(/(\r\n|\n|\r)/gm, '\r\n');
                }

                // Get Sense URLs from config file. Can be used as template fields.
                const senseUrls = getQlikSenseCloudUrls();

                // These are the template fields that can be used in email body
                const templateContext = {
                    tenantId: reloadParams.tenantId,
                    tenantComment: reloadParams.tenantComment,
                    tenantUrl: reloadParams.tenantUrl,

                    userId: reloadParams.userId,
                    userName: appOwner === undefined ? 'Unknown' : appOwner.name,

                    appId: reloadParams.appId,
                    appName: reloadParams.appName,
                    appDescription: reloadParams.appInfo.attributes.description,
                    appUrl: reloadParams.appUrl,
                    appHasSectionAccess: reloadParams.appInfo.attributes.hasSectionAccess,
                    appIsPublished: reloadParams.appInfo.attributes.published,
                    appPublishTime: reloadParams.appInfo.attributes.publishTime,
                    appThumbnail: reloadParams.appInfo.attributes.thumbnail,

                    reloadTrigger: reloadParams.reloadTrigger,
                    source: reloadParams.source,
                    eventType: reloadParams.eventType,
                    eventTypeVersion: reloadParams.eventTypeVersion,
                    endedWithMemoryConstraint: reloadParams.endedWithMemoryConstraint,
                    isDirectQueryMode: reloadParams.isDirectQueryMode,
                    isPartialReload: reloadParams.isPartialReload,
                    isSessionApp: reloadParams.isSessionApp,
                    isSkipStore: reloadParams.isSkipStore,

                    peakMemoryBytes: reloadParams.peakMemoryBytes.toLocaleString(),
                    reloadId: reloadParams.reloadId,
                    rowLimit: reloadParams.rowLimit.toLocaleString(),
                    statements: reloadParams.statements,
                    status: reloadParams.status,
                    usageDuration: reloadParams.duration,
                    sizeMemoryBytes: reloadParams.sizeMemory.toLocaleString(),
                    appFileSize: reloadParams.appItems.resourceSize.appFile.toLocaleString(),

                    errorCode: reloadParams.reloadInfo.errorCode,
                    errorMessage: reloadParams.reloadInfo.errorMessage,
                    logMessage: reloadParams.reloadInfo.log,
                    executionDuration: reloadParams.reloadInfo.executionDuration,
                    executionStartTime: reloadParams.reloadInfo.executionStartTime,
                    executionStopTime: reloadParams.reloadInfo.executionStopTime,
                    executionStatusText: reloadParams.reloadInfo.status,
                    scriptLogSize: scriptLogData.scriptLogSize.toLocaleString(),
                    scriptLogHead: scriptLogData.scriptLogHead,
                    scriptLogTail: scriptLogData.scriptLogTail,
                    scriptLogTailCount: scriptLogData.scriptLogTailCount,
                    scriptLogHeadCount: scriptLogData.scriptLogHeadCount,

                    qlikSenseQMC: senseUrls.qmcUrl,
                    qlikSenseHub: senseUrls.hubUrl,

                    appOwnerName: appOwner.name,
                    appOwnerUserId: appOwner.id,
                    appOwnerPicture: appOwner.picture,
                    appOwnerEmail: appOwner.email,
                };

                // Send alert emails
                // Take into account rate limiting, basing it on appId + email address
                for (const recipientEmailAddress of globalSendList) {
                    rateLimiterMemoryFailedReloads
                        .consume(`${reloadParams.taskId}|${recipientEmailAddress}`, 1)
                        // eslint-disable-next-line no-loop-func
                        .then(async (rateLimiterRes) => {
                            try {
                                globals.logger.info(
                                    `EMAIL ALERT - QS CLOUD: Rate limiting check passed for failed app reload notification. App name: "${reloadParams.appName}", email: "${recipientEmailAddress}"`,
                                );
                                globals.logger.debug(
                                    `EMAIL ALERT - QS CLOUD: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                                );

                                // Only send email if there is an actual email address
                                if (recipientEmailAddress.length > 0) {
                                    sendEmail(
                                        emailConfig.fromAddress,
                                        [recipientEmailAddress],
                                        emailConfig.priority,
                                        emailConfig.subject,
                                        emailConfig.bodyFileDirectory,
                                        emailConfig.htmlTemplateFile,
                                        templateContext,
                                    );
                                } else {
                                    globals.logger.warn(
                                        `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: No email address found for app [${reloadParams.appId}] "${reloadParams.appName}". Not sending alert email.`,
                                    );
                                }
                            } catch (err) {
                                globals.logger.error(`EMAIL ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
                            }
                        })
                        .catch((err) => {
                            globals.logger.warn(
                                `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting failed. Not sending reload notification email for app [${reloadParams.appId}] "${reloadParams.appName}"`,
                            );
                            globals.logger.debug(
                                `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(err, null, 2)}"`,
                            );
                        });
                }
            } catch (err) {
                globals.logger.error(`EMAIL ALERT - QS CLOUD APP RELOAD FAILED: ${err}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.warn(
                `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting failed. Not sending reload notification email for app [${reloadParams.appId}] "${reloadParams.appName}"`,
            );
            globals.logger.debug(
                `EMAIL ALERT - QS CLOUD APP RELOAD FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
            );
        });
}