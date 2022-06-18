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
            'Content-Type': 'application/json; charset=utf-8',
        };

        // eslint-disable-next-line no-restricted-syntax
        for (const header of globals.config.get('Butler.uptimeMonitor.storeNewRelic.header')) {
            headers[header.name] = header.value;
        }

        //
        // Send data to all New Relic accounts that are enabled for this metric/event
        //
        // Get New Relic accounts
        const nrAccounts = globals.config.Butler.thirdPartyToolsCredentials.newRelic;
        globals.logger.debug(`UPTIME NEW RELIC: Complete New Relic config=${JSON.stringify(nrAccounts)}`);

        // eslint-disable-next-line no-restricted-syntax
        for (const accountName of globals.config.Butler.uptimeMonitor.storeNewRelic.destinationAccount) {
            globals.logger.debug(`UPTIME NEW RELIC: Current loop New Relic config=${JSON.stringify(accountName)}`);

            // Is there any config available for the current account?
            const newRelicConfig = nrAccounts.filter((item) => item.accountName === accountName);
            globals.logger.debug(`UPTIME NEW RELIC: New Relic config=${JSON.stringify(newRelicConfig)}`);

            if (newRelicConfig.length === 0) {
                globals.logger.error(`UPTIME NEW RELIC: New Relic config "${accountName}" does not exist in the Butler config file.`);
            } else {
                headers['Api-Key'] = newRelicConfig[0].insertApiKey;

                // eslint-disable-next-line no-await-in-loop
                const res = await axios.post(remoteUrl, payload, { headers, timeout: 5000 });

                globals.logger.debug(
                    `UPTIME NEW RELIC: Result code from posting to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`
                );
                if (res.status === 200 || res.status === 202) {
                    // Posting done without error
                    globals.logger.verbose(
                        `UPTIME NEW RELIC: Sent Butler memory usage data to New Relic account ${newRelicConfig[0].accountId}`
                    );
                    // reply.type('application/json; charset=utf-8').code(201).send(JSON.stringify(request.body));
                } else {
                    globals.logger.error(
                        `UPTIME NEW RELIC: Error code from posting memory usage data to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`
                    );
                }
            }
        }
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
