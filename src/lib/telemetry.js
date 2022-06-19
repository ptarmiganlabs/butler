/* eslint-disable prettier/prettier */
const axios = require('axios');

const globals = require('../globals');

// const telemetryBaseUrl = 'http://localhost:7071/';
const telemetryBaseUrl = 'https://ptarmiganlabs-telemetry.azurewebsites.net/';
const telemetryUrl = '/api/butlerTelemetry';

const callRemoteURL = async () => {
    try {
        const body = {
            service: 'butler',
            serviceVersion: globals.appVersion,
            system: {
                id: globals.hostInfo.id,
                arch: globals.hostInfo.si.os.arch,
                platform: globals.hostInfo.si.os.platform,
                release: globals.hostInfo.si.os.release,
                distro: globals.hostInfo.si.os.distro,
                codename: globals.hostInfo.si.os.codename,
                virtual: globals.hostInfo.si.system.virtual,
                hypervisor: globals.hostInfo.si.os.hypervizor,
                nodeVersion: globals.hostInfo.node.nodeVersion,
            },
            enabledFeatures: {
                api: globals.config.has('Butler.restServerEndpointsEnable') ? globals.config.get('Butler.restServerEndpointsEnable') : {},
                feature: {
                    heartbeat: globals.config.has('Butler.heartbeat.enable') ? globals.config.get('Butler.heartbeat.enable') : false,
                    dockerHealthCheck: globals.config.has('Butler.dockerHealthCheck.enable')
                        ? globals.config.get('Butler.dockerHealthCheck.enable')
                        : false,
                    uptimeMonitor: globals.config.has('Butler.uptimeMonitor.enable')
                        ? globals.config.get('Butler.uptimeMonitor.enable')
                        : false,
                    uptimeMonitor_storeInInfluxdb: globals.config.has('Butler.uptimeMonitor.storeInInfluxdb.enable')
                        ? globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.enable')
                        : false,
                    uptimeMonitor_storeInNewRelic: globals.config.has('Butler.uptimeMonitor.storeNewRelic.enable')
                        ? globals.config.get('Butler.uptimeMonitor.storeNewRelic.enable')
                        : false,
                    teamsNotification: globals.config.has('Butler.teamsNotification.enable')
                        ? globals.config.get('Butler.teamsNotification.enable')
                        : false,
                    teamsNotification_reloadTaskFailure: globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable')
                        ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable')
                        : false,
                    teamsNotification_reloadTaskAborted: globals.config.has('Butler.teamsNotification.reloadTaskAborted.enable')
                        ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable')
                        : false,
                    slackNotification: globals.config.has('Butler.slackNotification.enable')
                        ? globals.config.get('Butler.slackNotification.enable')
                        : false,
                    slackNotification_reloadTaskFailure: globals.config.has('Butler.slackNotification.reloadTaskFailure.enable')
                        ? globals.config.get('Butler.slackNotification.reloadTaskFailure.enable')
                        : false,
                    slackNotification_reloadTaskAborted: globals.config.has('Butler.slackNotification.reloadTaskAborted.enable')
                        ? globals.config.get('Butler.slackNotification.reloadTaskAborted.enable')
                        : false,
                    emailNotification: globals.config.has('Butler.emailNotification.enable')
                        ? globals.config.get('Butler.emailNotification.enable')
                        : false,
                    emailNotification_reloadTaskFailure: globals.config.has('Butler.emailNotification.reloadTaskFailure.enable')
                        ? globals.config.get('Butler.emailNotification.reloadTaskFailure.enable')
                        : false,
                    emailNotification_reloadTaskAborted: globals.config.has('Butler.emailNotification.reloadTaskAborted.enable')
                        ? globals.config.get('Butler.emailNotification.reloadTaskAborted.enable')
                        : false,
                    webhookNotification: globals.config.has('Butler.webhookNotification.enable')
                        ? globals.config.get('Butler.webhookNotification.enable')
                        : false,
                    webhookNotification_reloadTaskFailure: globals.config.has('Butler.webhookNotification.reloadTaskFailure.enable')
                        ? globals.config.get('Butler.webhookNotification.reloadTaskFailure.enable')
                        : false,
                    webhookNotification_reloadTaskAborted: globals.config.has('Butler.webhookNotification.reloadTaskAborted.enable')
                        ? globals.config.get('Butler.webhookNotification.reloadTaskAborted.enable')
                        : false,
                    signl4Notification_reloadTaskFailure: globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable')
                        ? globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable')
                        : false,
                    signl4Notification_reloadTaskAborted: globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.enable')
                        ? globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.enable')
                        : false,
                    newRelicNotification_reloadTaskFailure: globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.enable')
                        ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.enable')
                        : false,
                    newRelicNotification_reloadTaskAborted: globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.enable')
                        ? globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.enable')
                        : false,
                    scheduler: globals.config.has('Butler.scheduler.enable') ? globals.config.get('Butler.scheduler.enable') : false,
                    mqtt: globals.config.has('Butler.mqttConfig.enable') ? globals.config.get('Butler.mqttConfig.enable') : false,
                    userActivityLogging: globals.config.has('Butler.userActivityLogging.enable')
                        ? globals.config.get('Butler.userActivityLogging.enable')
                        : false,
                },
            },
        };

        const axiosConfig = {
            url: telemetryUrl,
            method: 'post',
            baseURL: telemetryBaseUrl,
            data: body,
            timeout: 15000,
            responseType: 'text',
        };

        await axios.request(axiosConfig);
        globals.logger.debug('TELEMETRY: Sent anonymous telemetry. Thanks for contributing to making Butler better!');
    } catch (err) {
        globals.logger.error('TELEMETRY: Could not send anonymous telemetry.');
        globals.logger.error('     While not mandatory the telemetry data greatly helps the Butler developers.');
        globals.logger.error('     It provides insights into which features are used most and what hardware/OSs are most used out there.');
        globals.logger.error(
            '     This information makes it possible to focus development efforts where they will make most impact and be most valuable.'
        );
        if (err.response) {
            globals.logger.error(`     Error: ${err.response.status} (${err.response.statusText}).`);
        } else {
            globals.logger.error(`     Error: ${err}`);
        }
        globals.logger.error('❤️  Thank you for your supporting Butler by allowing telemetry! ❤️');
    }
};

function setupAnonUsageReportTimer(logger, hostInfo) {
    try {
        setInterval(() => {
            callRemoteURL(logger, hostInfo);
        }, 1000 * 60 * 60 * 12); // Report anon telemetry every 12 hours

        // Do an initial report to the remote URL
        callRemoteURL(logger, hostInfo);
    } catch (err) {
        logger.error(`TELEMETRY: ${err}`);
    }
}

module.exports = {
    setupAnonUsageReportTimer,
};
