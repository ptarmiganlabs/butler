const { RateLimiterMemory } = require('rate-limiter-flexible');

const globals = require('../../globals');
const { sendNewRelicEvent, sendNewRelicLog } = require('./new_relic');

let rateLimiterServiceStatusEvent;
let rateLimiterServiceStatusLog;

if (globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit')) {
    rateLimiterServiceStatusEvent = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit'),
    });

    rateLimiterServiceStatusLog = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit'),
    });
} else {
    rateLimiterServiceStatusEvent = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });

    rateLimiterServiceStatusLog = new RateLimiterMemory({
        points: 1,
        duration: 300,
    });
}

function getServiceStateEventConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.destinationAccount.event') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.event') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.event.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState')
        ) {
            // Not enough info in config file
            globals.logger.error('SERVICE MONITOR NEWRELIC: Service state New Relic event config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header')) {
                headers[item.name] = item.value;
            }
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        const cfg = {
            eventType: 'qs_serviceStateEvent',
            url:
                globals.config.get('Butler.incidentTool.newRelic.url.event').slice(-1) === '/'
                    ? globals.config.get('Butler.incidentTool.newRelic.url.event')
                    : `${globals.config.get('Butler.incidentTool.newRelic.url.event')}/`,
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit')
                : '',
            headers,
            attributes,
        };

        return cfg;
    } catch (err) {
        globals.logger.error(`SERVICE MONITOR NEWRELIC EVENT: ${err}`);
        return false;
    }
}

function getServiceStateLogConfig() {
    try {
        // First make sure this tool is enabled in the config file and that we have needed parameters
        if (
            !globals.config.has('Butler.incidentTool.newRelic.destinationAccount.log') ||
            !globals.config.has('Butler.incidentTool.newRelic.url.log') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.log.enable') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceHost') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceName') ||
            !globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceState')
        ) {
            // Not enough info in config file
            globals.logger.error('SERVICE MONITOR NEWRELIC: Service state New Relic log entry config info missing in Butler config file');
            return false;
        }

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header')) {
                headers[item.name] = item.value;
            }
        }

        // Add static attributes
        const attributes = {};

        // Get shared static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        // Add log specific static attributes
        if (globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.static') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.static')) {
                attributes[item.name] = item.value;
            }
        }

        const cfg = {
            logType: 'qs_serviceStateLog',
            url: globals.config.get('Butler.incidentTool.newRelic.url.log'),
            rateLimit: globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit')
                ? globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit')
                : '',
            headers,
            attributes,
        };

        return cfg;
    } catch (err) {
        globals.logger.error(`SERVICE MONITOR NEWRELIC EVENT: ${err}`);
        return false;
    }
}

async function sendServiceMonitorEvent(serviceStatusParams) {
    const params = serviceStatusParams;

    rateLimiterServiceStatusEvent
        .consume(`${params.serviceHost}|${params.serviceName}`, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `SERVICE MONITOR NEWRELIC: Rate limiting check passed for service state event. Service name: "${params.serviceName}"`
                );
                globals.logger.verbose(`SERVICE MONITOR NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const serviceStateConfig = getServiceStateEventConfig();
                if (serviceStateConfig === false) {
                    return 1;
                }

                // Add event specific dynamic attributes
                if (
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceHost') ===
                    true
                ) {
                    serviceStateConfig.attributes.butler_serviceHost = serviceStatusParams.serviceHost;
                }
                if (
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName') ===
                    true
                ) {
                    serviceStateConfig.attributes.butler_serviceName = serviceStatusParams.serviceName;
                }
                if (
                    globals.config.get(
                        'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceDisplayName'
                    ) === true
                ) {
                    serviceStateConfig.attributes.butler_serviceDisplayName = serviceStatusParams.serviceDetails.displayName;
                }
                if (
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState') ===
                    true
                ) {
                    serviceStateConfig.attributes.butler_serviceStatus = serviceStatusParams.serviceStatus;
                }

                // Array that will hold all NR accounts the event should be sent to
                const tmpDestNewRelicAccounts = [];

                if (
                    globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount') &&
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount') !== null &&
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount').length > 0
                ) {
                    // Send to all NR accounts defined in the config file.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount')) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Remove duplicates
                const destNewRelicAccounts = [...new Set(tmpDestNewRelicAccounts)];

                sendNewRelicEvent(
                    serviceStateConfig,
                    {
                        serviceHost: params.serviceHost,
                        serviceName: params.serviceName,
                        serviceStatus: params.serviceStatus,
                        serviceDisplayName: params.serviceDetails.displayName,
                        serviceStartType: params.serviceDetails.startType,
                        serviceExePath: params.serviceDetails.exePath,
                        serviceDependencies: params.serviceDetails.dependencies,
                    },
                    destNewRelicAccounts
                );
                return null;
            } catch (err) {
                globals.logger.error(`SERVICE MONITOR NEWRELIC: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `SERVICE MONITOR NEWRELIC: Rate limiting failed. Not sending service state event to New Relic for service "${params.serviceName}"`
            );
            globals.logger.verbose(`SERVICE MONITOR NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

async function sendServiceMonitorLog(serviceStatusParams) {
    const params = serviceStatusParams;

    rateLimiterServiceStatusLog
        .consume(`${params.serviceHost}|${params.serviceName}`, 1)
        .then(async (rateLimiterRes) => {
            try {
                globals.logger.info(
                    `SERVICE MONITOR NEWRELIC: Rate limiting check passed for service state log entry. Service name: "${params.serviceName}"`
                );
                globals.logger.verbose(`SERVICE MONITOR NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);

                // Get config and needed metadata
                const serviceStateConfig = getServiceStateLogConfig();
                if (serviceStateConfig === false) {
                    return 1;
                }

                // Add log specific dynamic attributes
                if (
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceHost') === true
                ) {
                    serviceStateConfig.attributes.butler_serviceHost = serviceStatusParams.serviceHost;
                }
                if (
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceName') === true
                ) {
                    serviceStateConfig.attributes.butler_serviceName = serviceStatusParams.serviceName;
                }
                if (
                    globals.config.get(
                        'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceDisplayName'
                    ) === true
                ) {
                    serviceStateConfig.attributes.butler_serviceDisplayName = serviceStatusParams.serviceDetails.displayName;
                }
                if (
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceState') ===
                    true
                ) {
                    serviceStateConfig.attributes.butler_serviceStatus = serviceStatusParams.serviceStatus;
                }

                // Array that will hold all NR accounts the log entry should be sent to
                const tmpDestNewRelicAccounts = [];

                if (
                    globals.config.has('Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount') &&
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount') !== null &&
                    globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount').length > 0
                ) {
                    // Send to all NR accounts defined in the config file.
                    // eslint-disable-next-line no-restricted-syntax
                    for (const acct of globals.config.get('Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount')) {
                        tmpDestNewRelicAccounts.push(acct);
                    }
                }

                // Remove duplicates
                const destNewRelicAccounts = [...new Set(tmpDestNewRelicAccounts)];

                sendNewRelicLog(
                    serviceStateConfig,
                    {
                        serviceHost: params.serviceHost,
                        serviceName: params.serviceName,
                        serviceStatus: params.serviceStatus,
                        serviceDisplayName: params.serviceDetails.displayName,
                        serviceStartType: params.serviceDetails.startType,
                        serviceExePath: params.serviceDetails.exePath,
                        serviceDependencies: params.serviceDetails.dependencies,
                    },
                    destNewRelicAccounts
                );
                return null;
            } catch (err) {
                globals.logger.error(`SERVICE MONITOR NEWRELIC: ${err}`);
                return null;
            }
        })
        .catch((rateLimiterRes) => {
            globals.logger.verbose(
                `SERVICE MONITOR NEWRELIC: Rate limiting failed. Not sending service state log entry to New Relic for service "${params.serviceName}"`
            );
            globals.logger.verbose(`SERVICE MONITOR NEWRELIC: Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
        });
}

module.exports = {
    sendServiceMonitorEvent,
    sendServiceMonitorLog,
};
