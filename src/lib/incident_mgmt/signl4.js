import axios from 'axios';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import globals from '../../globals.js';
import { HTTP_TIMEOUT_SHORT_MS } from '../../constants.js';

let rateLimiterFailedReloads;
let rateLimiterAbortedReloads;

if (globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.rateLimit')) {
    rateLimiterFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.rateLimit'),
    });
} else {
    rateLimiterFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.rateLimit')) {
    rateLimiterAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.rateLimit'),
    });
} else {
    rateLimiterAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

/**
 * Retrieves the configuration for a reload failed event.
 * @returns {Object|boolean} Configuration object if successful, false otherwise.
 */
function getReloadFailedEventConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure') ||
            !globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable') ||
            !globals.config.has('Butler.incidentTool.signl4.url')
        ) {
            // Not enough info in config file
            globals.logger.error('SIGNL4: Reload failure SIGNL4 config info missing in Butler config file');
            return false;
        }

        return {
            event: 'Qlik Sense reload task failed',
            url: globals.config.get('Butler.incidentTool.signl4.url'),
            rateLimit: globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.rateLimit')
                ? globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.rateLimit')
                : '',
            severity: globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.severity')
                ? globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.severity')
                : 99,
            serviceName: globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.serviceName')
                ? globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.serviceName')
                : 'Default service name',
            // autoCloseOnLaterReloadSuccess: globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.autoCloseOnLaterReloadSuccess')
            //     ? globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.autoCloseOnLaterReloadSuccess')
            //     : false,
        };
    } catch (err) {
        globals.logger.error(`SIGNL4: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Retrieves the configuration for a reload aborted event.
 * @returns {Object|boolean} Configuration object if successful, false otherwise.
 */
function getReloadAbortedEventConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted') ||
            !globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.enable') ||
            !globals.config.has('Butler.incidentTool.signl4.url')
        ) {
            // Not enough info in config file
            globals.logger.error('SIGNL4: Reload aborted SIGNL4 config info missing in Butler config file');
            return false;
        }

        return {
            event: 'Qlik Sense task aborted',
            url: globals.config.get('Butler.incidentTool.signl4.url'),
            rateLimit: globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.rateLimit')
                ? globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.rateLimit')
                : '',
            severity: globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.severity')
                ? globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.severity')
                : 99,
            serviceName: globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.serviceName')
                ? globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.serviceName')
                : 'Default service name',
            // autoCloseOnLaterReloadSuccess: globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.autoCloseOnLaterReloadSuccess')
            //     ? globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.autoCloseOnLaterReloadSuccess')
            //     : false,
        };
    } catch (err) {
        globals.logger.error(`SIGNL4: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Sends a SIGNL4 notification.
 * @param {Object} incidentConfig - Configuration for the incident.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
async function sendSignl4(incidentConfig, reloadParams) {
    try {
        // Build body for HTTP POST
        const axiosRequest = {
            url: incidentConfig.url,
            method: 'post',
            timeout: HTTP_TIMEOUT_SHORT_MS,
            data: {
                Title: incidentConfig.event,
                Message: `Task: ${reloadParams.taskName}`,
                Severity: incidentConfig.severity,
                'X-S4-Service': incidentConfig.serviceName,
                'X-S4-ExternalID': reloadParams.taskId,
                'X-S4-Status': 'new',
            },
            headers: { 'Content-Type': 'application/json' },
        };

        const response = await axios.request(axiosRequest);
        globals.logger.debug(`SIGNL4: Webhook response: ${response}`);
    } catch (err) {
        globals.logger.error(`SIGNL4: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends a notification for a reload task failure.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
export function sendReloadTaskFailureNotification(reloadParams) {
    rateLimiterFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `SIGNL4 RELOAD TASK FAILED ALERT: Rate limiting check passed for failed task notification. Task name: "${reloadParams.taskName}"`,
                );
                globals.logger.verbose(
                    `SIGNL4 RELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const incidentConfig = getReloadFailedEventConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                sendSignl4(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`SIGNL4 RELOAD TASK FAILED ALERT: ${globals.getErrorMessage(err)}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `SIGNL4 RELOAD TASK FAILED ALERT: Rate limiting failed. Not sending reload failure notification to Signl4 for task "${reloadParams.taskName}"`,
            );
            globals.logger.verbose(`SIGNL4 RELOAD TASK FAILED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

/**
 * Sends a notification for a reload task aborted.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
export function sendReloadTaskAbortedNotification(reloadParams) {
    rateLimiterAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `SIGNL4 RELOAD TASK ABORTED ALERT: Rate limiting check passed for aborted task notification. Task name: "${reloadParams.taskName}"`,
                );
                globals.logger.verbose(
                    `SIGNL4 RELOAD TASK ABORTED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`,
                );

                // Make sure outgoing webhooks are enabled in the config file and that we have all required settings
                const incidentConfig = getReloadAbortedEventConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                sendSignl4(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`SIGNL4 RELOAD TASK ABORTED ALERT: ${globals.getErrorMessage(err)}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `SIGNL4 RELOAD TASK ABORTED ALERT: Rate limiting failed. Not sending reload aborted notification to Signl4 for task "${reloadParams.taskName}"`,
            );
            globals.logger.verbose(`SIGNL4 RELOAD TASK ABORTED ALERT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}
