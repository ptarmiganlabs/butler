const later = require('@breejs/later');

const svcTools = require('./winsvc');
const globals = require('../globals');
const newRelic = require('./incident_mgmt/new_relic_service_monitor');
const webhookOut = require('./webhook_notification');
const slack = require('./slack_notification');
const teams = require('./msteams_notification');
const smtp = require('./smtp');
//const { forIn } = require('lodash');

const serviceMonitorNewRelicSend1 = (config, logger, svc) => {
    logger.verbose(`Sending service stopped alert to New Relic: "${svc.serviceName}"`);

    newRelic.sendServiceMonitorEvent({
        serviceHost: svc.host,
        serviceName: svc.serviceName,
        serviceStatus: svc.serviceStatus,
        serviceDetails: svc.serviceDetails,
    });

    newRelic.sendServiceMonitorLog({
        serviceHost: svc.host,
        serviceName: svc.serviceName,
        serviceStatus: svc.serviceStatus,
        serviceDetails: svc.serviceDetails,
    });
};

const serviceMonitorMqttSend1 = (config, logger, svc) => {
    if (
        !config.has('Butler.mqttConfig.serviceStoppedTopic') ||
        config.get('Butler.mqttConfig.serviceStoppedTopic') === null ||
        config.get('Butler.mqttConfig.serviceStoppedTopic').length === 0
    ) {
        logger.verbose(
            `"${svc.serviceName}" Windows service stopped. No MQTT topic defined in config entry "Butler.mqttConfig.serviceStoppedTopic"`
        );
    } else {
        logger.verbose(`Sending service stopped alert to MQTT: "${svc.serviceName}"`);
        globals.mqttClient.publish(
            config.get('Butler.mqttConfig.serviceStoppedTopic'),
            JSON.stringify({
                serviceHost: svc.host,
                serviceName: svc.serviceName,
                serviceDisplayName: svc.serviceDetails.displayName,
                serviceDependencies: svc.serviceDetails.dependencies,
                serviceStartType: svc.serviceDetails.startType,
                serviceExePath: svc.serviceDetails.exePath,
                serviceStatus: svc.serviceStatus,
            })
        );
    }
};

const serviceMonitorMqttSend2 = (config, logger, serviceName, serviceStatus, serviceDetails) => {
    if (
        !config.has('Butler.mqttConfig.serviceStatusTopic') ||
        config.get('Butler.mqttConfig.serviceStatusTopic') === null ||
        config.get('Butler.mqttConfig.serviceStatusTopic').length === 0
    ) {
        logger.verbose(`"${serviceName}"No MQTT topic defined in config entry "Butler.mqttConfig.serviceStatusTopic"`);
    } else {
        logger.verbose(`Sending service status to MQTT: service="${serviceName}", status="${serviceStatus}"`);
        globals.mqttClient.publish(
            config.get('Butler.mqttConfig.serviceStatusTopic'),
            JSON.stringify({
                serviceName,
                serviceDisplayName: serviceDetails.displayName,
                serviceDependencies: serviceDetails.dependencies,
                serviceStartType: serviceDetails.startType,
                serviceExePath: serviceDetails.exePath,
                serviceStatus,
            })
        );
    }
};

const verifyServicesExist = async (config, logger) => {
    // Return false if one or more services does not exist or cannot be reached.
    // Return true if all services are reachable.
    let result = false;

    const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

    // eslint-disable-next-line no-restricted-syntax
    for (const host of hostsToCheck) {
        logger.verbose(`Checking status of Windows services on host ${host.host}`);
        const serviceNamesToCheck = host.services;

        // eslint-disable-next-line no-restricted-syntax
        for (const serviceName of serviceNamesToCheck) {
            // eslint-disable-next-line no-await-in-loop
            const serviceExists = await svcTools.exists(serviceName, host.host);
            if (serviceExists) {
                result = true;
            }

            logger.verbose(`Windows service ${serviceName} on host ${host.host} exists: ${serviceExists}`);
        }
    }

    return result;
};

const checkServiceStatus = async (config, logger) => {
    const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

    hostsToCheck.forEach(async (host) => {
        logger.verbose(`Checking status of Windows services on host ${host.host}`);
        const serviceNamesToCheck = host.services;

        serviceNamesToCheck.forEach(async (serviceName) => {
            logger.verbose(`Checking status of Windows service ${serviceName} on host ${host.host}`);

            const serviceStatus = await svcTools.status(serviceName);

            // Get details about this service
            const serviceDetails = await svcTools.details(serviceName);
            if (
                serviceStatus === 'STOPPED' &&
                config.has('Butler.serviceMonitor.alertDestination.newRelic.monitorServiceState.stopped.enable') &&
                config.get('Butler.serviceMonitor.alertDestination.newRelic.monitorServiceState.stopped.enable') === true
            ) {
                logger.warn(`Service "${serviceDetails.displayName}" is stopped!`);

                // Send message to enabled destinations

                // New Relic
                if (
                    config.has('Butler.serviceMonitor.alertDestination.newRelic.enable') &&
                    config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
                ) {
                    serviceMonitorNewRelicSend1(config, logger, { serviceName, serviceStatus, serviceDetails, host: host.host });
                }

                // MQTT
                if (
                    config.has('Butler.mqttConfig.enable') &&
                    config.get('Butler.mqttConfig.enable') === true &&
                    config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                    config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
                ) {
                    serviceMonitorMqttSend1(config, logger, { serviceName, serviceStatus, serviceDetails, host: host.host });
                }

                // Outgoing webhooks
                if (
                    globals.config.has('Butler.serviceMonitor.alertDestination.webhook.enable') &&
                    globals.config.get('Butler.serviceMonitor.alertDestination.webhook.enable') === true
                ) {
                    webhookOut.sendServiceMonitorWebhook({ serviceName, serviceStatus, serviceDetails, host: host.host });
                }

                // Post to Slack
                if (
                    globals.config.has('Butler.slackNotification.enable') &&
                    globals.config.has('Butler.serviceMonitor.alertDestination.slack.enable') &&
                    globals.config.get('Butler.slackNotification.enable') === true &&
                    globals.config.get('Butler.serviceMonitor.alertDestination.slack.enable') === true
                ) {
                    slack.sendServiceMonitorNotificationSlack({
                        host: host.host,
                        serviceName,
                        serviceStatus,
                        serviceDetails,
                    });
                }

                // Post to Teams
                if (
                    globals.config.has('Butler.teamsNotification.enable') &&
                    globals.config.has('Butler.serviceMonitor.alertDestination.teams.enable') &&
                    globals.config.get('Butler.teamsNotification.enable') === true &&
                    globals.config.get('Butler.serviceMonitor.alertDestination.teams.enable') === true
                ) {
                    teams.sendServiceMonitorNotificationTeams({
                        host: host.host,
                        serviceName,
                        serviceStatus,
                        serviceDetails,
                    });
                }

                // Send email
                if (
                    globals.config.has('Butler.emailNotification.enable') &&
                    globals.config.has('Butler.serviceMonitor.alertDestination.email.enable') &&
                    globals.config.get('Butler.emailNotification.enable') === true &&
                    globals.config.get('Butler.serviceMonitor.alertDestination.email.enable') === true
                ) {
                    smtp.sendServiceMonitorNotificationEmail({
                        host: host.host,
                        serviceName,
                        serviceStatus,
                        serviceDetails,
                    });
                }
            } else if (
                serviceStatus === 'RUNNING' &&
                config.has('Butler.serviceMonitor.alertDestination.newRelic.monitorServiceState.running.enable') &&
                config.get('Butler.serviceMonitor.alertDestination.newRelic.monitorServiceState.running.enable') === true
            ) {
                logger.verbose(`Service "${serviceName}" is running`);

                // Send message to enabled destinations

                // New Relic
                if (
                    config.has('Butler.serviceMonitor.alertDestination.newRelic.enable') &&
                    config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
                ) {
                    serviceMonitorNewRelicSend1(config, logger, serviceName, serviceStatus, serviceDetails);
                }

                // MQTT
                if (
                    config.has('Butler.mqttConfig.enable') &&
                    config.get('Butler.mqttConfig.enable') === true &&
                    config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                    config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
                ) {
                    serviceMonitorMqttSend1(config, logger, serviceName, serviceStatus, serviceDetails);
                }
            }

            // Messages sent no matter what the service status is
            // MQTT
            if (
                config.has('Butler.mqttConfig.enable') &&
                config.get('Butler.mqttConfig.enable') === true &&
                config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
            ) {
                serviceMonitorMqttSend2(config, logger, serviceName, serviceStatus, serviceDetails);
            }
        });
    });
};

async function setupServiceMonitorTimer(config, logger) {
    try {
        if (!config.has('Butler.serviceMonitor.enable') || config.get('Butler.serviceMonitor.enable') === true) {
            // Make sure we're running on Windows
            let { hostInfo } = globals;
            if (hostInfo === undefined) {
                hostInfo = await globals.initHostInfo();
            }

            if (hostInfo.si.os.platform === 'Windows') {
                // Verify all services exist
                const servicesExist = await verifyServicesExist(config, logger);
                if (servicesExist) {
                    if (!config.has('Butler.serviceMonitor.monitor') || config.get('Butler.serviceMonitor.monitor').length === 0) {
                        logger.warn(`SERVICE MONITOR: Missing or empty section in config file: Butler.serviceMonitor.service`);
                    } else {
                        logger.info(`SERVICE MONITOR: Setting up service monitor for services:`);

                        const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const host of hostsToCheck) {
                            logger.info(`SERVICE MONITOR: --- Host: ${host.host}`);
                            const serviceNamesToCheck = host.services;

                            // eslint-disable-next-line no-restricted-syntax
                            for (const serviceName of serviceNamesToCheck) {
                                logger.info(`SERVICE MONITOR: ---          ${serviceName}`);
                            }
                        }
                        const sched = later.parse.text(config.get('Butler.serviceMonitor.frequency'));
                        later.setInterval(() => {
                            checkServiceStatus(config, logger);
                        }, sched);

                        // Do an initial service status check
                        checkServiceStatus(config, logger);
                    }
                } else {
                    logger.error(
                        'At least one Windows service does not exist or could not be reached. Will not check any Windows services from here on.'
                    );
                }
            } else {
                logger.warn(
                    `Not running on Windows, service monitoring will not work. Current platform is: ${hostInfo.si.os.platform}, distro: ${hostInfo.si.os.distro}, release: ${hostInfo.si.os.release}`
                );
            }
        }
    } catch (err) {
        logger.error(`SERVICE MONITOR: ${err}`);
    }
}

module.exports = {
    setupServiceMonitorTimer,
};
