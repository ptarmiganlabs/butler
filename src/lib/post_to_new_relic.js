import axios from 'axios';

import globals from '../globals.js';
import { HTTP_TIMEOUT_VERY_SHORT_MS } from '../constants.js';

/**
 * Posts Butler uptime metrics to New Relic.
 *
 * @param {Object} fields - The fields containing uptime metrics.
 * @param {number} fields.intervalMillisec - The interval in milliseconds.
 * @param {number} fields.heapUsed - The used heap memory.
 * @param {number} fields.heapTotal - The total heap memory.
 * @param {number} fields.externalMemory - The external memory.
 * @param {number} fields.processMemory - The process memory.
 * @param {number} fields.uptimeMilliSec - The uptime in milliseconds.
 * @returns {Promise<void>}
 */
export async function postButlerUptimeToNewRelic(fields) {
    try {
        const payload = [];
        const metrics = [];
        const attributes = {};
        const ts = new Date().getTime(); // Timestamp in millisec

        // Add static fields to attributes
        if (globals.config.has('Butler.uptimeMonitor.storeNewRelic.attribute.static')) {
            const staticAttributes = globals.config.get('Butler.uptimeMonitor.storeNewRelic.attribute.static');

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

        globals.logger.debug(`NEW RELIC UPTIME: Payload: ${JSON.stringify(payload, null, 2)}`);

        // Preapare call to remote host
        const remoteUrl = globals.config.get('Butler.uptimeMonitor.storeNewRelic.url');

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.uptimeMonitor.storeNewRelic.header') !== null) {
            for (const header of globals.config.get('Butler.uptimeMonitor.storeNewRelic.header')) {
                headers[header.name] = header.value;
            }
        }

        //
        // Send data to all New Relic accounts that are enabled for this metric/event
        //
        // Get New Relic accounts
        const nrAccounts = globals.config.get('Butler.thirdPartyToolsCredentials.newRelic');
        globals.logger.debug(`NEW RELIC UPTIME: Complete New Relic config=${JSON.stringify(nrAccounts)}`);

        // Verbose: Show what New Relic account names/API keys/account IDs have been defined
        globals.logger.verbose(`NEW RELIC UPTIME: Account names/API keys/account IDs: ${JSON.stringify(nrAccounts, null, 2)}`);

        // Are there any NR destinations defined for uptime metrics?
        const nrDestAccounts = globals.config.get('Butler.uptimeMonitor.storeNewRelic.destinationAccount');
        globals.logger.verbose(`NEW RELIC UPTIME: Destination account names for uptime data: ${JSON.stringify(nrDestAccounts, null, 2)}`);

        if (nrDestAccounts) {
            for (const accountName of globals.config.Butler.uptimeMonitor.storeNewRelic.destinationAccount) {
                globals.logger.debug(`NEW RELIC UPTIME: Current loop New Relic config=${JSON.stringify(accountName)}`);

                // Is there any config available for the current account?
                const newRelicConfig = nrAccounts.filter((item) => item.accountName === accountName);
                globals.logger.debug(`NEW RELIC UPTIME: New Relic config=${JSON.stringify(newRelicConfig)}`);

                if (newRelicConfig.length === 0) {
                    globals.logger.error(`NEW RELIC UPTIME: New Relic config "${accountName}" does not exist in the Butler config file.`);
                } else {
                    headers['Api-Key'] = newRelicConfig[0].insertApiKey;

                    const res = await axios.post(remoteUrl, payload, { headers, timeout: HTTP_TIMEOUT_VERY_SHORT_MS });

                    globals.logger.debug(
                        `NEW RELIC UPTIME: Result code from posting to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`,
                    );
                    if (res.status === 200 || res.status === 202) {
                        // Posting done without error
                        globals.logger.verbose(
                            `NEW RELIC UPTIME: Sent Butler memory usage data to New Relic account ${newRelicConfig[0].accountId}`,
                        );
                        // reply.type('application/json; charset=utf-8').code(201).send(JSON.stringify(request.body));
                    } else {
                        globals.logger.error(
                            `NEW RELIC UPTIME: Error code from posting memory usage data to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`,
                        );
                    }
                }
            }
        }
    } catch (error) {
        // handle error
        globals.logger.error(`NEW RELIC UPTIME: Error sending uptime: ${globals.getErrorMessage(error)}`);
    }
}

/**
 * Posts a failed reload event to New Relic.
 *
 * @returns {Promise<void>}
 */
export async function postFailedReloadEventToNewRelic() {
    try {
        //
    } catch (error) {
        // handle error
        globals.logger.error(`NEW RELIC UPTIME: Error posting reload failed event: ${globals.getErrorMessage(error)}`);
    }
}

/**
 * Posts an aborted reload event to New Relic.
 *
 * @returns {Promise<void>}
 */
export async function postAbortedReloadEventToNewRelic() {
    try {
        //
    } catch (error) {
        // handle error
        globals.logger.error(`NEW RELIC UPTIME: Error posting reload aborted event: ${globals.getErrorMessage(error)}`);
    }
}
