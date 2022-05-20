const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const globals = require('../../globals');
const scriptLog = require('../scriptlog');

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

function getReloadFailedEventConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEWRELIC: Reload failure New Relic event config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header')) {
            headers[item.name] = item.value;
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static')) {
            attributes[item.name] = item.value;
        }

        // Get event-specific attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.static')) {
            attributes[item.name] = item.value;
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
        globals.logger.error(`NEWRELIC: ${err}`);
        return false;
    }
}

function getReloadFailedLogConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEWRELIC: Reload failure New Relic log config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header')) {
            headers[item.name] = item.value;
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static')) {
            attributes[item.name] = item.value;
        }

        // Get log-specific attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.static')) {
            attributes[item.name] = item.value;
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
        globals.logger.error(`NEWRELIC: ${err}`);
        return false;
    }
}

function getReloadAbortedEventConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEWRELIC: Reload aborted New Relic event config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header')) {
            headers[header.name] = header.value;
        }

        // Add static attributes
        const attributes = {};

        // Get shared static settings
        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static')) {
            attributes[header.name] = header.value;
        }

        // Get event-specific attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.static')) {
            attributes[item.name] = item.value;
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
        globals.logger.error(`NEWRELIC: ${err}`);
        return false;
    }
}

function getReloadAbortedLogConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event')
        ) {
            // Not enough info in config file
            globals.logger.error('NEWRELIC: Reload aborted New Relic log config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header')) {
            headers[item.name] = item.value;
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static')) {
            attributes[item.name] = item.value;
        }

        // Get log-specific attributes
        // eslint-disable-next-line no-restricted-syntax
        for (const item of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.static')) {
            attributes[item.name] = item.value;
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
        globals.logger.error(`NEWRELIC: ${err}`);
        return false;
    }
}

async function sendNewRelicEvent(incidentConfig, reloadParams) {
    try {
        // Build final URL
        const eventApiUrl = `${incidentConfig.url}v1/accounts/${globals.config.get(
            'Butler.thirdPartyToolsCredentials.newRelic.accountId'
        )}/events`;

        // Build final payload
        const payload = Object.assign(incidentConfig.attributes, reloadParams);
        payload.eventType = incidentConfig.eventType;

        // Convert timestamp in log to milliseconds
        let tsTmp;
        if (reloadParams.qs_logTimeStamp.includes(',')) {
            tsTmp = new Date(reloadParams.qs_logTimeStamp.split(',')[0]).getTime();
            tsTmp += parseInt(reloadParams.qs_logTimeStamp.split(',')[1], 10);
        } else if (reloadParams.qs_logTimeStamp.includes('.')) {
            tsTmp = new Date(reloadParams.qs_logTimeStamp.split('.')[0]).getTime();
            tsTmp += parseInt(reloadParams.qs_logTimeStamp.split('.')[1], 10);
        } else {
            tsTmp = new Date(reloadParams.qs_logTimeStamp.split(',')[0]).getTime();
        }

        payload.timestamp = tsTmp;

        // Remove log timestamp field from payload as it is no longer needed
        delete payload.logTimeStamp;

        // Build body for HTTP POST
        const axiosRequest = {
            url: eventApiUrl,
            method: 'post',
            timeout: 10000,
            data: payload,
            headers: incidentConfig.headers,
        };

        const response = await axios.request(axiosRequest);
        globals.logger.debug(`NEWRELIC: Response from API: ${response}`);
    } catch (err) {
        globals.logger.error(`NEWRELIC: ${JSON.stringify(err, null, 2)}`);
    }
}

async function sendNewRelicLog(incidentConfig, reloadParams) {
    try {
        // Build final URL
        const logApiUrl = incidentConfig.url;

        // Build final payload
        const payload = [{ common: {}, logs: [] }];

        // Set New Relic attributes/dimensions, both shared and log-specific ones
        payload[0].common.attributes = Object.assign(incidentConfig.attributes, reloadParams);

        // Get script logs
        const scriptLogData = await scriptLog.getScriptLog(
            reloadParams.qs_taskId,
            0,
            globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.tailScriptLogLines')
        );
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

        // New Relic event type. Required field
        payload[0].common.attributes.logtype = incidentConfig.logType;

        // Convert timestamp in log to milliseconds
        let tsTmp;
        if (reloadParams.qs_logTimeStamp.includes(',')) {
            tsTmp = new Date(reloadParams.qs_logTimeStamp.split(',')[0]).getTime();
            tsTmp += parseInt(reloadParams.qs_logTimeStamp.split(',')[1], 10);
        } else if (reloadParams.qs_logTimeStamp.includes('.')) {
            tsTmp = new Date(reloadParams.qs_logTimeStamp.split('.')[0]).getTime();
            tsTmp += parseInt(reloadParams.qs_logTimeStamp.split('.')[1], 10);
        } else {
            tsTmp = new Date(reloadParams.qs_logTimeStamp.split(',')[0]).getTime();
        }

        // Set main log message
        const logMessage = {
            timestamp: tsTmp,
            message: `${scriptLogData.executionDetailsConcatenated}\r\n-------------------------------\r\n\r\n${scriptLogData.scriptLogTail}`,
        };
        payload[0].logs.push(logMessage);

        // Remove log timestamp field from payload as it is no longer needed
        delete payload.logTimeStamp;

        // Build body for HTTP POST
        const axiosRequest = {
            url: logApiUrl,
            method: 'post',
            timeout: 10000,
            data: payload,
            headers: incidentConfig.headers,
        };

        const response = await axios.request(axiosRequest);
        globals.logger.debug(`NEWRELIC: Response from API: ${response}`);
    } catch (err) {
        globals.logger.error(`NEWRELIC: ${JSON.stringify(err, null, 2)}`);
    }
}

function sendReloadTaskFailureEvent(reloadParams) {
    rateLimiterFailedReloadsEvent
        .consume(reloadParams.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TASK FAILED NEWRELIC: Rate limiting ok: Sending reload failure event to New Relic for task "${reloadParams.qs_taskName}"`
                );
                globals.logger.verbose(`TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadFailedEventConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                sendNewRelicEvent(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`TASK FAILED NEWRELIC: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `TASK FAILED NEWRELIC: Rate limiting failed. Not sending reload failure event to New Relic for task "${reloadParams.qs_taskName}"`
            );
            globals.logger.verbose(`TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

function sendReloadTaskFailureLog(reloadParams) {
    rateLimiterFailedReloadsLog
        .consume(reloadParams.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TASK FAILED NEWRELIC: Rate limiting ok: Sending reload failure log entry to New Relic for task "${reloadParams.qs_taskName}"`
                );
                globals.logger.verbose(`TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadFailedLogConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                sendNewRelicLog(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`TASK FAILED NEWRELIC: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `TASK FAILED NEWRELIC: Rate limiting failed. Not sending reload failure log entry to New Relic for task "${reloadParams.qs_taskName}"`
            );
            globals.logger.verbose(`TASK FAILED NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

function sendReloadTaskAbortedEvent(reloadParams) {
    rateLimiterAbortedReloadsEvent
        .consume(reloadParams.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TASK ABORT NEWRELIC: Rate limiting ok: Sending reload aborted event to New Relic for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(`TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadAbortedEventConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                sendNewRelicEvent(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`TASK ABORT NEWRELIC: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `TASK ABORT NEWRELIC: Rate limiting failed. Not sending reload aborted event to New Relic for task "${reloadParams.qs_taskName}"`
            );
            globals.logger.verbose(`TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

function sendReloadTaskAbortedLog(reloadParams) {
    rateLimiterAbortedReloadsLog
        .consume(reloadParams.qs_taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `TASK ABORT NEWRELIC: Rate limiting ok: Sending reload abort log entry to New Relic for task "${reloadParams.qs_taskName}"`
                );
                globals.logger.verbose(`TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const incidentConfig = getReloadAbortedLogConfig();
                if (incidentConfig === false) {
                    return 1;
                }

                sendNewRelicLog(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`TASK ABORT NEWRELIC: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `TASK ABORT NEWRELIC: Rate limiting failed. Not sending reload abort log entry to New Relic for task "${reloadParams.qs_taskName}"`
            );
            globals.logger.verbose(`TASK ABORT NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

module.exports = {
    sendReloadTaskFailureEvent,
    sendReloadTaskFailureLog,
    sendReloadTaskAbortedEvent,
    sendReloadTaskAbortedLog,
};
