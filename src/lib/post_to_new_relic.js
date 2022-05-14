/* eslint-disable guard-for-in */
const axios = require('axios');

const globals = require('../globals');

async function postButlerUptimeToNewRelic(fields) {
    try {
        const payload = [];
        const metrics = [];
        const attributes = {};
        const ts = new Date().getTime(); // Timestamp in millisec

        // Add static fields to attributes
        if (globals.config.has('Butler.uptimeMonitor.storeNewRelic.attribute.static')) {
            const staticAttributes = globals.config.get('Butler.uptimeMonitor.storeNewRelic.attribute.static');

            // eslint-disable-next-line no-restricted-syntax
            for (const item of staticAttributes) {
                attributes[item.name] = item.value;
            }
        }

        // Add version to attributes
        if (
            globals.config.has('Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable') &&
            globals.config.get('Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable') === true
        ) {
            attributes.version = globals.appVersion;
        }

        const common = {
            timestamp: ts,
            'interval.ms': fields.intervalMillisec,
            attributes,
        };

        // Add memory usage
        if (
            globals.config.has('Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable') &&
            globals.config.get('Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable') === true
        ) {
            metrics.push({
                name: 'qs_butlerHeapUsed',
                type: 'gauge',
                value: fields.heapUsed,
            });

            metrics.push({
                name: 'qs_butlerHeapTotal',
                type: 'gauge',
                value: fields.heapTotal,
            });

            metrics.push({
                name: 'qs_butlerExternalMem',
                type: 'gauge',
                value: fields.externalMemory,
            });

            metrics.push({
                name: 'qs_butlerProcessMem',
                type: 'gauge',
                value: fields.processMemory,
            });
        }

        // Add uptime
        if (
            globals.config.has('Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable') &&
            globals.config.get('Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable') === true
        ) {
            metrics.push({
                name: 'qs_butlerUptimeMillisec',
                type: 'gauge',
                value: fields.uptimeMilliSec,
            });
        }

        // Build final payload
        payload.push({
            common,
            metrics,
        });

        globals.logger.debug(`UPTIME NEW RELIC: Payload: ${JSON.stringify(payload, null, 2)}`);

        // Preapare call to remote host
        const remoteUrl = globals.config.get('Butler.uptimeMonitor.storeNewRelic.url');

        // Add headers
        const headers = {
            'Content-Type': 'application/json',
            'Api-Key': globals.config.get('Butler.thirdPartyToolsCredentials.newRelic.insertApiKey'),
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.uptimeMonitor.storeNewRelic.header')) {
            headers[header.name] = header.value;
        }

        const res = await axios.post(remoteUrl, payload, { headers, timeout: 5000 });
        globals.logger.debug(`UPTIME NEW RELIC: Result code from posting to New Relic: ${res.status}, ${res.statusText}`);
        globals.logger.verbose(`UPTIME NEW RELIC: Sent Butler memory usage data to New Relic`);
    } catch (error) {
        // handle error
        globals.logger.error(`UPTIME NEW RELIC: Error sending uptime: ${error}`);
    }
}

async function postFailedReloadEventToNewRelic() {
    try {
        //
    } catch (error) {
        // handle error
        globals.logger.error(`UPTIME NEW RELIC: Error posting reload failed event: ${error}`);
    }
}

async function postAbortedReloadEventToNewRelic() {
    try {
        //
    } catch (error) {
        // handle error
        globals.logger.error(`UPTIME NEW RELIC: Error posting reload aborted event: ${error}`);
    }
}

module.exports = {
    postButlerUptimeToNewRelic,
    postFailedReloadEventToNewRelic,
    postAbortedReloadEventToNewRelic,
};
