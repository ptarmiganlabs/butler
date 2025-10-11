import axios from 'axios';

import QrsClient from '../qrs_client.js';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import globals from '../../globals.js';
import { HTTP_TIMEOUT_SHORT_MS } from '../../constants.js';

/**
 * Retrieves the QRS configuration.
 * @returns {Object} Configuration object for QRS.
 */
function getQRSConfig() {
    const cfg = {
        hostname: globals.config.get('Butler.configQRS.host'),
        portNumber: globals.config.get('Butler.configQRS.port'),
        certificates: {
            certFile: globals.configQRS.certPaths.certPath,
            keyFile: globals.configQRS.certPaths.keyPath,
        },
    };

    // Merge YAML-configured headers with hardcoded headers
    cfg.headers = {
        ...globals.getQRSHttpHeaders(),
        'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
    };

    return cfg;
}

let rateLimiterFailedReloadsEvent;
let rateLimiterFailedReloadsLog;
let rateLimiterAbortedReloadsEvent;
let rateLimiterAbortedReloadsLog;

if (globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit')) {
    rateLimiterFailedReloadsEvent = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit'),
    });

    rateLimiterFailedReloadsLog = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit'),
    });
} else {
    rateLimiterFailedReloadsEvent = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });

    rateLimiterFailedReloadsLog = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit')) {
    rateLimiterAbortedReloadsEvent = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit'),
    });

    rateLimiterAbortedReloadsLog = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit'),
    });
} else {
    rateLimiterAbortedReloadsEvent = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });

    rateLimiterAbortedReloadsLog = new RateLimiterMemory({
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
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEW RELIC RELOAD FAILED EVENT: Reload failure New Relic event config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header')) {
                headers[item.name] = item.value;
            }
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Get event-specific static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Add dynamic attributes
        attributes.version = globals.appVersion;

        const cfg = {
            eventType: 'qs_reloadTaskFailedEvent',
            url:
                globals.config.get('Butler.incidentTool.newRelic.url.event').slice(-1) === '/'
                    ? globals.config.get('Butler.incidentTool.newRelic.url.event')
                    : `${globals.config.get('Butler.incidentTool.newRelic.url.event')}/`,
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit')
                : '',
            headers,
            attributes,
        };

        return cfg;
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(`NEW RELIC RELOADFAILEDEVENT message: ${globals.getErrorMessage(err)}`);
        } else {
            globals.logger.error(`NEW RELIC RELOADFAILEDEVENT stack: ${globals.getErrorMessage(err)}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`NEW RELIC RELOADFAILEDEVENT: ${globals.getErrorMessage(err)}`);
        }

        return false;
    }
}

/**
 * Retrieves the configuration for a reload failed log.
 * @returns {Object|boolean} Configuration object if successful, false otherwise.
 */
function getReloadFailedLogConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEW RELIC RELOADFAILEDLOG: Reload failure New Relic log config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header')) {
                headers[item.name] = item.value;
            }
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Get log-specific attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Add dynamic attributes
        attributes.version = globals.appVersion;

        const cfg = {
            logType: 'qs_reloadTaskFailedLog',
            url: globals.config.get('Butler.incidentTool.newRelic.url.log'),
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit')
                : '',
            headers,
            attributes,
        };

        return cfg;
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(`NEW RELIC RELOADFAILEDLOG message: ${globals.getErrorMessage(err)}`);
        } else {
            globals.logger.error(`NEW RELIC RELOADFAILEDLOG stack: ${globals.getErrorMessage(err)}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`NEW RELIC RELOADFAILEDLOG: ${globals.getErrorMessage(err)}`);
        }

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
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEW RELIC RELOADABORTEDEVENT: Reload aborted New Relic event config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header')) {
                headers[header.name] = header.value;
            }
        }

        // Add static attributes
        const attributes = {};

        // Get shared static settings
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static')) {
                attributes[header.name] = header.value;
            }
        }

        // Get event-specific static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Add dynamic attributes
        attributes.version = globals.appVersion;

        const cfg = {
            eventType: 'qs_reloadTaskAbortedEvent',
            url:
                globals.config.get('Butler.incidentTool.newRelic.url.event').slice(-1) === '/'
                    ? globals.config.get('Butler.incidentTool.newRelic.url.event')
                    : `${globals.config.get('Butler.incidentTool.newRelic.url.event')}/`,
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit')
                : '',
            headers,
            attributes,
        };

        return cfg;
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(`NEW RELIC RELOADABORTEDEVENT message: ${globals.getErrorMessage(err)}`);
        } else {
            globals.logger.error(`NEW RELIC RELOADABORTEDEVENT stack: ${globals.getErrorMessage(err)}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`NEW RELIC RELOADABORTEDEVENT: ${globals.getErrorMessage(err)}`);
        }

        return false;
    }
}

/**
 * Retrieves the configuration for a reload aborted log.
 * @returns {Object|boolean} Configuration object if successful, false otherwise.
 */
function getReloadAbortedLogConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEW RELIC RELOADABORTEDLOG: Reload aborted New Relic log config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header')) {
                headers[item.name] = item.value;
            }
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Get log-specific attributes
        if (globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Add dynamic attributes
        attributes.version = globals.appVersion;

        const cfg = {
            logType: 'qs_reloadTaskAbortedLog',
            url: globals.config.get('Butler.incidentTool.newRelic.url.log'),
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit')
                : '',
            headers,
            attributes,
        };

        return cfg;
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(`NEW RELIC RELOADABORTEDLOG message: ${globals.getErrorMessage(err)}`);
        } else {
            globals.logger.error(`NEW RELIC RELOADABORTEDLOG stack: ${globals.getErrorMessage(err)}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`NEW RELIC RELOADABORTEDLOG: ${globals.getErrorMessage(err)}`);
        }

        return false;
    }
}

/**
 * Sends a New Relic event.
 * @param {Object} incidentConfig - Configuration for the incident.
 * @param {Object} reloadParams - Parameters for the reload task.
 * @param {Array} destNewRelicAccounts - Destination New Relic accounts.
 */
export async function sendNewRelicEvent(incidentConfig, reloadParams, destNewRelicAccounts) {
    try {
        // Build final payload
        const payload = [];

        if (
            incidentConfig?.eventType === 'qs_reloadTaskAbortedEvent' ||
            incidentConfig?.eventType === 'qs_reloadTaskFailedEvent' ||
            incidentConfig?.logType === 'qs_reloadTaskFailedLog'
        ) {
            payload.push(Object.assign(incidentConfig.attributes, reloadParams));
        } else if (incidentConfig?.eventType === 'qs_serviceStateEvent') {
            payload.push(incidentConfig.attributes);
        }

        // New Relic event type. Required field in call to New Relic API
        payload[0].eventType = incidentConfig.eventType;

        // Get custom http headers
        const { headers } = incidentConfig;

        // Get array of all NR accounts defined in the config file
        const nrAccounts = globals.config.Butler.thirdPartyToolsCredentials.newRelic;

        // Verbose: Show what New Relic account names/API keys/account IDs have been defined
        globals.logger.verbose(`NEW RELIC EVENT: Account names/API keys/account IDs: ${JSON.stringify(nrAccounts, null, 2)}`);

        // Send to New Relic
        // eslint-disable-next-line no-restricted-syntax
        for (const accountName of destNewRelicAccounts) {
            globals.logger.debug(`NEW RELIC EVENT: Current loop New Relic account name=${JSON.stringify(accountName)}`);

            // Is there any config available for the current account?
            const newRelicConfig = nrAccounts.filter((item) => item.accountName === accountName);
            if (newRelicConfig.length === 0) {
                globals.logger.error(`NEW RELIC EVENT: New Relic account name "${accountName}" does not exist in the Butler config file.`);
            } else {
                headers['Api-Key'] = newRelicConfig[0].insertApiKey;
                const newRelicAccountId = newRelicConfig[0].accountId;

                const eventApiUrl = `${incidentConfig.url}v1/accounts/${newRelicAccountId}/events`;

                // Build body for HTTP POST
                const axiosRequest = {
                    url: eventApiUrl,
                    method: 'post',
                    timeout: HTTP_TIMEOUT_SHORT_MS,
                    data: payload,
                    headers,
                };

                // eslint-disable-next-line no-await-in-loop
                const res = await axios.request(axiosRequest);
                globals.logger.debug(
                    `NEW RELIC EVENT: Result code from posting event to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`,
                );

                if (res.status === 200 || res.status === 202) {
                    // Posting done without error
                    globals.logger.verbose(`NEW RELIC EVENT: Sent event New Relic account ${newRelicConfig[0].accountId}`);
                } else {
                    globals.logger.error(
                        `NEW RELIC EVENT: Error code from posting event to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`,
                    );
                }
            }
        }
    } catch (err) {
        if (err.message) {
            globals.logger.error(`NEW RELIC 1 message: ${globals.getErrorMessage(err)}`);
        } else {
            globals.logger.error(`NEW RELIC 1 stack: ${globals.getErrorMessage(err)}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`NEW RELIC 1: ${globals.getErrorMessage(err)}`);
        }
    }
}

/**
 * Sends a New Relic log.
 * @param {Object} incidentConfig - Configuration for the incident.
 * @param {Object} reloadParams - Parameters for the reload task.
 * @param {Array} destNewRelicAccounts - Destination New Relic accounts.
 */
export async function sendNewRelicLog(incidentConfig, reloadParams, destNewRelicAccounts) {
    try {
        // Build final URL
        const logApiUrl = incidentConfig.url;

        // Build final payload
        const payload = [{ common: {}, logs: [] }];

        // Only add script logs if we're sending reload task failures or aborts to New Relic
        if (incidentConfig?.logType === 'qs_reloadTaskAbortedLog' || incidentConfig?.logType === 'qs_reloadTaskFailedLog') {
            // Set New Relic attributes/dimensions, both shared and log-specific ones
            payload[0].common.attributes = Object.assign(incidentConfig.attributes, reloadParams);

            // Get script logs
            const scriptLogData = reloadParams.scriptLog;

            // Handle case where scriptLog retrieval failed
            if (scriptLogData === null || scriptLogData === undefined) {
                globals.logger.warn(
                    `[QSEOW] NEW RELIC: Script log data is not available. Log entry will be sent to New Relic without script log details.`,
                );

                // Set minimal log message without script log data
                const logMessage = {
                    message: `Script log not available for this reload task.`,
                };
                payload[0].logs.push(logMessage);
            } else {
                // Reduce script log lines to only the ones we want to send to New Relic
                scriptLogData.scriptLogHeadCount = 0;
                scriptLogData.scriptLogTailCount = globals.config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.tailScriptLogLines',
                );

                scriptLogData.scriptLogHead = '';
                if (scriptLogData?.scriptLogFull?.length > 0) {
                    scriptLogData.scriptLogTail = scriptLogData.scriptLogFull
                        .slice(Math.max(scriptLogData.scriptLogFull.length - scriptLogData.scriptLogTailCount, 0))
                        .join('\r\n');
                } else {
                    scriptLogData.scriptLogTail = '';
                }

                globals.logger.debug(`NEW RELIC TASK FAILED LOG: Script log data:\n${JSON.stringify(scriptLogData, null, 2)}`);

                // Use script log data to enrich log entry sent to New Relic
                payload[0].common.attributes.qs_executingNodeName = scriptLogData.executingNodeName;
                payload[0].common.attributes.qs_executionStartTime = scriptLogData.executionStartTime;
                payload[0].common.attributes.qs_executionStopTime = scriptLogData.executionStopTime;
                payload[0].common.attributes.qs_executionDuration = scriptLogData.executionDuration;
                payload[0].common.attributes.qs_executionStatusNum = scriptLogData.executionStatusNum;
                payload[0].common.attributes.qs_exeuctionStatusText = scriptLogData.executionStatusText;
                payload[0].common.attributes.qs_scriptLogSize = scriptLogData.scriptLogSize;
                payload[0].common.attributes.qs_scriptLogTailCount = scriptLogData.scriptLogTailCount;

                // Set main log message
                const logMessage = {
                    // timestamp: tsTmp,
                    message: `${scriptLogData.executionDetailsConcatenated}\r\n-------------------------------\r\n\r\n${scriptLogData.scriptLogTail}`,
                };
                payload[0].logs.push(logMessage);
            }
        } else if (incidentConfig?.logType === 'qs_serviceStateLog') {
            // Set attributes
            payload[0].common.attributes = incidentConfig.attributes;

            // Set log message
            let logMessage;
            if (reloadParams.serviceStatus === 'STOPPED' || reloadParams.serviceStatus === 'RUNNING') {
                logMessage = {
                    message: `Windows service "${reloadParams.serviceDisplayName}" on host "${reloadParams.serviceHost}" is ${reloadParams.serviceStatus}.`,
                };
            } else {
                logMessage = {
                    message: `Windows service "${reloadParams.serviceDisplayName}" on host "${reloadParams.serviceHost}" is in state "${reloadParams.serviceStatus}".`,
                };
            }
            payload[0].logs.push(logMessage);
        }

        // New Relic log type. Required field in call to New Relic API
        payload[0].common.attributes.logtype = incidentConfig.logType;

        // Remove log timestamp field from payload as it is no longer needed
        delete payload.logTimeStamp;

        // Get custom http headers
        const { headers } = incidentConfig;

        // Get array of all NR accounts defined in the config file
        const nrAccounts = globals.config.Butler.thirdPartyToolsCredentials.newRelic;

        // Verbose: Show what New Relic account names/API keys/account IDs have been defined
        globals.logger.verbose(`NEW RELIC LOG: Account names/API keys/account IDs: ${JSON.stringify(nrAccounts, null, 2)}`);

        // Send to New Relic
        // eslint-disable-next-line no-restricted-syntax
        for (const accountName of destNewRelicAccounts) {
            globals.logger.debug(`NEW RELIC LOG: Current loop New Relic config=${JSON.stringify(accountName)}`);

            // Is there any config available for the current account?
            const newRelicConfig = nrAccounts.filter((item) => item.accountName === accountName);
            if (newRelicConfig.length === 0) {
                globals.logger.error(`NEW RELIC LOG: New Relic account name "${accountName}" does not exist in the Butler config file.`);
            } else {
                headers['Api-Key'] = newRelicConfig[0].insertApiKey;

                // Build body for HTTP POST
                const axiosRequest = {
                    url: logApiUrl,
                    method: 'post',
                    timeout: HTTP_TIMEOUT_SHORT_MS,
                    data: payload,
                    headers: incidentConfig.headers,
                };

                // eslint-disable-next-line no-await-in-loop
                const res = await axios.request(axiosRequest);
                globals.logger.debug(
                    `NEW RELIC LOG: Result code from posting log to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`,
                );

                if (res.status === 200 || res.status === 202) {
                    // Posting done without error
                    globals.logger.verbose(`NEW RELIC LOG: Sent log New Relic account ${newRelicConfig[0].accountId}`);
                } else {
                    globals.logger.error(
                        `NEW RELIC LOG: Error code from posting log to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`,
                    );
                }
            }
        }
    } catch (err) {
        if (globals.isSea) {
            globals.logger.error(`NEW RELIC 2 message: ${globals.getErrorMessage(err)}`);
        } else {
            globals.logger.error(`NEW RELIC 2 stack: ${globals.getErrorMessage(err)}`);
        }

        // If neither message nor stack is available, just log the error object
        if (!err.message && !err.stack) {
            globals.logger.error(`NEW RELIC 2: ${globals.getErrorMessage(err)}`);
        }
    }
}

/**
 * Sends a reload task failure event to New Relic.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
export async function sendReloadTaskFailureEvent(reloadParams) {
    const params = reloadParams;

    rateLimiterFailedReloadsEvent
        .consume(params.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TASK FAILED NEWRELIC: Rate limiting check passed for failed task event. Task name: "${params.qs_taskName}"`,
                );
                globals.logger.verbose(`[QSEOW] TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadFailedEventConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                // Convert task and app tag arrays to attributes that can be sent to New Relic

                // Should task tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.dynamic.useTaskTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.dynamic.useTaskTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_taskTags) {
                        // params[`qs_taskTag_${item.replace(/ /g, '_')}`] = 'true';
                        params[`qs_taskTag_${item}`] = 'true';
                    }
                }
                delete params.qs_taskTags;

                // Should app tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.dynamic.useAppTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.dynamic.useAppTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_appTags) {
                        // params[`qs_taskTag_${item.replace(/ /g, '_')}`] = 'true';
                        params[`qs_appTag_${item}`] = 'true';
                    }
                }
                delete params.qs_appTags;

                // Set up Sense repository service configuration
                const cfg = getQRSConfig();
                const qrsInstance = new QrsClient(cfg);

                // Array that will hold all NR accounts the event should be sent to
                const tmpDestNewRelicAccounts = [];

                // Send all events to specific NR account(s)
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.account') !==
                        null &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.account')
                        .length > 0
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.account',
                    )) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Send event to NR accounts specified by reload task custom property
                if (
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable',
                    ) &&
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                    )
                ) {
                    // Get values of custom property
                    try {
                        const result1 = await qrsInstance.Get(`task/full?filter=id eq ${reloadParams.qs_taskId}`);

                        // eslint-disable-next-line no-restricted-syntax
                        for (const cp of result1.body[0].customProperties) {
                            if (
                                cp.definition.name ===
                                globals.config.get(
                                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                                )
                            ) {
                                tmpDestNewRelicAccounts.push(cp.value);
                            }
                        }
                    } catch (err) {
                        globals.logger.error(`SCRIPTLOG: ${globals.getErrorMessage(err)}`);
                    }
                }

                if (
                    globals.config.has('Butler.incidentTool.newRelic.destinationAccount.event') &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.event') !== null &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.event').length > 0
                ) {
                    // Looks like the config file format may be pre 8.5.0.
                    // Send to all NR accounts defined in the config file.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.Butler.incidentTool.newRelic.destinationAccount.event) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Remove duplicates
                const destNewRelicAccounts = [...new Set(tmpDestNewRelicAccounts)];

                sendNewRelicEvent(incidentConfig, params, destNewRelicAccounts);
                return null;
            } catch (err) {
                if (globals.isSea) {
                    globals.logger.error(`[QSEOW] TASK FAILED NEW RELIC 1 message: ${globals.getErrorMessage(err)}`);
                } else {
                    globals.logger.error(`[QSEOW] TASK FAILED NEW RELIC 1 stack: ${globals.getErrorMessage(err)}`);
                }

                // If neither message nor stack is available, just log the error object
                if (!err.message && !err.stack) {
                    globals.logger.error(`[QSEOW] TASK FAILED NEW RELIC 1: ${globals.getErrorMessage(err)}`);
                }

                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `[QSEOW] TASK FAILED NEWRELIC: Rate limiting failed. Not sending reload failure event to New Relic for task "${params.qs_taskName}"`,
            );
            globals.logger.verbose(`[QSEOW] TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

/**
 * Sends a reload task failure log to New Relic.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
export async function sendReloadTaskFailureLog(reloadParams) {
    const params = reloadParams;

    rateLimiterFailedReloadsLog
        .consume(params.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TASK FAILED NEWRELIC: Rate limiting check passed for failed task log entry. Task name: "${params.qs_taskName}"`,
                );
                globals.logger.verbose(`[QSEOW] TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadFailedLogConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                // Convert task and app tag arrays to attributes that can be sent to New Relic

                // Should task tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.dynamic.useTaskTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.dynamic.useTaskTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_taskTags) {
                        params[`qs_taskTag_${item}`] = 'true';
                    }
                }
                delete params.qs_taskTags;

                // Should app tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.dynamic.useAppTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.dynamic.useAppTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_appTags) {
                        params[`qs_appTag_${item}`] = 'true';
                    }
                }
                delete params.qs_appTags;

                // Set up Sense repository service configuration
                const cfg = getQRSConfig();
                const qrsInstance = new QrsClient(cfg);

                // Array that will hold all NR accounts the log entry should be sent to
                const tmpDestNewRelicAccounts = [];

                // Send log entry to specific NR account(s)
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.account') !==
                        null &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.account')
                        .length > 0
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.account',
                    )) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Send log entry to NR accounts specified by reload task custom property
                if (
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.enable',
                    ) &&
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                    )
                ) {
                    // Get values of custom property
                    try {
                        const result1 = await qrsInstance.Get(`task/full?filter=id eq ${reloadParams.qs_taskId}`);

                        // eslint-disable-next-line no-restricted-syntax
                        for (const cp of result1.body[0].customProperties) {
                            if (
                                cp.definition.name ===
                                globals.config.get(
                                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                                )
                            ) {
                                tmpDestNewRelicAccounts.push(cp.value);
                            }
                        }
                    } catch (err) {
                        globals.logger.error(`[QSEOW] Get value of reload task custom property: ${globals.getErrorMessage(err)}`);
                    }
                }

                if (
                    globals.config.has('Butler.incidentTool.newRelic.destinationAccount.log') &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.log') !== null &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.log').length > 0
                ) {
                    // Looks like the config file format may be pre 8.5.0.
                    // Send to all NR accounts defined in the config file.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.Butler.incidentTool.newRelic.destinationAccount.log) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Remove duplicates
                const destNewRelicAccounts = [...new Set(tmpDestNewRelicAccounts)];

                sendNewRelicLog(incidentConfig, params, destNewRelicAccounts);
                return null;
            } catch (err) {
                if (globals.isSea) {
                    globals.logger.error(`[QSEOW] TASK FAILED NEW RELIC 2 message: ${globals.getErrorMessage(err)}`);
                } else {
                    globals.logger.error(`[QSEOW] TASK FAILED NEW RELIC 2 stack: ${globals.getErrorMessage(err)}`);
                }

                // If neither message nor stack is available, just log the error object
                if (!err.message && !err.stack) {
                    globals.logger.error(`[QSEOW] TASK FAILED NEW RELIC 2: ${globals.getErrorMessage(err)}`);
                }

                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `[QSEOW] TASK FAILED NEWRELIC: Rate limiting failed. Not sending reload failure log entry to New Relic for task "${params.qs_taskName}"`,
            );
            globals.logger.verbose(`[QSEOW] TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

/**
 * Sends a reload task aborted event to New Relic.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
export function sendReloadTaskAbortedEvent(reloadParams) {
    const params = reloadParams;

    rateLimiterAbortedReloadsEvent
        .consume(params.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TASK ABORT NEWRELIC: Rate limiting check passed for abort task event. Task name: "${params.qs_taskName}"`,
                );
                globals.logger.verbose(`[QSEOW] TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadAbortedEventConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                // Convert task and app tag arrays to attributes that can be sent to New Relic

                // Should task tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.dynamic.useTaskTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.dynamic.useTaskTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_taskTags) {
                        // params[`qs_taskTag_${item.replace(/ /g, '_')}`] = 'true';
                        params[`qs_taskTag_${item}`] = 'true';
                    }
                }
                delete params.qs_taskTags;

                // Should app tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.dynamic.useAppTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.dynamic.useAppTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_appTags) {
                        // params[`qs_taskTag_${item.replace(/ /g, '_')}`] = 'true';
                        params[`qs_appTag_${item}`] = 'true';
                    }
                }
                delete params.qs_appTags;

                // Set up Sense repository service configuration
                const cfg = getQRSConfig();
                const qrsInstance = new QrsClient(cfg);

                // Array that will hold all NR accounts the event should be sent to
                const tmpDestNewRelicAccounts = [];

                // Send all events to specific NR account(s)
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.account') !==
                        null &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.account')
                        .length > 0
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.account',
                    )) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Send event to NR accounts specified by reload task custom property
                if (
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable',
                    ) &&
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                    )
                ) {
                    // Get values of custom property
                    try {
                        const result1 = await qrsInstance.Get(`task/full?filter=id eq ${reloadParams.qs_taskId}`);

                        // eslint-disable-next-line no-restricted-syntax
                        for (const cp of result1.body[0].customProperties) {
                            if (
                                cp.definition.name ===
                                globals.config.get(
                                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                                )
                            ) {
                                tmpDestNewRelicAccounts.push(cp.value);
                            }
                        }
                    } catch (err) {
                        globals.logger.error(`[QSEOW] Get custom property for reload task: ${globals.getErrorMessage(err)}`);
                    }
                }

                if (
                    globals.config.has('Butler.incidentTool.newRelic.destinationAccount.event') &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.event') !== null &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.event').length > 0
                ) {
                    // Looks like the config file format may be pre 8.5.0.
                    // Send to all NR accounts defined in the config file.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.Butler.incidentTool.newRelic.destinationAccount.event) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Remove duplicates
                const destNewRelicAccounts = [...new Set(tmpDestNewRelicAccounts)];

                sendNewRelicEvent(incidentConfig, params, destNewRelicAccounts);
                return null;
            } catch (err) {
                if (globals.isSea) {
                    globals.logger.error(`[QSEOW] TASK ABORT NEW RELIC 1 message: ${globals.getErrorMessage(err)}`);
                } else {
                    globals.logger.error(`[QSEOW] TASK ABORT NEW RELIC 1 stack: ${globals.getErrorMessage(err)}`);
                }

                // If neither message nor stack is available, just log the error object
                if (!err.message && !err.stack) {
                    globals.logger.error(`[QSEOW] TASK ABORT NEW RELIC 1: ${globals.getErrorMessage(err)}`);
                }

                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `[QSEOW] TASK ABORT NEWRELIC: Rate limiting failed. Not sending reload aborted event to New Relic for task "${params.qs_taskName}"`,
            );
            globals.logger.verbose(`[QSEOW] TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

/**
 * Sends a reload task aborted log to New Relic.
 * @param {Object} reloadParams - Parameters for the reload task.
 */
export function sendReloadTaskAbortedLog(reloadParams) {
    const params = reloadParams;

    rateLimiterAbortedReloadsLog
        .consume(params.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `[QSEOW] TASK ABORT NEWRELIC: Rate limiting check passed for abort task log entry. Task name: "${params.qs_taskName}"`,
                );
                globals.logger.verbose(`[QSEOW] TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadAbortedLogConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                // Convert task and app tag arrays to attributes that can be sent to New Relic

                // Should task tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.dynamic.useTaskTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.dynamic.useTaskTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_taskTags) {
                        // params[`qs_taskTag_${item.replace(/ /g, '_')}`] = 'true';
                        params[`qs_taskTag_${item}`] = 'true';
                    }
                }
                delete params.qs_taskTags;

                // Should app tags be included as New Relic attributes?
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.dynamic.useAppTags') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.dynamic.useAppTags')
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const item of params.qs_appTags) {
                        // params[`qs_taskTag_${item.replace(/ /g, '_')}`] = 'true';
                        params[`qs_appTag_${item}`] = 'true';
                    }
                }
                delete params.qs_appTags;

                // Set up Sense repository service configuration
                const cfg = getQRSConfig();
                const qrsInstance = new QrsClient(cfg);

                // Array that will hold all NR accounts the log entry should be sent to
                const tmpDestNewRelicAccounts = [];

                // Send log entry to specific NR account(s)
                if (
                    globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.enable') &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.account') !==
                        null &&
                    globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.account')
                        .length > 0
                ) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.account',
                    )) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Send log entry to NR accounts specified by reload task custom property
                if (
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.enable',
                    ) &&
                    globals.config.has(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                    )
                ) {
                    // Get values of custom property
                    try {
                        const result1 = await qrsInstance.Get(`task/full?filter=id eq ${reloadParams.qs_taskId}`);

                        // eslint-disable-next-line no-restricted-syntax
                        for (const cp of result1.body[0].customProperties) {
                            if (
                                cp.definition.name ===
                                globals.config.get(
                                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                                )
                            ) {
                                tmpDestNewRelicAccounts.push(cp.value);
                            }
                        }
                    } catch (err) {
                        globals.logger.error(`[QSEOW] Get custom property for reload task: ${globals.getErrorMessage(err)}`);
                    }
                }

                if (
                    globals.config.has('Butler.incidentTool.newRelic.destinationAccount.log') &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.log') !== null &&
                    globals.config.get('Butler.incidentTool.newRelic.destinationAccount.log').length > 0
                ) {
                    // Looks like the config file format may be pre 8.5.0.
                    // Send to all NR accounts defined in the config file.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.Butler.incidentTool.newRelic.destinationAccount.log) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Remove duplicates
                const destNewRelicAccounts = [...new Set(tmpDestNewRelicAccounts)];

                sendNewRelicLog(incidentConfig, params, destNewRelicAccounts);
                return null;
            } catch (err) {
                if (globals.isSea) {
                    globals.logger.error(`[QSEOW] TASK ABORT NEW RELIC 2 message: ${globals.getErrorMessage(err)}`);
                } else {
                    globals.logger.error(`[QSEOW] TASK ABORT NEW RELIC 2 stack: ${globals.getErrorMessage(err)}`);
                }

                // If neither message nor stack is available, just log the error object
                if (!err.message && !err.stack) {
                    globals.logger.error(`[QSEOW] TASK ABORT NEW RELIC 2: ${globals.getErrorMessage(err)}`);
                }

                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `[QSEOW] TASK ABORT NEWRELIC: Rate limiting failed. Not sending reload abort log entry to New Relic for task "${params.qs_taskName}"`,
            );
            globals.logger.verbose(`[QSEOW] TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}
