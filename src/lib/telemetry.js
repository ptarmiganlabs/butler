/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

const axios = require('axios');
var globals = require('../globals');

// const telemetryBaseUrl = 'http://localhost:7071/';
const telemetryBaseUrl = 'https://ptarmiganlabs-telemetry.azurewebsites.net/';
const telemetryUrl = '/api/butlerTelemetry';

var callRemoteURL = async function () {
    try {

        let body = {
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
                nodeVersion: globals.hostInfo.node.nodeVersion
            },
            enabledFeatures: {
                api: globals.config.has('Butler.restServerEndpointsEnable') ? globals.config.get('Butler.restServerEndpointsEnable') : {},
                feature: {
                    heartbeat: globals.config.has('Butler.heartbeat.enable') ? globals.config.get('Butler.heartbeat.enable') : false,
                    dockerHealthCheck: globals.config.has('Butler.dockerHealthCheck.enable') ? globals.config.get('Butler.dockerHealthCheck.enable') : false,
                    uptimeMonitor: globals.config.has('Butler.uptimeMonitor.enable') ? globals.config.get('Butler.uptimeMonitor.enable') : false,
                    uptimeMonitor_storeInInfluxdb: globals.config.has('Butler.uptimeMonitor.storeInInfluxdb.butlerSOSMemoryUsage') ? globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.butlerSOSMemoryUsage') : false,
                    teamsNotification: globals.config.has('Butler.teamsNotification.enable') ? globals.config.get('Butler.teamsNotification.enable') : false,
                    teamsNotification_reloadTaskFailure: globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable') ? globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable') : false,
                    teamsNotification_reloadTaskAborted: globals.config.has('Butler.teamsNotification.reloadTaskAborted.enable') ? globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable') : false,
                    slackNotification: globals.config.has('Butler.slackNotification.enable') ? globals.config.get('Butler.slackNotification.enable') : false,
                    slackNotification_reloadTaskFailure: globals.config.has('Butler.slackNotification.reloadTaskFailure.enable') ? globals.config.get('Butler.slackNotification.reloadTaskFailure.enable') : false,
                    slackNotification_reloadTaskAborted: globals.config.has('Butler.slackNotification.reloadTaskAborted.enable') ? globals.config.get('Butler.slackNotification.reloadTaskAborted.enable') : false,
                    emailNotification: globals.config.has('Butler.emailNotification.enable') ? globals.config.get('Butler.emailNotification.enable') : false,
                    emailNotification_reloadTaskFailure: globals.config.has('Butler.emailNotification.reloadTaskFailure.enable') ? globals.config.get('Butler.emailNotification.reloadTaskFailure.enable') : false,
                    emailNotification_reloadTaskAborted: globals.config.has('Butler.emailNotification.reloadTaskAborted.enable') ? globals.config.get('Butler.emailNotification.reloadTaskAborted.enable') : false,
                    webhookNotification: globals.config.has('Butler.webhookNotification.enable') ? globals.config.get('Butler.webhookNotification.enable') : false,
                    webhookNotification_reloadTaskFailure: globals.config.has('Butler.webhookNotification.reloadTaskFailure.enable') ? globals.config.get('Butler.webhookNotification.reloadTaskFailure.enable') : false,
                    webhookNotification_reloadTaskAborted: globals.config.has('Butler.webhookNotification.reloadTaskAborted.enable') ? globals.config.get('Butler.webhookNotification.reloadTaskAborted.enable') : false,
                    scheduler: globals.config.has('Butler.scheduler.enable') ? globals.config.get('Butler.scheduler.enable') : false,
                    mqtt: globals.config.has('Butler.mqttConfig.enable') ? globals.config.get('Butler.mqttConfig.enable') : false,
                    userActivityLogging: globals.config.has('Butler.userActivityLogging.enable') ? globals.config.get('Butler.userActivityLogging.enable') : false,
                }
            }
        };

        let axiosConfig = {
            url: telemetryUrl,
            method: 'post',
            baseURL: telemetryBaseUrl,
            data: body,
            timeout: 5000,
            responseType: 'text',
        };

        await axios.request(axiosConfig);
        globals.logger.debug('TELEMETRY: Sent anonymous telemetry. Thanks for contributing to making Butler better!');
    } catch (err) {
        globals.logger.error('TELEMETRY: Could not send anonymous telemetry.');
        globals.logger.error('     While not mandatory the telemetry data greatly helps the Butler developers.');
        globals.logger.error('     It provides insights into which features are used most and what hardware/OSs are most used out there.');
        globals.logger.error('     This information makes it possible to focus development efforts where they will make most impact and be most valuable.');
        globals.logger.error(`     Error: ${err.response.status} (${err.response.statusText}).`);
        globals.logger.error('❤️  Thank you for your supporting Butler by allowing telemetry! ❤️');
    }  
};

function setupAnonUsageReportTimer(logger, hostInfo) {
    try {
        setInterval(function () {
            callRemoteURL(logger, hostInfo);
        }, 1000*60*60*12);          // Report anon telemetry every 12 hours

        // Do an initial report to the remote URL
        callRemoteURL(logger, hostInfo);
    } catch (err) {
        logger.error(`TELEMETRY: ${err}`);
    }
}

module.exports = {
    setupAnonUsageReportTimer,
};
