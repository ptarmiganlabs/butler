const later = require('@breejs/later');
const { createMachine, interpret } = require('xstate');

const svcTools = require('./winsvc');
const globals = require('../globals');
const newRelic = require('./incident_mgmt/new_relic_service_monitor');
const webhookOut = require('./webhook_notification');
const slack = require('./slack_notification');
const teams = require('./msteams_notification');
const smtp = require('./smtp');
const influxDb = require('./post_to_influxdb');

// One state machines for each service
const serviceStateMachine = [];

const serviceMonitorNewRelicSend1 = (config, logger, svc) => {
    logger.verbose(`Sending service status "${svc.serviceStatus}" to New Relic: "${svc.serviceName}"`);

    newRelic.sendServiceMonitorEvent({
        serviceHost: svc.host,
        serviceName: svc.serviceName,
        serviceFriendlyName: svc.serviceFriendlyName,
        serviceDisplayName: svc.serviceDetails.displayName,
        serviceStatus: svc.serviceStatus,
        serviceDetails: svc.serviceDetails,
    });

    newRelic.sendServiceMonitorLog({
        serviceHost: svc.host,
        serviceName: svc.serviceName,
        serviceFriendlyName: svc.serviceFriendlyName,
        serviceDisplayName: svc.serviceDetails.displayName,
        serviceStatus: svc.serviceStatus,
        serviceDetails: svc.serviceDetails,
    });
};

const serviceMonitorMqttSend1 = (config, logger, svc) => {
    if (svc.serviceStatus === 'STOPPED') {
        if (
            !config.has('Butler.mqttConfig.serviceStoppedTopic') ||
            config.get('Butler.mqttConfig.serviceStoppedTopic') === null ||
            config.get('Butler.mqttConfig.serviceStoppedTopic').length === 0
        ) {
            logger.verbose(
                `"${svc.serviceName}" Windows service on host "${svc.host}" stopped. No MQTT topic defined in config entry "Butler.mqttConfig.serviceStoppedTopic"`
            );
        } else {
            logger.verbose(`Sending service stopped alert to MQTT for service "${svc.serviceName}" on host "${svc.host}"`);
            globals.mqttClient.publish(
                `${config.get('Butler.mqttConfig.serviceStoppedTopic')}/${svc.host}/${svc.serviceName}`,
                JSON.stringify({
                    serviceHost: svc.host,
                    serviceName: svc.serviceName,
                    serviceFriendlyName: svc.serviceFriendlyName,
                    serviceDisplayName: svc.serviceDetails.displayName,
                    serviceDependencies: svc.serviceDetails.dependencies,
                    serviceStartType: svc.serviceDetails.startType,
                    serviceExePath: svc.serviceDetails.exePath,
                    serviceStatus: svc.serviceStatus,
                    servicePrevStatus: svc.prevState,
                    serviceStatusChanged: svc.stateChanged,
                })
            );
        }
    } else if (svc.serviceStatus === 'RUNNING') {
        if (
            !config.has('Butler.mqttConfig.serviceRunningTopic') ||
            config.get('Butler.mqttConfig.serviceRunningTopic') === null ||
            config.get('Butler.mqttConfig.serviceRunningTopic').length === 0
        ) {
            logger.verbose(
                `"${svc.serviceName}" Windows service on host "${svc.host}" is running. No MQTT topic defined in config entry "Butler.mqttConfig.serviceRunningTopic"`
            );
        } else {
            logger.verbose(`Sending service running message to MQTT for service "${svc.serviceName}" on host "${svc.host}"`);
            globals.mqttClient.publish(
                `${config.get('Butler.mqttConfig.serviceRunningTopic')}/${svc.host}/${svc.serviceName}`,
                JSON.stringify({
                    serviceHost: svc.host,
                    serviceName: svc.serviceName,
                    serviceDisplayName: svc.serviceDetails.displayName,
                    serviceFriendlyName: svc.serviceFriendlyName,
                    serviceDependencies: svc.serviceDetails.dependencies,
                    serviceStartType: svc.serviceDetails.startType,
                    serviceExePath: svc.serviceDetails.exePath,
                    serviceStatus: svc.serviceStatus,
                    servicePrevStatus: svc.prevState,
                    serviceStatusChanged: svc.stateChanged,
                })
            );
        }
    }
};

const serviceMonitorMqttSend2 = (config, logger, svc) => {
    if (
        !config.has('Butler.mqttConfig.serviceStatusTopic') ||
        config.get('Butler.mqttConfig.serviceStatusTopic') === null ||
        config.get('Butler.mqttConfig.serviceStatusTopic').length === 0
    ) {
        logger.verbose(`"${svc.serviceName}"No MQTT topic defined in config entry "Butler.mqttConfig.serviceStatusTopic"`);
    } else {
        logger.verbose(`Sending service status to MQTT: service="${svc.serviceName}", status="${svc.serviceStatus}"`);
        globals.mqttClient.publish(
            `${config.get('Butler.mqttConfig.serviceStatusTopic')}/${svc.host}/${svc.serviceName}`,
            JSON.stringify({
                serviceHost: svc.host,
                serviceName: svc.serviceName,
                serviceDisplayName: svc.serviceDetails.displayName,
                serviceFriendlyName: svc.serviceFriendlyName,
                serviceDependencies: svc.serviceDetails.dependencies,
                serviceStartType: svc.serviceDetails.startType,
                serviceExePath: svc.serviceDetails.exePath,
                serviceStatus: svc.serviceStatus,
            })
        );
    }
};

const verifyServicesExist = async (config, logger) => {
    logger.info('Verifying that all Windows services specified in config file exist and can be reached.');

    // Return false if one or more services do not exist or cannot be reached.
    // Return true if all services are reachable.
    let result = true;

    const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

    // eslint-disable-next-line no-restricted-syntax
    for (const host of hostsToCheck) {
        logger.verbose(`Checking status of Windows services on host ${host.host}`);
        const servicesToCheck = host.services;

        // eslint-disable-next-line no-restricted-syntax
        for (const service of servicesToCheck) {
            let serviceExists;
            try {
                // eslint-disable-next-line no-await-in-loop
                serviceExists = await svcTools.exists(service.name, host.host);
            } catch (err) {
                logger.error(`Error verifying existence and reachability of service ${service.name} on host ${host.host}: ${err}`);
                result = false;
            }

            if (serviceExists) {
                logger.verbose(
                    `Windows service ${service.name} (="${service.friendlyName}") on host ${host.host} exists: ${serviceExists}`
                );
            } else {
                logger.error(
                    `Windows service ${service.name} (="${service.friendlyName}") on host ${host.host} does not exist or cannot be reached.`
                );
                result = false;
            }
        }
    }

    return result;
};

const checkServiceStatus = async (config, logger) => {
    const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

    hostsToCheck.forEach(async (host) => {
        logger.verbose(`Checking status of Windows services on host ${host.host}`);
        const servicesToCheck = host.services;

        servicesToCheck.forEach(async (service) => {
            logger.verbose(`Checking status of Windows service ${service.name} (="${service.friendlyName}") on host ${host.host}`);

            const serviceStatus = await svcTools.status(service.name);

            // Get details about this service
            const serviceDetails = await svcTools.details(service.name);
            if (
                serviceStatus === 'STOPPED' &&
                config.has('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.stopped.enable') &&
                config.get('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.stopped.enable') === true
            ) {
                logger.warn(`Service "${serviceDetails.displayName}" on host "${host.host}" is stopped`);

                // Update state machine
                const smService = serviceStateMachine.find((winsvc) => winsvc.id === `${host.host}|${service.name}`);
                const prevState = smService.stateSvc.state.value;
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", previous state=${prevState}`);

                const sendResult = smService.stateSvc.send('STOP');
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", new state=${sendResult.value}`);

                if (sendResult.changed) {
                    logger.warn(`Service "${serviceDetails.displayName}" on host "${host.host}" has stopped!`);

                    // Send message to enabled destinations

                    // New Relic
                    if (
                        config.has('Butler.serviceMonitor.alertDestination.newRelic.enable') &&
                        config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
                    ) {
                        serviceMonitorNewRelicSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }

                    // MQTT
                    if (
                        config.has('Butler.mqttConfig.enable') &&
                        config.get('Butler.mqttConfig.enable') === true &&
                        config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                        config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
                    ) {
                        serviceMonitorMqttSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }

                    // Outgoing webhooks
                    if (
                        globals.config.has('Butler.serviceMonitor.alertDestination.webhook.enable') &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.webhook.enable') === true
                    ) {
                        webhookOut.sendServiceMonitorWebhook({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }

                    // Post to Slack
                    if (
                        globals.config.has('Butler.slackNotification.enable') &&
                        globals.config.has('Butler.serviceMonitor.alertDestination.slack.enable') &&
                        globals.config.get('Butler.slackNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.slack.enable') === true
                    ) {
                        slack.sendServiceMonitorNotificationSlack({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
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
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
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
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }
                }
            } else if (
                serviceStatus === 'RUNNING' &&
                config.has('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.running.enable') &&
                config.get('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.running.enable') === true
            ) {
                logger.verbose(`Service "${service.name}" is running`);

                // Update state machine
                const smService = serviceStateMachine.find((winsvc) => winsvc.id === `${host.host}|${service.name}`);
                const prevState = smService.stateSvc.state.value;

                logger.verbose(
                    `Service "${serviceDetails.displayName}" on host "${host.host}", previous state=${smService.stateSvc.state.value}`
                );

                const sendResult = smService.stateSvc.send('START');
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", new state=${sendResult.value}`);

                if (sendResult.changed) {
                    logger.info(`Service "${serviceDetails.displayName}" on host "${host.host}" has started.`);
                    // Send message to enabled destinations

                    // New Relic
                    if (
                        config.has('Butler.serviceMonitor.alertDestination.newRelic.enable') &&
                        config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
                    ) {
                        serviceMonitorNewRelicSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }

                    // MQTT
                    if (
                        config.has('Butler.mqttConfig.enable') &&
                        config.get('Butler.mqttConfig.enable') === true &&
                        config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                        config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
                    ) {
                        serviceMonitorMqttSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }

                    // Outgoing webhooks
                    if (
                        globals.config.has('Butler.serviceMonitor.alertDestination.webhook.enable') &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.webhook.enable') === true
                    ) {
                        webhookOut.sendServiceMonitorWebhook({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }

                    // Post to Slack
                    if (
                        globals.config.has('Butler.slackNotification.enable') &&
                        globals.config.has('Butler.serviceMonitor.alertDestination.slack.enable') &&
                        globals.config.get('Butler.slackNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.slack.enable') === true
                    ) {
                        slack.sendServiceMonitorNotificationSlack({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
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
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
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
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: sendResult.value.toUpperCase(),
                            stateChanged: sendResult.changed,
                        });
                    }
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
                serviceMonitorMqttSend2(config, logger, {
                    serviceName: service.name,
                    serviceFriendlyName: service.friendlyName,
                    serviceStatus,
                    serviceDetails,
                    host: host.host,
                });
            }

            // InfluDB
            if (
                globals.config.has('Butler.emailNotification.enable') &&
                globals.config.has('Butler.serviceMonitor.alertDestination.influxDb.enable') &&
                globals.config.get('Butler.emailNotification.enable') === true &&
                globals.config.get('Butler.serviceMonitor.alertDestination.influxDb.enable') === true
            ) {
                const instanceTag = globals.config.has('Butler.influxDb.instanceTag')
                    ? globals.config.get('Butler.influxDb.instanceTag')
                    : '';

                influxDb.postWindowsServiceStatusToInfluxDB({
                    instanceTag,
                    serviceName: service.name,
                    serviceFriendlyName: service.friendlyName,
                    serviceStatus,
                    serviceDetails,
                    host: host.host,
                });
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
                        logger.info(`SERVICE MONITOR: Setting up monitor for Windows services:`);

                        const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const host of hostsToCheck) {
                            logger.info(`SERVICE MONITOR: --- Host: ${host.host}`);
                            const servicesToCheck = host.services;

                            // eslint-disable-next-line no-restricted-syntax
                            for (const service of servicesToCheck) {
                                logger.info(`SERVICE MONITOR: ---          ${service.name}`);

                                // Windows service states: https://learn.microsoft.com/en-us/windows/win32/services/service-status-transitions
                                const windowsServiceMachine = createMachine({
                                    predictableActionArguments: true,
                                    id: 'windowsService',
                                    initial: 'paused',
                                    states: {
                                        stopped: {
                                            on: {
                                                START: { target: 'running' },
                                            },
                                        },
                                        running: {
                                            on: {
                                                STOP: { target: 'stopped' },
                                                PAUSE: { target: 'paused' },
                                            },
                                        },
                                        paused: {
                                            on: {
                                                START: { target: 'running' },
                                                STOP: { target: 'stopped' },
                                            },
                                        },
                                    },
                                });

                                const svc = interpret(windowsServiceMachine).start();

                                serviceStateMachine.push({
                                    id: `${host.host}|${service.name}`,
                                    host,
                                    serviceName: service.name,
                                    stateSvc: svc,
                                });
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
                        'At least one Windows service does not exist or could not be reached. Monitoring of Windows services is disabled.'
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
        if (err.stack) {
            logger.error(`SERVICE MONITOR: ${err.stack}`);
        }
    }
}

module.exports = {
    setupServiceMonitorTimer,
};
