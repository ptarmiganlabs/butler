import globals from '../../../globals.js';
import { isSmtpConfigOk, isEmailServiceMonitorNotificationConfig, rateLimiterMemoryServiceMonitor } from './config.js';
import { sendEmail } from '../../smtp_core.js';

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

    for (const recipientEmailAddress of mainSendListUnique) {
        rateLimiterMemoryServiceMonitor
            .consume(`${serviceParams.host}|${serviceParams.serviceName}|${recipientEmailAddress}`, 1)
            .then(async (rateLimiterRes) => {
                try {
                    globals.logger.info(
                        `[QSEOW] EMAIL SERVICE MONITOR: Sending Windows service monitoring notification email to "${recipientEmailAddress}". Host: "${serviceParams.host}", service: "${serviceParams.serviceName}"`,
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
            .catch((err) => {
                globals.logger.warn(
                    `[QSEOW] EMAIL SERVICE MONITOR: Rate limiting failed. Not sending reload notification email for service service "${serviceParams.serviceName}" on host "${serviceParams.host}" to "${recipientEmailAddress}"`,
                );
                globals.logger.debug(`[QSEOW] EMAIL SERVICE MONITOR: Rate limiting details "${JSON.stringify(err, null, 2)}"`);
            });
    }
}
