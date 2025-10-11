import { PostHog } from 'posthog-node';

import globals from '../globals.js';
import { TELEMETRY_FLUSH_INTERVAL_MS, TELEMETRY_REQUEST_TIMEOUT_MS } from '../constants.js';

// Define variable to hold the PostHog client
let posthogClient;

/**
 * Calls a remote URL to gather and send telemetry data.
 * @async
 * @returns {Promise<void>}
 */
const callRemoteURL = async () => {
    try {
        let heartbeat = 'null';
        let dockerHealthCheck = 'null';
        let uptimeMonitor = 'null';
        let uptimeMonitorStoreInInfluxdb = 'null';
        let uptimeMonitorStoreInNewRelic = 'null';

        let api_apiListEnabledEndpoints = 'null';
        let api_base62ToBase16 = 'null';
        let api_base16ToBase62 = 'null';
        let api_butlerPing = 'null';
        let api_createDir = 'null';
        let api_createDirQvd = 'null';
        let api_fileDelete = 'null';
        let api_fileMove = 'null';
        let api_fileCopy = 'null';
        let api_keyValueStore = 'null';
        let api_mqttPublishMessage = 'null';
        let api_newRelic_postNewRelicMetric = 'null';
        let api_newRelic_postNewRelicEvent = 'null';
        let api_scheduler_createNewSchedule = 'null';
        let api_scheduler_getSchedule = 'null';
        let api_scheduler_getScheduleStatusAll = 'null';
        let api_scheduler_updateSchedule = 'null';
        let api_scheduler_deleteSchedule = 'null';
        let api_scheduler_startSchedule = 'null';
        let api_scheduler_stopSchedule = 'null';
        let api_senseAppReload = 'null';
        let api_senseAppDump = 'null';
        let api_senseListApps = 'null';
        let api_senseStartTask = 'null';
        let api_slackPostMessage = 'null';

        let influxDb_reloadTaskFailure = 'null';
        let influxDb_reloadTaskSuccess = 'null';

        let scriptLog_qseow_reloadTaskFailure = 'null';
        let scriptLog_qscloud_appReloadFailure = 'null';

        let teamsNotification_reloadTaskFailure = 'null';
        let teamsNotification_reloadTaskAborted = 'null';

        let slackNotification_reloadTaskFailure = 'null';
        let slackNotification_reloadTaskAborted = 'null';

        let emailNotification_reloadTaskFailure = 'null';
        let emailNotification_reloadTaskAborted = 'null';

        let webhookNotification = 'null';
        let webhookNotification_reloadTaskFailure = 'null';
        let webhookNotification_reloadTaskAborted = 'null';
        let webhookNotification_serviceMonitor = 'null';

        let signl4Notification_reloadTaskFailure = 'null';
        let signl4Notification_reloadTaskAborted = 'null';

        let newRelicNotification_reloadTaskFailure = 'null';
        let newRelicNotification_reloadTaskAborted = 'null';

        let qlikSenseCloud = 'null';
        let qlikSenseCloudReloadAppFailureTeamsNotification = 'null';
        let qlikSenseCloudReloadAppFailureSlackNotification = 'null';
        let qlikSenseCloudReloadAppFailureEmailNotification = 'null';

        let scheduler = 'null';
        let mqtt = 'null';
        let serviceMonitor = 'null';
        let keyValueStore = 'null';
        let udpServer = 'null';
        let restServer = 'null';

        // Gather info on what features are enabled/disabled
        if (globals.config.has('Butler.heartbeat.enable') && globals.config.get('Butler.heartbeat.enable') === true) {
            heartbeat = true;
        }

        if (globals.config.has('Butler.dockerHealthCheck.enable') && globals.config.get('Butler.dockerHealthCheck.enable') === true) {
            dockerHealthCheck = true;
        }

        if (globals.config.has('Butler.uptimeMonitor.enable') && globals.config.get('Butler.uptimeMonitor.enable') === true) {
            uptimeMonitor = true;
        }

        if (
            globals.config.has('Butler.uptimeMonitor.storeInInfluxdb.enable') &&
            globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.enable') === true
        ) {
            uptimeMonitorStoreInInfluxdb = true;
        }

        // API endpoints
        if (globals.config.has('Butler.uptimeMonitor.storeNewRelic.enable')) {
            uptimeMonitorStoreInNewRelic = globals.config.get('Butler.uptimeMonitor.storeNewRelic.enable');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.apiListEnabledEndpoints')) {
            api_apiListEnabledEndpoints = globals.config.get('Butler.restServerEndpointsEnable.apiListEnabledEndpoints');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.base62ToBase16')) {
            api_base62ToBase16 = globals.config.get('Butler.restServerEndpointsEnable.base62ToBase16');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.base16ToBase62')) {
            api_base16ToBase62 = globals.config.get('Butler.restServerEndpointsEnable.base16ToBase62');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.butlerping')) {
            api_butlerPing = globals.config.get('Butler.restServerEndpointsEnable.butlerping');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.createDir')) {
            api_createDir = globals.config.get('Butler.restServerEndpointsEnable.createDir');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.createDirQVD')) {
            api_createDirQvd = globals.config.get('Butler.restServerEndpointsEnable.createDirQVD');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.fileDelete')) {
            api_fileDelete = globals.config.get('Butler.restServerEndpointsEnable.fileDelete');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.fileMove')) {
            api_fileMove = globals.config.get('Butler.restServerEndpointsEnable.fileMove');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.fileCopy')) {
            api_fileCopy = globals.config.get('Butler.restServerEndpointsEnable.fileCopy');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.keyValueStore')) {
            api_keyValueStore = globals.config.get('Butler.restServerEndpointsEnable.keyValueStore');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.mqttPublishMessage')) {
            api_mqttPublishMessage = globals.config.get('Butler.restServerEndpointsEnable.mqttPublishMessage');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.newRelic.postNewRelicMetric')) {
            api_newRelic_postNewRelicMetric = globals.config.get('Butler.restServerEndpointsEnable.newRelic.postNewRelicMetric');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.newRelic.postNewRelicEvent')) {
            api_newRelic_postNewRelicEvent = globals.config.get('Butler.restServerEndpointsEnable.newRelic.postNewRelicEvent');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.createNewSchedule')) {
            api_scheduler_createNewSchedule = globals.config.get('Butler.restServerEndpointsEnable.scheduler.createNewSchedule');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.getSchedule')) {
            api_scheduler_getSchedule = globals.config.get('Butler.restServerEndpointsEnable.scheduler.getSchedule');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.getScheduleStatusAll')) {
            api_scheduler_getScheduleStatusAll = globals.config.get('Butler.restServerEndpointsEnable.scheduler.getScheduleStatusAll');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.updateSchedule')) {
            api_scheduler_updateSchedule = globals.config.get('Butler.restServerEndpointsEnable.scheduler.updateSchedule');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.deleteSchedule')) {
            api_scheduler_deleteSchedule = globals.config.get('Butler.restServerEndpointsEnable.scheduler.deleteSchedule');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.startSchedule')) {
            api_scheduler_startSchedule = globals.config.get('Butler.restServerEndpointsEnable.scheduler.startSchedule');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.scheduler.stopSchedule')) {
            api_scheduler_stopSchedule = globals.config.get('Butler.restServerEndpointsEnable.scheduler.stopSchedule');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.senseAppReload')) {
            api_senseAppReload = globals.config.get('Butler.restServerEndpointsEnable.senseAppReload');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.senseAppDump')) {
            api_senseAppDump = globals.config.get('Butler.restServerEndpointsEnable.senseAppDump');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.senseListApps')) {
            api_senseListApps = globals.config.get('Butler.restServerEndpointsEnable.senseListApps');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.senseStartTask')) {
            api_senseStartTask = globals.config.get('Butler.restServerEndpointsEnable.senseStartTask');
        }

        if (globals.config.has('Butler.restServerEndpointsEnable.slackPostMessage')) {
            api_slackPostMessage = globals.config.get('Butler.restServerEndpointsEnable.slackPostMessage');
        }

        if (globals.config.has('Butler.influxDb.reloadTaskFailure.enable')) {
            influxDb_reloadTaskFailure = globals.config.get('Butler.influxDb.reloadTaskFailure.enable');
        }

        if (globals.config.has('Butler.influxDb.reloadTaskSuccess.enable')) {
            influxDb_reloadTaskSuccess = globals.config.get('Butler.influxDb.reloadTaskSuccess.enable');
        }

        if (globals.config.has('Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.enable')) {
            scriptLog_qseow_reloadTaskFailure = globals.config.get('Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.enable');
        }

        if (globals.config.has('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable')) {
            scriptLog_qscloud_appReloadFailure = globals.config.get('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable');
        }

        if (globals.config.has('Butler.teamsNotification.reloadTaskFailure.enable')) {
            teamsNotification_reloadTaskFailure = globals.config.get('Butler.teamsNotification.reloadTaskFailure.enable');
        }

        if (globals.config.has('Butler.teamsNotification.reloadTaskAborted.enable')) {
            teamsNotification_reloadTaskAborted = globals.config.get('Butler.teamsNotification.reloadTaskAborted.enable');
        }

        if (globals.config.has('Butler.slackNotification.reloadTaskFailure.enable')) {
            slackNotification_reloadTaskFailure = globals.config.get('Butler.slackNotification.reloadTaskFailure.enable');
        }

        if (globals.config.has('Butler.slackNotification.reloadTaskAborted.enable')) {
            slackNotification_reloadTaskAborted = globals.config.get('Butler.slackNotification.reloadTaskAborted.enable');
        }

        if (globals.config.has('Butler.emailNotification.reloadTaskFailure.enable')) {
            emailNotification_reloadTaskFailure = globals.config.get('Butler.emailNotification.reloadTaskFailure.enable');
        }

        if (globals.config.has('Butler.emailNotification.reloadTaskAborted.enable')) {
            emailNotification_reloadTaskAborted = globals.config.get('Butler.emailNotification.reloadTaskAborted.enable');
        }

        if (globals.config.has('Butler.webhookNotification.enable') && globals.config.get('Butler.webhookNotification.enable') === true) {
            webhookNotification = true;
            webhookNotification_reloadTaskFailure = globals.config.get('Butler.webhookNotification.reloadTaskFailure.webhooks')?.length > 0;
            webhookNotification_reloadTaskAborted = globals.config.get('Butler.webhookNotification.reloadTaskAborted.webhooks')?.length > 0;
            webhookNotification_serviceMonitor = globals.config.get('Butler.webhookNotification.serviceMonitor.webhooks')?.length > 0;
        } else {
            webhookNotification = false;
            webhookNotification_reloadTaskFailure = false;
            webhookNotification_reloadTaskAborted = false;
            webhookNotification_serviceMonitor = false;
        }

        if (globals.config.has('Butler.incidentTool.signl4.reloadTaskFailure.enable')) {
            signl4Notification_reloadTaskFailure = globals.config.get('Butler.incidentTool.signl4.reloadTaskFailure.enable');
        }

        if (globals.config.has('Butler.incidentTool.signl4.reloadTaskAborted.enable')) {
            signl4Notification_reloadTaskAborted = globals.config.get('Butler.incidentTool.signl4.reloadTaskAborted.enable');
        }

        if (
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') ||
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable')
        ) {
            if (
                globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable') ||
                globals.config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable')
            ) {
                newRelicNotification_reloadTaskFailure = true;
            } else {
                newRelicNotification_reloadTaskFailure = false;
            }
        }

        if (
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable') ||
            globals.config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable')
        ) {
            if (
                globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable') ||
                globals.config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable')
            ) {
                newRelicNotification_reloadTaskAborted = true;
            } else {
                newRelicNotification_reloadTaskAborted = false;
            }
        }

        if (globals.config.has('Butler.scheduler.enable')) {
            scheduler = globals.config.get('Butler.scheduler.enable');
        }

        if (globals.config.has('Butler.mqttConfig.enable')) {
            mqtt = globals.config.get('Butler.mqttConfig.enable');
        }

        if (globals.config.has('Butler.serviceMonitor.enable')) {
            serviceMonitor = globals.config.get('Butler.serviceMonitor.enable');
        }

        if (globals.config.has('Butler.keyValueStore.enable')) {
            keyValueStore = globals.config.get('Butler.keyValueStore.enable');
        }

        if (globals.config.has('Butler.udpServerConfig.enable')) {
            udpServer = globals.config.get('Butler.udpServerConfig.enable');
        }

        if (globals.config.has('Butler.restServerConfig.enable')) {
            restServer = globals.config.get('Butler.restServerConfig.enable');
        }

        if (globals.config.has('Butler.qlikSenseCloud.enable')) {
            qlikSenseCloud = globals.config.get('Butler.qlikSenseCloud.enable');
        }

        if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable')) {
            qlikSenseCloudReloadAppFailureTeamsNotification = globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable',
            );
        }

        if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable')) {
            qlikSenseCloudReloadAppFailureSlackNotification = globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable',
            );
        }

        if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable')) {
            qlikSenseCloudReloadAppFailureEmailNotification = globals.config.get(
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable',
            );
        }

        // Build body that can be sent to PostHog
        const body = {
            distinctId: globals.hostInfo.id,
            event: 'telemetry sent',

            properties: {
                service: 'butler',
                serviceVersion: globals.appVersion,

                system_id: globals.hostInfo.id,
                system_arch: globals.hostInfo.si.os.arch,
                system_platform: globals.hostInfo.si.os.platform,
                system_release: globals.hostInfo.si.os.release,
                system_distro: globals.hostInfo.si.os.distro,
                system_codename: globals.hostInfo.si.os.codename,
                system_virtual: globals.hostInfo.si.system.virtual,
                system_isRunningInDocker: globals.hostInfo.isRunningInDocker,
                system_nodeVersion: globals.hostInfo.node.nodeVersion,

                feature_heartbeat: heartbeat,
                feature_dockerHealthCheck: dockerHealthCheck,
                feature_uptimeMonitor: uptimeMonitor,
                feature_uptimeMonitoStoreInInfluxdb: uptimeMonitorStoreInInfluxdb,
                feature_uptimeMonitoStoreInNewRelic: uptimeMonitorStoreInNewRelic,

                feature_apiListEnabledEndpoints: api_apiListEnabledEndpoints,
                feature_apiBase62ToBase16: api_base62ToBase16,
                feature_apiBase16ToBase62: api_base16ToBase62,
                feature_apiButlerPing: api_butlerPing,
                feature_apiCreateDir: api_createDir,
                feature_apiCreateDirQvd: api_createDirQvd,
                feature_apiFileDelete: api_fileDelete,
                feature_apiFileMove: api_fileMove,
                feature_apiFileCopy: api_fileCopy,
                feature_apiKeyValueStore: api_keyValueStore,
                feature_apiMqttPublishMessage: api_mqttPublishMessage,
                feature_apiNewRelicPostMetric: api_newRelic_postNewRelicMetric,
                feature_apiNewRelicPostEvent: api_newRelic_postNewRelicEvent,
                feature_apiSchedulerCreateNew: api_scheduler_createNewSchedule,
                feature_apiSchedulerGet: api_scheduler_getSchedule,
                feature_apiSchedulerGetStatusAll: api_scheduler_getScheduleStatusAll,
                feature_apiSchedulerUpdate: api_scheduler_updateSchedule,
                feature_apiSchedulerDelete: api_scheduler_deleteSchedule,
                feature_apiSchedulerStart: api_scheduler_startSchedule,
                feature_apiSchedulerStop: api_scheduler_stopSchedule,
                feature_apiSenseAppReload: api_senseAppReload,
                feature_apiSenseAppDump: api_senseAppDump,
                feature_apiSenseListApps: api_senseListApps,
                feature_apiSenseStartTask: api_senseStartTask,
                feature_apiSlackPostMessage: api_slackPostMessage,

                feature_influxDbReloadTaskFailure: influxDb_reloadTaskFailure,
                feature_influxDbReloadTaskSuccess: influxDb_reloadTaskSuccess,

                feature_scriptLogQseowReloadTaskFailure: scriptLog_qseow_reloadTaskFailure,
                feature_scriptLogQsCloudAppReloadFailure: scriptLog_qscloud_appReloadFailure,

                feature_teamsNotificationReloadTaskFailure: teamsNotification_reloadTaskFailure,
                feature_teamsNotificationReloadTaskAborted: teamsNotification_reloadTaskAborted,

                feature_slackNotificationReloadTaskFailure: slackNotification_reloadTaskFailure,
                feature_slackNotificationReloadTaskAborted: slackNotification_reloadTaskAborted,

                feature_signl4NotificationReloadTaskFailure: signl4Notification_reloadTaskFailure,
                feature_signl4NotificationReloadTaskAborted: signl4Notification_reloadTaskAborted,

                feature_newRelicNotificationReloadTaskFailure: newRelicNotification_reloadTaskFailure,
                feature_newRelicNotificationReloadTaskAborted: newRelicNotification_reloadTaskAborted,

                feature_emailNotificationReloadTaskFailure: emailNotification_reloadTaskFailure,
                feature_emailNotificationReloadTaskAborted: emailNotification_reloadTaskAborted,

                feature_webhookNotification: webhookNotification,
                feature_webhookNotificationReloadTaskFailure: webhookNotification_reloadTaskFailure,
                feature_webhookNotificationReloadTaskAborted: webhookNotification_reloadTaskAborted,
                feature_webhookNotificationServiceMonitor: webhookNotification_serviceMonitor,

                feature_qliksensecloud: qlikSenseCloud,
                feature_qliksensecloudReloadAppFailureTeamsNotification: qlikSenseCloudReloadAppFailureTeamsNotification,
                feature_qliksensecloudReloadAppFailureSlackNotification: qlikSenseCloudReloadAppFailureSlackNotification,
                feature_qliksensecloudReloadAppFailureEmailNotification: qlikSenseCloudReloadAppFailureEmailNotification,

                feature_mqtt: mqtt,
                feature_scheduler: scheduler,
                feature_serviceMonitor: serviceMonitor,
                feature_keyValueStore: keyValueStore,
                feature_udpServer: udpServer,
                feature_restServer: restServer,

                telemetry_json: {
                    system: {
                        id: globals.hostInfo.id,
                        arch: globals.hostInfo.si.os.arch,
                        platform: globals.hostInfo.si.os.platform,
                        release: globals.hostInfo.si.os.release,
                        distro: globals.hostInfo.si.os.distro,
                        codename: globals.hostInfo.si.os.codename,
                        virtual: globals.hostInfo.si.system.virtual,
                        isRunningInDocker: globals.hostInfo.isRunningInDocker,
                        nodeVersion: globals.hostInfo.node.nodeVersion,
                    },
                    enabledFeatures: {
                        feature: {
                            heartbeat,
                            dockerHealthCheck,
                            uptimeMonitor,
                            uptimeMonitor_storeInInfluxdb: uptimeMonitorStoreInInfluxdb,
                            uptimeMonitor_storeInNewRelic: uptimeMonitorStoreInNewRelic,

                            apiEnabledEndpoints: globals.config.has('Butler.restServerEndpointsEnable')
                                ? globals.config.get('Butler.restServerEndpointsEnable')
                                : {},

                            influxDbReloadTaskFailure: influxDb_reloadTaskFailure,
                            influxDbReloadTaskSuccess: influxDb_reloadTaskSuccess,

                            scriptLogStoreOnDisk: {
                                qseow: {
                                    reloadTaskFailure: scriptLog_qseow_reloadTaskFailure,
                                },
                                qsCloud: {
                                    appReloadFailure: scriptLog_qscloud_appReloadFailure,
                                },
                            },

                            teamsNotificationReloadTaskFailure: teamsNotification_reloadTaskFailure,
                            teamsNotificationReloadTaskAborted: teamsNotification_reloadTaskAborted,

                            slackNotificationReloadTaskFailure: slackNotification_reloadTaskFailure,
                            slackNotificationReloadTaskAborted: slackNotification_reloadTaskAborted,

                            signl4NotificationReloadTaskFailure: signl4Notification_reloadTaskFailure,
                            signl4NotificationReloadTaskAborted: signl4Notification_reloadTaskAborted,

                            newRelicNotificationReloadTaskFailure: newRelicNotification_reloadTaskFailure,
                            newRelicNotificationReloadTaskAborted: newRelicNotification_reloadTaskAborted,

                            emailNotificationReloadTaskFailure: emailNotification_reloadTaskFailure,
                            emailNotificationReloadTaskAborted: emailNotification_reloadTaskAborted,

                            webhookNotificationReloadTaskFailure: webhookNotification_reloadTaskFailure,
                            webhookNotificationReloadTaskAborted: webhookNotification_reloadTaskAborted,
                            webhookNotificationServiceMonitor: webhookNotification_serviceMonitor,

                            qlikSenseCloud: {
                                enabled: qlikSenseCloud,
                                reloadAppFailureTeamsNotification: qlikSenseCloudReloadAppFailureTeamsNotification,
                                reloadAppFailureSlackNotification: qlikSenseCloudReloadAppFailureSlackNotification,
                                reloadAppFailureEmailNotification: qlikSenseCloudReloadAppFailureEmailNotification,
                            },

                            mqtt,
                            scheduler,
                            serviceMonitor,
                            keyValueStore,
                            udpServer,
                            restServer,
                        },
                    },
                },
            },
        };

        // Send the telemetry to PostHog
        posthogClient.capture(body);

        globals.logger.debug('TELEMETRY: Sent anonymous telemetry. Thanks for contributing to making Butler better!');
    } catch (err) {
        globals.logger.error('TELEMETRY: Could not send anonymous telemetry.');
        globals.logger.error('     While not mandatory the telemetry data greatly helps the Butler developers.');
        globals.logger.error('     It provides insights into which features are used most and what hardware/OSs are used out there.');
        globals.logger.error(
            '     This information makes it possible to focus development efforts where they will make most impact and be most valuable.',
        );
        if (err.response) {
            globals.logger.error(`     Error: ${err.response.status} (${err.response.statusText}).`);
        } else {
            globals.logger.error(`     Error: ${globals.getErrorMessage(err)}`);
        }
        globals.logger.error('❤️  Thank you for supporting Butler by allowing telemetry! ❤️');
    }
};

/**
 * Sets up a timer to report anonymous usage data to PostHog.
 * @param {Object} logger - The logger object for logging messages.
 * @param {Object} hostInfo - Information about the host system.
 */
export default function setupAnonUsageReportTimer(logger, hostInfo) {
    try {
        // Setup PostHog client
        posthogClient = new PostHog('phc_5cmKiX9OubQjsSfOZuaolWaxo2z7WXqd295eB0uOtTb', {
            host: 'https://eu.posthog.com',
            flushAt: 1, // Flush events to PostHog as soon as they are captured
            flushInterval: TELEMETRY_FLUSH_INTERVAL_MS,
            requestTimeout: TELEMETRY_REQUEST_TIMEOUT_MS,
            disableGeoip: false, // Enable geoip lookups
        });

        setInterval(
            () => {
                callRemoteURL(logger, hostInfo);
            },
            1000 * 60 * 60 * 12,
        ); // Report anon telemetry every 12 hours

        // Do an initial report to the remote URL
        callRemoteURL(logger, hostInfo);
    } catch (err) {
        logger.error(`TELEMETRY: ${globals.getErrorMessage(err)}`);
    }
}
