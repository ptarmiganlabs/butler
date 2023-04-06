const later = require('@breejs/later');

const svcTools = require('./winsvc');
const globals = require('../globals');

const checkServiceStatus = async (config, logger) => {
    const serviceNamesToCheck = config.get('Butler.serviceMonitor.service');

    serviceNamesToCheck.forEach(async (serviceName) => {
        const status = await svcTools.status(serviceName);
        if (status === 'STOPPED') {
            // Get details about this service
            const serviceDetails = await svcTools.details(serviceName);

            logger.warn(`Service "${serviceDetails.displayName}" is stopped!`);

            // Send alert to enabled destinations

            // New Relic
            if (
                config.has('Butler.serviceMonitor.alertDestination.newRelic.enable') &&
                config.get('Butler.serviceMonitor.alertDestination.newRelic.enable') === true
            ) {
                logger.verbose(`Sending service stopped alert to New Relic: "${serviceName}"`);
            }

            // MQTT
            if (
                config.has('Butler.mqttConfig.enable') &&
                config.get('Butler.mqttConfig.enable') === true &&
                config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
            ) {
                if (
                    !config.has('Butler.mqttConfig.serviceStoppedTopic') ||
                    config.get('Butler.mqttConfig.serviceStoppedTopic') === null ||
                    config.get('Butler.mqttConfig.serviceStoppedTopic').length === 0
                ) {
                    logger.verbose(
                        `"${serviceName}" Windows service stopped. No MQTT topic defined in config entry "Butler.mqttConfig.serviceStoppedTopic"`
                    );
                } else {
                    logger.verbose(`Sending service stopped alert to MQTT: "${serviceName}"`);
                    globals.mqttClient.publish(
                        config.get('Butler.mqttConfig.serviceStoppedTopic'),
                        JSON.stringify({
                            serviceName,
                            serviceDisplayName: serviceDetails.displayName,
                            serviceDependencies: serviceDetails.dependencies,
                            serviceStartType: serviceDetails.startType,
                            serviceExePath: serviceDetails.exePath,
                            serviceStatus: status,
                        })
                    );
                }
            }

            if (
                config.has('Butler.mqttConfig.enable') &&
                config.get('Butler.mqttConfig.enable') === true &&
                config.has('Butler.serviceMonitor.alertDestination.mqtt.enable') &&
                config.get('Butler.serviceMonitor.alertDestination.mqtt.enable') === true
            ) {
                if (
                    !config.has('Butler.mqttConfig.serviceStatusTopic') ||
                    config.get('Butler.mqttConfig.serviceStatusTopic') === null ||
                    config.get('Butler.mqttConfig.serviceStatusTopic').length === 0
                ) {
                    logger.verbose(
                        `"${serviceName}" Windows service stopped. No MQTT topic defined in config entry "Butler.mqttConfig.serviceStatusTopic"`
                    );
                } else {
                    logger.verbose(`Sending service status to MQTT: service="${serviceName}", status="${status}"`);
                    globals.mqttClient.publish(
                        config.get('Butler.mqttConfig.serviceStatusTopic'),
                        JSON.stringify({
                            serviceName,
                            serviceDisplayName: serviceDetails.displayName,
                            serviceDependencies: serviceDetails.dependencies,
                            serviceStartType: serviceDetails.startType,
                            serviceExePath: serviceDetails.exePath,
                            serviceStatus: status,
                        })
                    );
                }
            }
        } else if (status === 'RUNNING') {
            logger.verbose(`Service "${serviceName}" is running`);
        }
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
                if (!config.has('Butler.serviceMonitor.service') || config.get('Butler.serviceMonitor.service').length === 0) {
                    logger.warn(`SERVICE MONITOR: Missing or empty section in config file: Butler.serviceMonitor.service`);
                } else {
                    logger.verbose(`SERVICE MONITOR: Setting up service monitor for services:`);
                    config.get('Butler.serviceMonitor.service').forEach((service) => {
                        logger.verbose(service);
                    });

                    const sched = later.parse.text(config.get('Butler.serviceMonitor.frequency'));
                    later.setInterval(() => {
                        checkServiceStatus(config, logger);
                    }, sched);

                    // Do an initial service status check
                    checkServiceStatus(config, logger);
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
