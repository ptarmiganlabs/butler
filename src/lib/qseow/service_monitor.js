import later from '@breejs/later';
import { createMachine, createActor } from 'xstate';

import { statusAll, status, details } from './winsvc.js';
import globals from '../../globals.js';
import newRelic from '../incident_mgmt/new_relic_service_monitor.js';
import { sendServiceMonitorWebhook } from '../webhook_notification.js';
import { sendServiceMonitorNotificationSlack } from './slack_notification.js';
import { sendServiceMonitorNotificationTeams } from './msteams_notification.js';
import { sendServiceMonitorNotificationEmail } from '../smtp.js';
import { postWindowsServiceStatusToInfluxDB } from '../post_to_influxdb.js';

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
            config.get('Butler.mqttConfig.serviceStoppedTopic') === null ||
            config.get('Butler.mqttConfig.serviceStoppedTopic').length === 0
        ) {
            logger.verbose(
                `"${svc.serviceName}" Windows service on host "${svc.host}" stopped. No MQTT topic defined in config entry "Butler.mqttConfig.serviceStoppedTopic"`,
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
                }),
            );
        }
    } else if (svc.serviceStatus === 'RUNNING') {
        if (
            config.get('Butler.mqttConfig.serviceRunningTopic') === null ||
            config.get('Butler.mqttConfig.serviceRunningTopic').length === 0
        ) {
            logger.verbose(
                `"${svc.serviceName}" Windows service on host "${svc.host}" is running. No MQTT topic defined in config entry "Butler.mqttConfig.serviceRunningTopic"`,
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
                }),
            );
        }
    }
};

const serviceMonitorMqttSend2 = (config, logger, svc) => {
    if (config.get('Butler.mqttConfig.serviceStatusTopic') === null || config.get('Butler.mqttConfig.serviceStatusTopic').length === 0) {
        logger.verbose(`"${svc.serviceName}"No MQTT topic defined in config entry "Butler.mqttConfig.serviceStatusTopic"`);
    } else {
        logger.verbose(
            `MQTT WINDOWS SERVICE STATUS: Sending service status to MQTT: service="${svc.serviceDetails.displayName}", status="${svc.serviceStatus}"`,
        );

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
            }),
        );
    }
};

const verifyServicesExist = async (config, logger) => {
    logger.info('VERIFY WIN SERVICES EXIST: Verifying that all Windows services specified in config file exist and can be reached.');

    // Return false if one or more services do not exist or cannot be reached.
    // Return true if all services are reachable.
    let result = true;

    const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

    // eslint-disable-next-line no-restricted-syntax
    for (const host of hostsToCheck) {
        // Get status of all services on host
        logger.verbose(`VERIFY WIN SERVICES EXIST: Getting status of all Windows services on host ${host.host}`);
        // eslint-disable-next-line no-await-in-loop
        const serviceStatusAll = await statusAll(logger, host.host);
        const servicesToCheck = host.services;

        // eslint-disable-next-line no-restricted-syntax
        for (const service of servicesToCheck) {
            logger.verbose(
                `VERIFY WIN SERVICES EXIST: Checking status of Windows service ${service.name} (="${service.friendlyName}") on host ${host.host}`,
            );
            let serviceExists;

            try {
                // Try to find service.name in serviceStatusAll array
                serviceExists = serviceStatusAll.find((svc) => svc.name === service.name);
            } catch (err) {
                logger.error(
                    `VERIFY WIN SERVICES EXIST: Error verifying existence and reachability of service ${service.name} on host ${host.host}: ${err}`,
                );
                result = false;
            }

            if (serviceExists) {
                logger.verbose(
                    `VERIFY WIN SERVICES EXIST: Windows service ${service.name} (="${service.friendlyName}") on host ${host.host} exists.`,
                );
            } else {
                logger.error(
                    `VERIFY WIN SERVICES EXIST:  Windows service ${service.name} (="${service.friendlyName}") on host ${host.host} does not exist or cannot be reached.`,
                );
                result = false;
            }
        }
    }

    logger.info(`VERIFY WIN SERVICES EXIST: Checked all services on all hosts. Result: ${result}`);

    return result;
};

// Function to check the status of all Windows services specified in the config file
// The isFirsCheck parameter is used to determine if we should send a message to the alert destinations
// Set isFirsCheck default to false
const checkServiceStatus = async (config, logger, isFirstCheck = false) => {
    const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

    hostsToCheck.forEach(async (host) => {
        logger.debug(`Checking status of Windows services on host ${host.host}`);
        const servicesToCheck = host.services;

        // Get status of all services on host
        const serviceStatusAll = await statusAll(logger, host.host);

        servicesToCheck.forEach(async (service) => {
            logger.debug(`Checking status of Windows service ${service.name} (="${service.friendlyName}") on host ${host.host}`);

            // Does this service exist in the serviceStatusAll array?
            const svcMonitored = serviceStatusAll.find((svc) => svc.name === service.name);

            if (svcMonitored === undefined) {
                logger.error(
                    `Service ${service.name} (="${service.friendlyName}") on host ${host.host} does not exist or cannot be reached.`,
                );
                return;
            }

            // Get status of this service
            const serviceStatus = await status(logger, service.name, host.host);
            logger.debug(`Got reply: Service ${service.name} (="${service.friendlyName}") on host ${host.host} status: ${serviceStatus}`);

            // Get details about this service
            const serviceDetails = await details(logger, service.name, host.host);
            if (serviceStatus === 'STOPPED') {
                logger.warn(`Service "${serviceDetails.displayName}" on host "${host.host}" is stopped`);

                // Update state machine
                const smService = serviceStateMachine.find((winsvc) => winsvc.id === `${host.host}|${service.name}`);

                const snapshotPrev = smService.stateSvc.getSnapshot();
                const prevState = snapshotPrev.value;
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", previous state=${prevState}`);

                smService.stateSvc.send({ type: 'STOP' });

                const snapshotNew = smService.stateSvc.getSnapshot();
                const newState = snapshotNew.value;
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", new state=${newState}`);

                // Has state changed?
                const stateChanged = prevState !== newState;
                if (stateChanged) {
                    logger.warn(`Service "${serviceDetails.displayName}" on host "${host.host}" has stopped!`);

                    // Send message to enabled destinations

                    // New Relic
                    if (
                        config.get('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.stopped.enable') === true &&
                        config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
                    ) {
                        serviceMonitorNewRelicSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // MQTT
                    if (
                        config.get('Butler.mqttConfig.enable') === true &&
                        config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
                    ) {
                        serviceMonitorMqttSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Outgoing webhooks
                    if (globals.config.get('Butler.serviceMonitor.alertDestination.webhook.enable') === true) {
                        sendServiceMonitorWebhook({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Post to Slack
                    if (
                        globals.config.get('Butler.slackNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.slack.enable') === true
                    ) {
                        sendServiceMonitorNotificationSlack({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Post to Teams
                    if (
                        globals.config.get('Butler.teamsNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.teams.enable') === true
                    ) {
                        sendServiceMonitorNotificationTeams({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Send email
                    if (
                        globals.config.get('Butler.emailNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.email.enable') === true
                    ) {
                        sendServiceMonitorNotificationEmail({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }
                }
            } else if (serviceStatus === 'RUNNING') {
                logger.verbose(`Service "${service.name}" is running`);

                // Update state machine
                const smService = serviceStateMachine.find((winsvc) => winsvc.id === `${host.host}|${service.name}`);

                // First check?
                if (isFirstCheck) {
                    // Set state to running as this is the first/startup check and we don't want to alert in this case
                    smService.stateSvc.send({ type: 'START' });
                }

                const snapshotPrev = smService.stateSvc.getSnapshot();
                const prevState = snapshotPrev.value;
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", previous state=${prevState}`);

                smService.stateSvc.send({ type: 'START' });

                const snapshotNew = smService.stateSvc.getSnapshot();
                const newState = snapshotNew.value;
                logger.verbose(`Service "${serviceDetails.displayName}" on host "${host.host}", new state=${newState}`);

                // Has state changed?
                const stateChanged = prevState !== newState;
                if (stateChanged) {
                    logger.info(`Service "${serviceDetails.displayName}" on host "${host.host}" has started.`);
                    // Send message to enabled destinations

                    // New Relic
                    if (
                        config.get('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.running.enable') === true &&
                        config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
                    ) {
                        serviceMonitorNewRelicSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // MQTT
                    if (
                        config.get('Butler.mqttConfig.enable') === true &&
                        config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
                    ) {
                        serviceMonitorMqttSend1(config, logger, {
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Outgoing webhooks
                    if (globals.config.get('Butler.serviceMonitor.alertDestination.webhook.enable') === true) {
                        sendServiceMonitorWebhook({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Post to Slack
                    if (
                        globals.config.get('Butler.slackNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.slack.enable') === true
                    ) {
                        sendServiceMonitorNotificationSlack({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Post to Teams
                    if (
                        globals.config.get('Butler.teamsNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.teams.enable') === true
                    ) {
                        sendServiceMonitorNotificationTeams({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }

                    // Send email
                    if (
                        globals.config.get('Butler.emailNotification.enable') === true &&
                        globals.config.get('Butler.serviceMonitor.alertDestination.email.enable') === true
                    ) {
                        sendServiceMonitorNotificationEmail({
                            serviceName: service.name,
                            serviceFriendlyName: service.friendlyName,
                            serviceStatus,
                            serviceDetails,
                            host: host.host,
                            prevState: prevState.toUpperCase(),
                            currState: newState.toUpperCase(),
                            stateChanged,
                        });
                    }
                }
            }

            // Messages sent no matter what the service status is
            // MQTT
            if (
                config.get('Butler.mqttConfig.enable') === true &&
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
                globals.config.get('Butler.influxDb.enable') === true &&
                globals.config.get('Butler.serviceMonitor.alertDestination.influxDb.enable') === true
            ) {
                postWindowsServiceStatusToInfluxDB({
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
        if (config.get('Butler.serviceMonitor.enable') === true) {
            // Make sure we're running on Windows
            let { hostInfo } = globals;
            if (hostInfo === undefined) {
                hostInfo = await globals.initHostInfo();
            }

            if (hostInfo.si.os.platform === 'Windows') {
                // Verify all services exist
                const servicesExist = await verifyServicesExist(config, logger);
                if (servicesExist) {
                    if (config.get('Butler.serviceMonitor.monitor').length === 0) {
                        logger.warn(`SERVICE MONITOR INIT: Missing or empty section in config file: Butler.serviceMonitor.service`);
                    } else {
                        logger.info(`SERVICE MONITOR INIT: Setting up monitor for Windows services:`);

                        const hostsToCheck = config.get('Butler.serviceMonitor.monitor');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const host of hostsToCheck) {
                            logger.info(`SERVICE MONITOR INIT: --- Host: ${host.host}`);
                            const servicesToCheck = host.services;

                            // eslint-disable-next-line no-restricted-syntax
                            for (const service of servicesToCheck) {
                                logger.info(`SERVICE MONITOR INIT: ---          ${service.name}`);

                                // Windows service states: https://learn.microsoft.com/en-us/windows/win32/services/service-status-transitions
                                const windowsServiceMachine = createMachine({
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

                                const actor = createActor(windowsServiceMachine);
                                const svc = actor.start();

                                serviceStateMachine.push({
                                    id: `${host.host}|${service.name}`,
                                    host,
                                    serviceName: service.name,
                                    actor,
                                    stateSvc: svc,
                                });
                            }
                        }

                        const sched = later.parse.text(config.get('Butler.serviceMonitor.frequency'));
                        later.setInterval(() => {
                            checkServiceStatus(config, logger, false);
                        }, sched);

                        // Do an initial service status check
                        logger.verbose('Doing initial service status check');
                        checkServiceStatus(config, logger, true);
                    }
                } else {
                    logger.error(
                        'At least one Windows service does not exist or could not be reached. Monitoring of Windows services is disabled.',
                    );
                }
            } else {
                logger.warn(
                    `Not running on Windows, service monitoring will not work. Current platform is: ${hostInfo.si.os.platform}, distro: ${hostInfo.si.os.distro}, release: ${hostInfo.si.os.release}`,
                );
            }
        }
    } catch (err) {
        logger.error(`SERVICE MONITOR INIT: ${err}`);
        if (err.stack) {
            logger.error(`SERVICE MONITOR INIT: ${err.stack}`);
        }
    }
}

export default setupServiceMonitorTimer;
