const { RateLimiterMemory } = require('rate-limiter-flexible');
const axios = require('axios');

const globals = require('../globals');

let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;

if (globals.config.has('Butler.webhookNotification.reloadTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.webhookNotification.reloadTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.webhookNotification.reloadTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.webhookNotification.reloadTaskAborted.rateLimit'),
    });
} else {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

function getOutgoingWebhookReloadFailedNotificationConfigOk() {
    try {
        // First make sure outgoing webhooks are enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.webhookNotification.reloadTaskFailure') ||
            !globals.config.has('Butler.webhookNotification.reloadTaskFailure.webhooks')
        ) {
            // Not enough info in config file
            globals.logger.error('WEBHOOKOUTFAILED: Reload failure outgoing webhook config info missing in Butler config file');
            return false;
        }

        return {
            event: 'Qlik Sense reload failed',
            rateLimit: globals.config.has('Butler.webhookNotification.reloadTaskFailure.rateLimit')
                ? globals.config.get('Butler.webhookNotification.reloadTaskFailure.rateLimit')
                : '',
            webhooks: globals.config.get('Butler.webhookNotification.reloadTaskFailure.webhooks'),
        };
    } catch (err) {
        globals.logger.error(`WEBHOOKOUTFAILED: ${err}`);
        return false;
    }
}

function getOutgoingWebhookReloadAbortedNotificationConfigOk() {
    try {
        // First make sure outgoing webhooks are enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.webhookNotification.reloadTaskAborted') ||
            !globals.config.has('Butler.webhookNotification.reloadTaskAborted.webhooks')
        ) {
            // Not enough info in config file
            globals.logger.error('WEBHOOKOUTABORTED: Reload aborted outgoing webhook config info missing in Butler config file');
            return false;
        }

        return {
            event: 'Qlik Sense reload aborted',
            rateLimit: globals.config.has('Butler.webhookNotification.reloadTaskAborted.rateLimit')
                ? globals.config.get('Butler.webhookNotification.reloadTaskAborted.rateLimit')
                : '',
            webhooks: globals.config.get('Butler.webhookNotification.reloadTaskAborted.webhooks'),
        };
    } catch (err) {
        globals.logger.error(`WEBHOOKOUTABORTED: ${err}`);
        return false;
    }
}

async function sendOutgoingWebhook(webhookConfig, reloadParams) {
    try {
        // webhookConfig.webhooks contains an array of all outgoing webhooks that should be processed

        // eslint-disable-next-line no-restricted-syntax
        for (const webhook of webhookConfig.webhooks) {
            globals.logger.debug(`WEBHOOKOUT: Processing webhook ${JSON.stringify(webhook)}`);

            // Only process the webhook if all required info is available
            let lowercaseMethod = null;
            let url = null;
            let axiosRequest = null;

            try {
                // 1. Make sure the webhook URL is a valid URL.
                // If the URL is not valid an error will be thrown
                url = new URL(webhook.webhookURL);

                // 2. Make sure the HTTP method is one of the supported ones
                lowercaseMethod = webhook.httpMethod.toLowerCase();
                if (lowercaseMethod !== 'get' && lowercaseMethod !== 'post' && lowercaseMethod !== 'put') {
                    throw `Invalid HTTP method in outgoing webhook: ${webhook.httpMethod}`;
                }
            } catch (err) {
                globals.logger.error(`WEBHOOKOUT: ${err}. Invalid outgoing webhook config: ${JSON.stringify(webhook, null, 2)}`);
                throw err;
            }

            globals.logger.silly(`WEBHOOKOUT: Webhook config is valid: ${JSON.stringify(webhook)}`);

            if (lowercaseMethod === 'get') {
                // Build parameter string for GET call
                const params = new URLSearchParams();
                params.append('event', webhookConfig.event);
                params.append('hostName', reloadParams.hostName);
                params.append('user', reloadParams.user);
                params.append('taskName', reloadParams.taskName);
                params.append('taskId', reloadParams.taskId);
                params.append('appName', reloadParams.appName);
                params.append('appId', reloadParams.appId);
                params.append('logTimeStamp', reloadParams.logTimeStamp);
                params.append('logLevel', reloadParams.logLevel);
                params.append('executionId', reloadParams.executionId);
                params.append('logMessage', reloadParams.logMessage);

                url.search = params.toString();

                globals.logger.silly(`WEBHOOKOUT: Final GET webhook URL: ${url.toString()}`);

                axiosRequest = {
                    url: url.toString(),
                    method: 'get',
                    timeout: 10000,
                };
            } else if (lowercaseMethod === 'put') {
                // Build body for PUT call
                axiosRequest = {
                    url: url.toString(),
                    method: 'put',
                    timeout: 10000,
                    data: {
                        event: webhookConfig.event,
                        hostName: reloadParams.hostName,
                        user: reloadParams.user,
                        taskName: reloadParams.taskName,
                        taskId: reloadParams.taskId,
                        appName: reloadParams.appName,
                        appId: reloadParams.appId,
                        logTimeStamp: reloadParams.logTimeStamp,
                        logLevel: reloadParams.logLevel,
                        executionId: reloadParams.executionId,
                        logMessage: reloadParams.logMessage,
                    },
                    headers: { 'Content-Type': 'application/json' },
                };
            } else if (lowercaseMethod === 'post') {
                // Build body for POST call
                axiosRequest = {
                    url: url.toString(),
                    method: 'post',
                    timeout: 10000,
                    data: {
                        event: webhookConfig.event,
                        hostName: reloadParams.hostName,
                        user: reloadParams.user,
                        taskName: reloadParams.taskName,
                        taskId: reloadParams.taskId,
                        appName: reloadParams.appName,
                        appId: reloadParams.appId,
                        logTimeStamp: reloadParams.logTimeStamp,
                        logLevel: reloadParams.logLevel,
                        executionId: reloadParams.executionId,
                        logMessage: reloadParams.logMessage,
                    },
                    headers: { 'Content-Type': 'application/json' },
                };
            }

            // eslint-disable-next-line no-await-in-loop
            const response = await axios.request(axiosRequest);
            globals.logger.debug(`WEBHOOKOUT: Webhook response: ${response}`);
        }
    } catch (err) {
        globals.logger.error(`WEBHOOKOUT: ${JSON.stringify(err, null, 2)}`);
    }
}

function sendReloadTaskFailureNotificationWebhook(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `WEBHOOKOUTFAILED: Rate limiting ok: Sending reload failure notification outgoing webhook for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(`WEBHOOKOUTFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const webhookConfig = getOutgoingWebhookReloadFailedNotificationConfigOk();
                if (webhookConfig === false) {
                    return 1;
                }

                sendOutgoingWebhook(webhookConfig, reloadParams);
            } catch (err) {
                globals.logger.error(`WEBHOOKOUTFAILED: ${err}`);
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `WEBHOOKOUTFAILED: Rate limiting failed. Not sending reload failure notification via outgoing webhook for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(`WEBHOOKOUTFAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

function sendReloadTaskAbortedNotificationWebhook(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `WEBHOOKOUTABORTED: Rate limiting ok: Sending reload aborted notification via outgoing webhook for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(`WEBHOOKOUTABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure outgoing webhooks are enabled in the config file and that we have all required settings
                const webhookConfig = getOutgoingWebhookReloadAbortedNotificationConfigOk();
                if (webhookConfig === false) {
                    return 1;
                }

                sendOutgoingWebhook(webhookConfig, reloadParams);
            } catch (err) {
                globals.logger.error(`WEBHOOKOUTABORTED: ${err}`);
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `WEBHOOKOUTABORTED: Rate limiting failed. Not sending reload aborted notification via outgoing webhook for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(`WEBHOOKOUTABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

module.exports = {
    sendReloadTaskFailureNotificationWebhook,
    sendReloadTaskAbortedNotificationWebhook,
};
