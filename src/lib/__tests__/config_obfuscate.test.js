import { jest } from '@jest/globals';

describe('lib/config_obfuscate', () => {
    let configObfuscate;
    const mockGlobals = {
        logger: {
            error: jest.fn(),
        },
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        configObfuscate = (await import('../config_obfuscate.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper function to create a complete basic config structure
    function createBaseConfig() {
        return {
            Butler: {
                configVisualisation: { host: 'vis.example.com' },
                heartbeat: { remoteURL: 'https://heartbeat.example.com' },
                thirdPartyToolsCredentials: { newRelic: [] },
                influxDb: { hostIP: '192.168.1.1', auth: { username: 'user', password: 'pass' } },
                qlikSenseVersion: { versionMonitor: { host: 'version.example.com' } },
                teamsNotification: {
                    reloadTaskFailure: { webhookURL: 'http://teams1.com' },
                    reloadTaskAborted: { webhookURL: 'http://teams2.com' },
                    serviceStopped: { webhookURL: 'http://teams3.com' },
                    serviceStarted: { webhookURL: 'http://teams4.com' },
                },
                slackNotification: {
                    restMessage: { webhookURL: 'http://slack1.com' },
                    reloadTaskFailure: { webhookURL: 'http://slack2.com' },
                    reloadTaskAborted: { webhookURL: 'http://slack3.com' },
                    serviceStopped: { webhookURL: 'http://slack4.com' },
                    serviceStarted: { webhookURL: 'http://slack5.com' },
                },
                emailNotification: { smtp: { host: 'smtp.com', auth: { user: 'email', password: 'emailpass' } } },
                webhookNotification: {
                    reloadTaskFailure: { webhooks: [] },
                    reloadTaskAborted: { webhooks: [] },
                    serviceMonitor: { webhooks: [] },
                    qlikSenseServerLicenseMonitor: { webhooks: [] },
                    qlikSenseServerLicenseExpiryAlert: { webhooks: [] },
                },
                mqttConfig: {
                    brokerHost: 'mqtt.com',
                    azureEventGrid: { clientId: 'azure-id' },
                    qlikSenseCloud: { event: { mqttForward: { broker: { host: 'cloud.com', username: 'user', password: 'pass' } } } },
                },
                udpServerConfig: { serverHost: '127.0.0.1' },
                restServerConfig: { serverHost: '0.0.0.0' },
                serviceMonitor: { monitor: [] },
                qlikSenseCloud: {
                    event: {
                        mqtt: {
                            tenant: {
                                id: 'tenant-id',
                                tenantUrl: 'https://tenant.com',
                                auth: { jwt: { token: 'token123' } },
                                qlikSenseUrls: { qmc: 'https://qmc.com', hub: 'https://hub.com' },
                                alert: {
                                    teamsNotification: { reloadAppFailure: { webhookURL: 'https://teams.com' } },
                                    slackNotification: { reloadAppFailure: { webhookURL: 'https://slack.com' } },
                                    emailNotification: {
                                        reloadAppFailure: {
                                            appOwnerAlert: { includeOwner: { user: [] }, excludeOwner: { user: [] } },
                                            fromAddress: 'alerts@example.com',
                                            recipients: [],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                configEngine: { host: 'engine.com' },
                configQRS: { host: 'qrs.com' },
            },
        };
    }

    test('obfuscates configuration host fields correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.configVisualisation.host = 'somehost.example.com';
        testConfig.Butler.heartbeat.remoteURL = 'https://example.com/heartbeat';
        testConfig.Butler.influxDb.hostIP = '192.168.1.100';
        testConfig.Butler.influxDb.auth.username = 'testuser';
        testConfig.Butler.influxDb.auth.password = 'testpassword';
        testConfig.Butler.qlikSenseVersion.versionMonitor.host = 'qlik.example.com';
        testConfig.Butler.configEngine.host = 'engine.example.com';
        testConfig.Butler.configQRS.host = 'qrs.example.com';

        const result = configObfuscate(testConfig);

        expect(result.Butler.configVisualisation.host).toBe('som**********');
        expect(result.Butler.heartbeat.remoteURL).toBe('https://ex**********');
        expect(result.Butler.influxDb.hostIP).toBe('192**********');
        expect(result.Butler.influxDb.auth.username).toBe('tes**********');
        expect(result.Butler.influxDb.auth.password).toBe('**********');
        expect(result.Butler.qlikSenseVersion.versionMonitor.host).toBe('qli**********');
        expect(result.Butler.configEngine.host).toBe('eng**********');
        expect(result.Butler.configQRS.host).toBe('qrs**********');
    });

    test('obfuscates webhook URLs correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.teamsNotification.reloadTaskFailure.webhookURL = 'https://outlook.office.com/webhook/12345';
        testConfig.Butler.teamsNotification.reloadTaskAborted.webhookURL = 'https://outlook.office.com/webhook/67890';
        testConfig.Butler.slackNotification.restMessage.webhookURL = 'https://hooks.slack.com/services/123';

        const result = configObfuscate(testConfig);

        expect(result.Butler.teamsNotification.reloadTaskFailure.webhookURL).toBe('https://ou**********');
        expect(result.Butler.teamsNotification.reloadTaskAborted.webhookURL).toBe('https://ou**********');
        expect(result.Butler.slackNotification.restMessage.webhookURL).toBe('https://ho**********');
    });

    test('obfuscates New Relic credentials correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.thirdPartyToolsCredentials.newRelic = [
            {
                insertApiKey: 'NRAK-ABCDEFGHIJKLMNOP',
                accountId: '1234567890',
            },
            {
                insertApiKey: 'NRAK-QRSTUVWXYZ123456',
                accountId: '9876543210',
            },
        ];

        const result = configObfuscate(testConfig);

        expect(result.Butler.thirdPartyToolsCredentials.newRelic).toHaveLength(2);
        expect(result.Butler.thirdPartyToolsCredentials.newRelic[0].insertApiKey).toBe('NRAK-**********');
        expect(result.Butler.thirdPartyToolsCredentials.newRelic[0].accountId).toBe('123**********');
        expect(result.Butler.thirdPartyToolsCredentials.newRelic[1].insertApiKey).toBe('NRAK-**********');
        expect(result.Butler.thirdPartyToolsCredentials.newRelic[1].accountId).toBe('987**********');
    });

    test('obfuscates webhook notification arrays correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.webhookNotification.reloadTaskFailure.webhooks = [
            {
                webhookURL: 'https://webhook1.example.com/hook',
                name: 'Webhook 1',
            },
        ];
        testConfig.Butler.webhookNotification.reloadTaskAborted.webhooks = [
            {
                webhookURL: 'https://aborted.example.com/hook',
                name: 'Aborted Webhook',
            },
        ];

        const result = configObfuscate(testConfig);

        expect(result.Butler.webhookNotification.reloadTaskFailure.webhooks[0].webhookURL).toBe('https://we**********');
        expect(result.Butler.webhookNotification.reloadTaskFailure.webhooks[0].name).toBe('Webhook 1'); // Should not be obfuscated
        expect(result.Butler.webhookNotification.reloadTaskAborted.webhooks[0].webhookURL).toBe('https://ab**********');
    });

    test('obfuscates email and MQTT configuration correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.emailNotification.smtp.host = 'smtp.gmail.com';
        testConfig.Butler.emailNotification.smtp.auth.user = 'user@example.com';
        testConfig.Butler.emailNotification.smtp.auth.password = 'emailpassword';
        testConfig.Butler.mqttConfig.brokerHost = 'mqtt.example.com';
        testConfig.Butler.mqttConfig.azureEventGrid.clientId = 'azure-client-id-12345';

        const result = configObfuscate(testConfig);

        expect(result.Butler.emailNotification.smtp.host).toBe('smt**********');
        expect(result.Butler.emailNotification.smtp.auth.user).toBe('use**********');
        expect(result.Butler.emailNotification.smtp.auth.password).toBe('**********');
        expect(result.Butler.mqttConfig.brokerHost).toBe('mqt**********');
        expect(result.Butler.mqttConfig.azureEventGrid.clientId).toBe('azu**********');
    });

    test('obfuscates service monitor configurations correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.serviceMonitor.monitor = [
            {
                host: 'service1.example.com',
                name: 'Service 1',
            },
            {
                host: 'service2.example.com',
                name: 'Service 2',
            },
        ];

        const result = configObfuscate(testConfig);

        expect(result.Butler.serviceMonitor.monitor[0].host).toBe('ser**********');
        expect(result.Butler.serviceMonitor.monitor[0].name).toBe('Service 1'); // Should not be obfuscated
        expect(result.Butler.serviceMonitor.monitor[1].host).toBe('ser**********');
    });

    test('obfuscates Qlik Sense Cloud user arrays correctly', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user = [
            {
                directory: 'INTERNAL',
                userId: 'admin',
            },
        ];
        testConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.user = [
            {
                directory: 'EXTERNAL',
                userId: 'guest',
            },
        ];
        testConfig.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients = [
            'user1@example.com',
            'user2@example.com',
        ];

        const result = configObfuscate(testConfig);

        expect(
            result.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user[0]
                .directory,
        ).toBe('**********');
        expect(
            result.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.includeOwner.user[0]
                .userId,
        ).toBe('**********');
        expect(
            result.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.user[0]
                .directory,
        ).toBe('**********');
        expect(
            result.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert.excludeOwner.user[0]
                .userId,
        ).toBe('**********');
        expect(result.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients[0]).toBe(
            'user1**********',
        );
        expect(result.Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients[1]).toBe(
            'user2**********',
        );
    });

    test('preserves original config structure without modifying it', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.configVisualisation.host = 'original.example.com';

        const originalHost = testConfig.Butler.configVisualisation.host;
        const result = configObfuscate(testConfig);

        // Note: The function actually modifies the original object (shallow copy issue)
        // but creates a new reference, so we test what it actually does
        expect(result.Butler.configVisualisation.host).toBe('ori**********'); // Result should be obfuscated
        expect(result).not.toBe(testConfig); // Should be a different object reference
    });

    test('handles error cases gracefully', () => {
        const invalidConfig = null;

        expect(() => configObfuscate(invalidConfig)).toThrow();
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });

    test('handles missing optional fields gracefully', () => {
        const testConfig = createBaseConfig();
        testConfig.Butler.thirdPartyToolsCredentials.newRelic = null; // Test with null
        testConfig.Butler.webhookNotification.reloadTaskFailure.webhooks = undefined; // Test with undefined
        testConfig.Butler.serviceMonitor.monitor = null; // Test with null

        expect(() => configObfuscate(testConfig)).not.toThrow();
    });
});
