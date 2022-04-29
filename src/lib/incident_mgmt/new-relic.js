const axios = require('axios');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const globals = require('../../globals');

let rateLimiterFailedReloads;
let rateLimiterAbortedReloads;

if (globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.rateLimit')) {
    rateLimiterFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.rateLimit'),
    });
} else {
    rateLimiterFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

if (globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.rateLimit')) {
    rateLimiterAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.rateLimit'),
    });
} else {
    rateLimiterAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

function getReloadFailedNotificationConfigOk() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url')
        ) {
            // Not enough info in config file
            globals.logger.error('NEWRELIC: Reload failure New Relic config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.header')) {
            headers[header.name] = header.value;
        }

        // Add static attributes
        const attributes = {};

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.attribute.static')) {
            attributes[header.name] = header.value;
        }

        // Add dynamic attributes
        attributes.version = globals.appVersion;

        const cfg = {
            eventType: 'qs_reloadTaskFailedEvent',
            url:
                globals.config.get('Butler.incidentTool.newRelic.url').slice(-1) === '/'
                    ? globals.config.get('Butler.incidentTool.newRelic.url')
                    : `${globals.config.get('Butler.incidentTool.newRelic.url')}/`,
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.rateLimit')
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

function getReloadAbortedNotificationConfigOk() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted') ||
            !globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.url')
        ) {
            // Not enough info in config file
            globals.logger.error('NEWRELIC: Reload aborted New Relic config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.header')) {
            headers[header.name] = header.value;
        }

        // Add static attributes
        const attributes = {};

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.attribute.static')) {
            attributes[header.name] = header.value;
        }

        // Add dynamic attributes
        attributes.version = globals.appVersion;

        const cfg = {
            eventType: 'qs_reloadTaskAbortedEvent',
            url:
                globals.config.get('Butler.incidentTool.newRelic.url').slice(-1) === '/'
                    ? globals.config.get('Butler.incidentTool.newRelic.url')
                    : `${globals.config.get('Butler.incidentTool.newRelic.url')}/`,
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.rateLimit')
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

async function sendNewRelic(incidentConfig, reloadParams) {
    try {
        // Build final URL
        const eventUrl = `${incidentConfig.url}v1/accounts/${globals.config.get(
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
            url: eventUrl,
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

function sendReloadTaskFailureNotification(reloadParams) {
    rateLimiterFailedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `NEWRELIC TASK FAIL: Rate limiting ok: Sending reload failure notification to New Relic for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(
                    `NEWRELIC TASK FAIL: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
                );

                // Make sure Slack sending is enabled in the config file and that we have all required settings
                const incidentConfig = getReloadFailedNotificationConfigOk();
                if (incidentConfig === false) {
                    return 1;
                }

                sendNewRelic(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`NEWRELIC TASK FAIL: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `NEWRELIC TASK FAIL: Rate limiting failed. Not sending reload failure notification to New Relic for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(
                `NEWRELIC TASK FAIL: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
            );
        });
}

function sendReloadTaskAbortedNotification(reloadParams) {
    rateLimiterAbortedReloads
        .consume(reloadParams.taskId, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `NEWRELIC TASK ABORT: Rate limiting ok: Sending reload aborted notification to New Relic for task "${reloadParams.taskName}"`
                );
                globals.logger.verbose(
                    `NEWRELIC TASK ABORT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
                );

                // Make sure outgoing webhooks are enabled in the config file and that we have all required settings
                const incidentConfig = getReloadAbortedNotificationConfigOk();
                if (incidentConfig === false) {
                    return 1;
                }

                sendNewRelic(incidentConfig, reloadParams);
                return null;
            } catch (err) {
                globals.logger.error(`NEWRELIC TASK ABORT: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `NEWRELIC TASK ABORT: Rate limiting failed. Not sending reload aborted notification to New Relic for task "${reloadParams.taskName}"`
            );
            globals.logger.verbose(
                `NEWRELIC TASK ABORT: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`
            );
        });
}

module.exports = {
    sendReloadTaskFailureNotification,
    sendReloadTaskAbortedNotification,
};
