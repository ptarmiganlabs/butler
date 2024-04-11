import { RateLimiterMemory } from 'rate-limiter-flexible';
import axios from 'axios';
import fs from 'fs';
import https from 'https';

import globals from '../globals.js';
import getAppOwner from '../qrs_util/get_app_owner.js';

let rateLimiterMemoryFailedReloads;
let rateLimiterMemoryAbortedReloads;
let rateLimiterMemoryServiceMonitor;

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

if (globals.config.has('Butler.webhookNotification.serviceMonitor.rateLimit')) {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.webhookNotification.serviceMonitor.rateLimit'),
    });
} else {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
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
            globals.logger.error(
                'WEBHOOK OUT RELOAD TASK FAILED: Reload failure outgoing webhook config info missing in Butler config file'
            );
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
        globals.logger.error(`WEBHOOK OUT RELOAD TASK FAILED: ${err}`);
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
            globals.logger.error(
                'WEBHOOK OUT RELOAD TASK ABORTED: Reload aborted outgoing webhook config info missing in Butler config file'
            );
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
        globals.logger.error(`WEBHOOK OUT RELOAD TASK ABORTED: ${err}`);
        return false;
    }
}

function getOutgoingWebhookServiceMonitorConfig() {
    try {
        // First make sure outgoing webhooks are enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.webhookNotification.enable') ||
            !globals.config.has('Butler.webhookNotification.serviceMonitor.webhooks') ||
            !globals.config.has('Butler.webhookNotification.serviceMonitor.rateLimit') ||
            !globals.config.has('Butler.serviceMonitor.alertDestination.webhook.enable')
        ) {
            // Not enough info in config file
            globals.logger.error('SERVICE MONITOR WEBHOOK: Service monitor outgoing webhook config info missing in Butler config file');

            if (!globals.config.has('Butler.webhookNotification.enable')) {
                globals.logger.error('SERVICE MONITOR WEBHOOK: Missing config entry "Butler.webhookNotification.enable"');
            }

            if (!globals.config.has('Butler.webhookNotification.serviceMonitor.webhooks')) {
                globals.logger.error('SERVICE MONITOR WEBHOOK: Missing config entry "Butler.webhookNotification.serviceMonitor.webhooks"');
            }

            if (!globals.config.has('Butler.webhookNotification.serviceMonitor.rateLimit')) {
                globals.logger.error('SERVICE MONITOR WEBHOOK: Missing config entry "Butler.webhookNotification.serviceMonitor.rateLimit"');
            }

            if (!globals.config.has('Butler.serviceMonitor.alertDestination.webhook.enable')) {
                globals.logger.error(
                    'SERVICE MONITOR WEBHOOK: Missing config entry "Butler.serviceMonitor.alertDestination.webhook.enable"'
                );
            }

            return false;
        }

        return {
            event: 'Windows service monitor',
            rateLimit: globals.config.has('Butler.webhookNotification.serviceMonitor.rateLimit')
                ? globals.config.get('Butler.webhookNotification.serviceMonitor.rateLimit')
                : '',
            webhooks: globals.config.get('Butler.webhookNotification.serviceMonitor.webhooks'),
        };
    } catch (err) {
        globals.logger.error(`SERVICE MONITOR WEBHOOK: ${err}`);
        return false;
    }
}

async function sendOutgoingWebhook(webhookConfig, reloadParams) {
    try {
        // webhookConfig.webhooks contains an array of all outgoing webhooks that should be processed

        // Get app owner
        const appOwner = await getAppOwner(reloadParams.appId);

        // Is webhookConfig.webhooks non-null, i.e. are there any webhooiks to process?
        if (webhookConfig.webhooks) {
            // eslint-disable-next-line no-restricted-syntax
            for (const webhook of webhookConfig.webhooks) {
                globals.logger.info(`WEBHOOKOUT: Processing webhook "${webhook.description}"`);
                globals.logger.debug(`WEBHOOKOUT: Webhook details ${JSON.stringify(webhook)}`);

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
                        throw new Error(`Invalid HTTP method in outgoing webhook: ${webhook.httpMethod}`);
                    }

                    // 3. If a custom certificate is specified, make sure it and related settings are valid
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Make sure webhook.cert.rejectUnauthorized is a boolean
                        if (typeof webhook.cert.rejectUnauthorized !== 'boolean') {
                            throw new Error('WEBHOOKOUT: Webhook cert.rejectUnauthorized property should be a boolean ');
                        }

                        // Make sure CA cert file in webhook.cert.certCA is a string
                        if (typeof webhook.cert.certCA !== 'string') {
                            throw new Error('WEBHOOKOUT: Webhook cert.certCA property should be a string');
                        }

                        // Make sure the CA cert file exists
                        if (!fs.existsSync(webhook.cert.certCA)) {
                            throw new Error(`WEBHOOKOUT: CA cert file not found: ${webhook.cert.certCA}`);
                        }
                    }
                } catch (err) {
                    globals.logger.error(`WEBHOOKOUT: ${err}. Invalid outgoing webhook config: ${JSON.stringify(webhook, null, 2)}`);
                    throw err;
                }

                globals.logger.debug(`WEBHOOKOUT: Webhook config is valid: ${JSON.stringify(webhook)}`);

                axiosRequest = {
                    timeout: 10000,
                };

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
                    params.append('appOwnerName', appOwner.userName);
                    params.append('appOwnerUserDirectory', appOwner.directory);
                    params.append('appOwnerUserId', appOwner.userId);
                    params.append('appOwnerEmail', appOwner.emails?.length > 0 ? appOwner.emails[0] : '');
                    params.append('logTimeStamp', reloadParams.logTimeStamp);
                    params.append('logLevel', reloadParams.logLevel);
                    params.append('executionId', reloadParams.executionId);
                    params.append('logMessage', reloadParams.logMessage);

                    url.search = params.toString();

                    globals.logger.silly(`WEBHOOKOUT: Final GET webhook URL: ${url.toString()}`);

                    axiosRequest.method = 'get';
                    axiosRequest.url = url.toString();

                    // If a custom certificate is specified, add it to the axios request
                    // Create a new https agent with the custom certificate
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Read CA cert
                        const caCert = fs.readFileSync(webhook.cert.certCA);

                        // Creating an HTTPS agent with the CA certificate and rejectUnauthorized flag
                        const agent = new https.Agent({ ca: caCert, rejectUnauthorized: webhook.cert.rejectUnauthorized });

                        // Add agent to Axios config
                        axiosRequest.httpsAgent = agent;
                    }
                } else if (lowercaseMethod === 'put') {
                    // Build body for PUT call
                    axiosRequest = {
                        method: 'put',
                        url: url.toString(),
                        data: {
                            event: webhookConfig.event,
                            hostName: reloadParams.hostName,
                            user: reloadParams.user,
                            taskName: reloadParams.taskName,
                            taskId: reloadParams.taskId,
                            appName: reloadParams.appName,
                            appId: reloadParams.appId,
                            appOwnerName: appOwner.userName,
                            appOwnerUserDirectory: appOwner.directory,
                            appOwnerUserId: appOwner.userId,
                            appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
                            logTimeStamp: reloadParams.logTimeStamp,
                            logLevel: reloadParams.logLevel,
                            executionId: reloadParams.executionId,
                            logMessage: reloadParams.logMessage,
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };

                    // If a custom certificate is specified, add it to the axios request
                    // Create a new https agent with the custom certificate
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Read CA cert
                        const caCert = fs.readFileSync(webhook.cert.certCA);

                        // Creating an HTTPS agent with the CA certificate and rejectUnauthorized flag
                        const agent = new https.Agent({ ca: caCert, rejectUnauthorized: webhook.cert.rejectUnauthorized });

                        // Add agent to Axios config
                        axiosRequest.httpsAgent = agent;
                    }
                } else if (lowercaseMethod === 'post') {
                    // Build body for POST call
                    axiosRequest = {
                        method: 'post',
                        url: url.toString(),
                        data: {
                            event: webhookConfig.event,
                            hostName: reloadParams.hostName,
                            user: reloadParams.user,
                            taskName: reloadParams.taskName,
                            taskId: reloadParams.taskId,
                            appName: reloadParams.appName,
                            appId: reloadParams.appId,
                            appOwnerName: appOwner.userName,
                            appOwnerUserDirectory: appOwner.directory,
                            appOwnerUserId: appOwner.userId,
                            appOwnerEmail: appOwner.emails?.length > 0 ? appOwner.emails[0] : '',
                            logTimeStamp: reloadParams.logTimeStamp,
                            logLevel: reloadParams.logLevel,
                            executionId: reloadParams.executionId,
                            logMessage: reloadParams.logMessage,
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };

                    // If a custom certificate is specified, add it to the axios request
                    // Create a new https agent with the custom certificate
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Read CA cert
                        const caCert = fs.readFileSync(webhook.cert.certCA);

                        // Creating an HTTPS agent with the CA certificate and rejectUnauthorized flag
                        const agent = new https.Agent({ ca: caCert, rejectUnauthorized: webhook.cert.rejectUnauthorized });

                        // Add agent to Axios config
                        axiosRequest.httpsAgent = agent;
                    }
                }

                // eslint-disable-next-line no-await-in-loop
                const response = await axios.request(axiosRequest);
                globals.logger.debug(`WEBHOOKOUT: Webhook response: ${response}`);
            }
        } else {
            globals.logger.info('WEBHOOKOUT: No outgoing webhooks to process');
        }
    } catch (err) {
        if (err.message) {
            globals.logger.error(`WEBHOOKOUT 1 message: ${err.message}`);
        }

        if (err.stack) {
            globals.logger.error(`WEBHOOKOUT 1 stack: ${err.stack}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`WEBHOOKOUT 1: ${JSON.stringify(err, null, 2)}`);
        }
    }
}

async function sendOutgoingWebhookServiceMonitor(webhookConfig, serviceParams) {
    try {
        // webhookConfig.webhooks contains an array of all outgoing webhooks that should be processed

        // Is webhookConfig.webhooks non-null, i.e. are there any webhooiks to process?
        if (webhookConfig.webhooks) {
            // eslint-disable-next-line no-restricted-syntax
            for (const webhook of webhookConfig.webhooks) {
                globals.logger.info(`SERVICE MONITOR WEBHOOKOUT: Processing webhook "${webhook.description}"`);
                globals.logger.debug(`SERVICE MONITOR WEBHOOKOUT: Webhook details ${JSON.stringify(webhook)}`);

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
                        throw new Error(`Invalid HTTP method in outgoing webhook: ${webhook.httpMethod}`);
                    }

                    // 3. If a custom certificate is specified, make sure it and related settings are valid
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Make sure webhook.cert.rejectUnauthorized is a boolean
                        if (typeof webhook.cert.rejectUnauthorized !== 'boolean') {
                            throw new Error('WEBHOOKOUT: Webhook cert.rejectUnauthorized property should be a boolean ');
                        }

                        // Make sure CA cert file in webhook.cert.certCA is a string
                        if (typeof webhook.cert.certCA !== 'string') {
                            throw new Error('WEBHOOKOUT: Webhook cert.certCA property should be a string');
                        }

                        // Make sure the CA cert file exists
                        if (!fs.existsSync(webhook.cert.certCA)) {
                            throw new Error(`WEBHOOKOUT: CA cert file not found: ${webhook.cert.certCA}`);
                        }
                    }
                } catch (err) {
                    globals.logger.error(
                        `SERVICE MONITOR WEBHOOKOUT: ${err}. Invalid outgoing webhook config: ${JSON.stringify(webhook, null, 2)}`
                    );
                    throw err;
                }

                globals.logger.debug(`SERVICE MONITOR WEBHOOKOUT: Webhook config is valid: ${JSON.stringify(webhook)}`);

                axiosRequest = {
                    timeout: 10000,
                };

                if (lowercaseMethod === 'get') {
                    // Build parameter string for GET call
                    const params = new URLSearchParams();
                    params.append('event', webhookConfig.event);
                    params.append('host', serviceParams.host);
                    params.append('servicestatus', serviceParams.serviceStatus);
                    params.append('servicename', serviceParams.serviceName);
                    params.append('servicedisplayname', serviceParams.serviceDetails.displayName);
                    params.append('servicestarttype', serviceParams.serviceDetails.startType);
                    params.append('prevstate', serviceParams.prevState);
                    params.append('currstate', serviceParams.currState);
                    params.append('statechanged', serviceParams.stateChanged);

                    url.search = params.toString();

                    globals.logger.silly(`SERVICE MONITOR WEBHOOKOUT: Final GET webhook URL: ${url.toString()}`);

                    axiosRequest.method = 'get';
                    axiosRequest.url = url.toString();

                    // If a custom certificate is specified, add it to the axios request
                    // Create a new https agent with the custom certificate
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Read CA cert
                        const caCert = fs.readFileSync(webhook.cert.certCA);

                        // Creating an HTTPS agent with the CA certificate and rejectUnauthorized flag
                        const agent = new https.Agent({ ca: caCert, rejectUnauthorized: webhook.cert.rejectUnauthorized });

                        // Add agent to Axios config
                        axiosRequest.httpsAgent = agent;
                    }
                } else if (lowercaseMethod === 'put') {
                    // Build body for PUT call
                    axiosRequest = {
                        method: 'put',
                        url: url.toString(),
                        data: {
                            event: webhookConfig.event,
                            host: serviceParams.host,
                            serviceStatus: serviceParams.serviceStatus,
                            serviceName: serviceParams.serviceName,
                            serviceDisplayName: serviceParams.serviceDetails.displayName,
                            serviceStartType: serviceParams.serviceDetails.startType,
                            prevState: serviceParams.prevState,
                            currState: serviceParams.currState,
                            stateChanged: serviceParams.stateChanged,
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };

                    // If a custom certificate is specified, add it to the axios request
                    // Create a new https agent with the custom certificate
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Read CA cert
                        const caCert = fs.readFileSync(webhook.cert.certCA);

                        // Creating an HTTPS agent with the CA certificate and rejectUnauthorized flag
                        const agent = new https.Agent({ ca: caCert, rejectUnauthorized: webhook.cert.rejectUnauthorized });

                        // Add agent to Axios config
                        axiosRequest.httpsAgent = agent;
                    }
                } else if (lowercaseMethod === 'post') {
                    // Build body for POST call
                    axiosRequest = {
                        method: 'post',
                        url: url.toString(),
                        data: {
                            event: webhookConfig.event,
                            host: serviceParams.host,
                            serviceStatus: serviceParams.serviceStatus,
                            serviceName: serviceParams.serviceName,
                            serviceDisplayName: serviceParams.serviceDetails.displayName,
                            serviceStartType: serviceParams.serviceDetails.startType,
                            prevState: serviceParams.prevState,
                            currState: serviceParams.currState,
                            stateChanged: serviceParams.stateChanged,
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };

                    // If a custom certificate is specified, add it to the axios request
                    // Create a new https agent with the custom certificate
                    if (webhook.cert && webhook.cert.enable === true) {
                        // Read CA cert
                        const caCert = fs.readFileSync(webhook.cert.certCA);

                        // Creating an HTTPS agent with the CA certificate and rejectUnauthorized flag
                        const agent = new https.Agent({ ca: caCert, rejectUnauthorized: webhook.cert.rejectUnauthorized });

                        // Add agent to Axios config
                        axiosRequest.httpsAgent = agent;
                    }
                }

                // eslint-disable-next-line no-await-in-loop
                const response = await axios.request(axiosRequest);
                globals.logger.debug(`SERVICE MONITOR WEBHOOKOUT: Webhook response: ${response}`);
            }
        } else {
            globals.logger.info('SERVICE MONITOR WEBHOOKOUT: No outgoing webhooks to process');
        }
    } catch (err) {
        if (err.message) {
            globals.logger.error(`SERVICE MONITOR WEBHOOKOUT 1 message: ${err.message}`);
        }

        if (err.stack) {
            globals.logger.error(`SERVICE MONITOR WEBHOOKOUT 1 stack: ${err.stack}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`SERVICE MONITOR WEBHOOKOUT 1: ${JSON.stringify(err, null, 2)}`);
        }
    }
}

export function sendReloadTaskFailureNotificationWebhook(reloadParams) {
    rateLimiterMemoryFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `WEBHOOK OUT RELOAD TASK FAILED: Rate limiting check passed for failed task notification. Task name: "${reloadParams.taskName}"`
                );
                globals.logger.verbose(
                    `WEBHOOK OUT RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
                );

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const webhookConfig = getOutgoingWebhookReloadFailedNotificationConfigOk();
                if (webhookConfig === false) {
                    return 1;
                }

                sendOutgoingWebhook(webhookConfig, reloadParams);
            } catch (err) {
                globals.logger.error(`WEBHOOK OUT RELOAD TASK FAILED: ${err}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `WEBHOOK OUT RELOAD TASK FAILED: Rate limiting failed. Not sending reload failure notification via outgoing webhook for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(`WEBHOOK OUT RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

export function sendReloadTaskAbortedNotificationWebhook(reloadParams) {
    rateLimiterMemoryAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `WEBHOOK OUT RELOAD TASK ABORTED: Rate limiting check passed for aborted task notification. Task name: "${reloadParams.taskName}"`
                );
                globals.logger.verbose(
                    `WEBHOOK OUT RELOAD TASK ABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
                );

                // Make sure outgoing webhooks are enabled in the config file and that we have all required settings
                const webhookConfig = getOutgoingWebhookReloadAbortedNotificationConfigOk();
                if (webhookConfig === false) {
                    return 1;
                }

                sendOutgoingWebhook(webhookConfig, reloadParams);
            } catch (err) {
                globals.logger.error(`WEBHOOK OUT RELOAD TASK ABORTED: ${err}`);
            }
            return true;
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `WEBHOOK OUT RELOAD TASK ABORTED: Rate limiting failed. Not sending reload aborted notification via outgoing webhook for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(`WEBHOOK OUT RELOAD TASK ABORTED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

export function sendServiceMonitorWebhook(svc) {
    rateLimiterMemoryServiceMonitor
        .consume(`${svc.host}|${svc.serviceName}`, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `SERVICE MONITOR WEBHOOK: Rate limiting check passed for service monitor notification. Service name: "${svc.serviceName}"`
                );
                globals.logger.verbose(`SERVICE MONITOR WEBHOOK: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Make sure we have all required settings
                const webhookConfig = getOutgoingWebhookServiceMonitorConfig();
                if (webhookConfig === false) {
                    return 1;
                }

                sendOutgoingWebhookServiceMonitor(webhookConfig, {
                    host: svc.host,
                    serviceName: svc.serviceName,
                    serviceDisplayName: svc.serviceDetails.displayName,
                    serviceFriendlyName: svc.serviceFriendlyName,
                    serviceStatus: svc.serviceStatus,
                    serviceDetails: svc.serviceDetails,
                    prevState: svc.prevState,
                    currState: svc.currState,
                    stateChanged: svc.stateChanged,
                });
            } catch (err) {
                globals.logger.error(`SERVICE MONITOR WEBHOOK: ${err}`);
            }
            return 0;
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `WEBHOOK OUT RELOAD TASK FAILED: Rate limiting failed. Not sending service monitor notification via outgoing webhook for service "${svc.serviceName}"`
            );
            globals.logger.verbose(`WEBHOOK OUT RELOAD TASK FAILED: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}
