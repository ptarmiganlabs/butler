import globals from '../globals.js';

function configObfuscate(config) {
    try {
        const obfuscatedConfig = { ...config };

        // Obfuscate Butler.configVisualisation.host, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.configVisualisation.host =
            obfuscatedConfig.Butler.configVisualisation.host.substring(0, 3) + '*'.repeat(10);

        // Keep first 10 chars of remote URL, mask the rest with *
        obfuscatedConfig.Butler.heartbeat.remoteURL = obfuscatedConfig.Butler.heartbeat.remoteURL.substring(0, 10) + '*'.repeat(10);

        // Update entries in the array obfuscatedConfig.Butler.thirdPartyToolsCredentials.newRelic
        obfuscatedConfig.Butler.thirdPartyToolsCredentials.newRelic = obfuscatedConfig.Butler.thirdPartyToolsCredentials.newRelic?.map(
            (element) => ({
                ...element,
                insertApiKey: element.insertApiKey.substring(0, 5) + '*'.repeat(10),
                accountId: element.accountId.toString().substring(0, 3) + '*'.repeat(10),
            }),
        );

        // Obfuscate Butler.influxDb.hostIP, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.influxDb.hostIP = obfuscatedConfig.Butler.influxDb.hostIP.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.influxDb.auth.username, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.influxDb.auth.username = obfuscatedConfig.Butler.influxDb.auth.username.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.influxDb.auth.password, keep first 0 chars, mask the rest with *
        obfuscatedConfig.Butler.influxDb.auth.password = '*'.repeat(10);

        // Obfuscate Butler.qlikSenseVersion.versionMonitor.host, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseVersion.versionMonitor.host =
            obfuscatedConfig.Butler.qlikSenseVersion.versionMonitor.host.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.teamsNotification.reloadTaskFailure.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.teamsNotification.reloadTaskFailure.webhookURL =
            obfuscatedConfig.Butler.teamsNotification.reloadTaskFailure.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.teamsNotification.reloadTaskAborted.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.teamsNotification.reloadTaskAborted.webhookURL =
            obfuscatedConfig.Butler.teamsNotification.reloadTaskAborted.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.teamsNotification.serviceStopped.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.teamsNotification.serviceStopped.webhookURL =
            obfuscatedConfig.Butler.teamsNotification.serviceStopped.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.teamsNotification.serviceStarted.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.teamsNotification.serviceStarted.webhookURL =
            obfuscatedConfig.Butler.teamsNotification.serviceStarted.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.slackNotification.restMessage.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.slackNotification.restMessage.webhookURL =
            obfuscatedConfig.Butler.slackNotification.restMessage.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.slackNotification.reloadTaskFailure.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.slackNotification.reloadTaskFailure.webhookURL =
            obfuscatedConfig.Butler.slackNotification.reloadTaskFailure.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.slackNotification.reloadTaskAborted.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.slackNotification.reloadTaskAborted.webhookURL =
            obfuscatedConfig.Butler.slackNotification.reloadTaskAborted.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.slackNotification.serviceStopped.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.slackNotification.serviceStopped.webhookURL =
            obfuscatedConfig.Butler.slackNotification.serviceStopped.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.slackNotification.serviceStarted.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.slackNotification.serviceStarted.webhookURL =
            obfuscatedConfig.Butler.slackNotification.serviceStarted.webhookURL.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.emailNotification.smtp.host, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.emailNotification.smtp.host =
            obfuscatedConfig.Butler.emailNotification.smtp.host.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.emailNotification.smtp.auth.user, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.emailNotification.smtp.auth.user =
            obfuscatedConfig.Butler.emailNotification.smtp.auth.user.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.emailNotification.smtp.auth.password, keep first 0 chars, mask the rest with *
        obfuscatedConfig.Butler.emailNotification.smtp.auth.password = '*'.repeat(10);

        // Butler.webhookNotification.reloadTaskFailure is an array of objects
        // Obfuscate webhookURL property, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.webhookNotification.reloadTaskFailure.webhooks =
            obfuscatedConfig.Butler.webhookNotification.reloadTaskFailure.webhooks?.map((element) => ({
                ...element,
                webhookURL: element.webhookURL.substring(0, 10) + '*'.repeat(10),
            }));

        // Butler.webhookNotification.reloadTaskAborted is an array of objects
        // Obfuscate webhookURL property, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.webhookNotification.reloadTaskAborted.webhooks =
            obfuscatedConfig.Butler.webhookNotification.reloadTaskAborted.webhooks?.map((element) => ({
                ...element,
                webhookURL: element.webhookURL.substring(0, 10) + '*'.repeat(10),
            }));
        // Butler.webhookNotification.serviceMonitor is an array of objects
        // Obfuscate webhookURL property, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.webhookNotification.serviceMonitor.webhooks =
            obfuscatedConfig.Butler.webhookNotification.serviceMonitor.webhooks?.map((element) => ({
                ...element,
                webhookURL: element.webhookURL.substring(0, 10) + '*'.repeat(10),
            }));

        // Butler.webhookNotification.qlikSenseServerLicenseMonitor is an array of objects
        // Obfuscate webhookURL property, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks =
            obfuscatedConfig.Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks?.map((element) => ({
                ...element,
                webhookURL: element.webhookURL.substring(0, 10) + '*'.repeat(10),
            }));

        // Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert is an array of objects
        // Obfuscate webhookURL property, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks =
            obfuscatedConfig.Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks?.map((element) => ({
                ...element,
                webhookURL: element.webhookURL.substring(0, 10) + '*'.repeat(10),
            }));

        // Obfuscate Butler.mqttConfig.brokerHost, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.mqttConfig.brokerHost = obfuscatedConfig.Butler.mqttConfig.brokerHost.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.mqttConfig.azureEventGrid.clientId, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.mqttConfig.azureEventGrid.clientId =
            obfuscatedConfig.Butler.mqttConfig.azureEventGrid.clientId.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host =
            obfuscatedConfig.Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.auth.username, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username =
            obfuscatedConfig.Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.auth.password, keep first 0 chars, mask the rest with *
        obfuscatedConfig.Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password = '*'.repeat(10);

        // Obfuscate Butler.udpServerConfig.serverHost, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.udpServerConfig.serverHost =
            obfuscatedConfig.Butler.udpServerConfig.serverHost.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.restServerConfig.serverHost, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.restServerConfig.serverHost =
            obfuscatedConfig.Butler.restServerConfig.serverHost.substring(0, 3) + '*'.repeat(10);

        // Butler.serviceMonitor.monitor is an array
        // Obfuscate host property, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.serviceMonitor.monitor = obfuscatedConfig.Butler.serviceMonitor.monitor?.map((element) => ({
            ...element,
            host: element.host.substring(0, 3) + '*'.repeat(10),
        }));

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.id, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.id =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.id.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token, keep first 5 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token.substring(0, 5) + '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub.substring(0, 10) + '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL.substring(0, 10) +
            '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppAFailure.webhookURL, keep first 10 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.webhookURL =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.webhookURL.substring(0, 10) +
            '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user
        // This is an array of objects, each object has a property "directory" and "userId".
        // Obfuscateboth properties, keep first 0 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user?.map(
                (element) => ({
                    ...element,
                    directory: '*'.repeat(10),
                    userId: '*'.repeat(10),
                }),
            );

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.user
        // This is an array of objects, each object has a property "directory" and "userId".
        // Obfuscateboth properties, keep first 0 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.user =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.user?.map(
                (element) => ({
                    ...element,
                    directory: '*'.repeat(10),
                    userId: '*'.repeat(10),
                }),
            );

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.fromAddress, keep first 5 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.fromAddress =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.fromAddress.substring(0, 5) +
            '*'.repeat(10);

        // Obfuscate Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients
        // This is an array of strings, each string is an email address
        // Obfuscate each email address, keep first 5 chars, mask the rest with *
        obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients =
            obfuscatedConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients?.map(
                (element) => element.substring(0, 5) + '*'.repeat(10),
            );

        // Obfuscate Butler.configEngine.host, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.configEngine.host = obfuscatedConfig.Butler.configEngine.host.substring(0, 3) + '*'.repeat(10);

        // Obfuscate Butler.configQRS.host, keep first 3 chars, mask the rest with *
        obfuscatedConfig.Butler.configQRS.host = obfuscatedConfig.Butler.configQRS.host.substring(0, 3) + '*'.repeat(10);

        return obfuscatedConfig;
    } catch (err) {
        globals.logger.error(`CONFIG OBFUSCATE: Error obfuscating config: ${err.message}`);
        if (err.stack) {
            globals.logger.error(`CONFIG OBFUSCATE: ${err.stack}`);
        }
        throw err;
    }
}

export default configObfuscate;
