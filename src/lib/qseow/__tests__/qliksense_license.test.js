import { jest } from '@jest/globals';

// Simple dot-path getter
function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

// Mutable config for globals and passed config object
let cfg;

// Logger mock
const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
};

// Mocks to assert side-effects
const postServerStatusMock = jest.fn();
const postLicenseStatusMock = jest.fn();
const postReleasedMock = jest.fn();
const webhookServerLicenseMock = jest.fn();
const mqttPublishMock = jest.fn();

// Allow overriding QRS responses from tests
const qrsOverrides = {
    get: {}, // map of path or prefix -> { statusCode, body }
};

// QRS API mock state
function makeQrs() {
    const Get = jest.fn(async (url) => {
        // Override handling: exact first
        if (qrsOverrides.get[url]) {
            return qrsOverrides.get[url];
        }
        // Prefix handlers for endpoints with query strings
        if (url.startsWith('license/professionalaccesstype') && qrsOverrides.get['license/professionalaccesstype']) {
            return qrsOverrides.get['license/professionalaccesstype'];
        }
        if (url.startsWith('license/analyzeraccesstype') && qrsOverrides.get['license/analyzeraccesstype']) {
            return qrsOverrides.get['license/analyzeraccesstype'];
        }
        if (url === 'license') {
            return {
                statusCode: 200,
                body: {
                    isExpired: false,
                    keyDetails: 'Serial: 0000\nValid To: 2099-12-31T00:00:00Z\nOther: x',
                },
            };
        }
        if (url === 'license/accesstypeoverview') {
            return { statusCode: 200, body: { access: 'ok' } };
        }
        if (url.startsWith('license/professionalaccesstype')) {
            return {
                statusCode: 200,
                body: [
                    {
                        id: 'LIC-P-1',
                        quarantined: false,
                        lastUsed: '2024-01-01T00:00:00Z',
                        user: { id: 'U1', userDirectory: 'DIR', userId: 'ID' },
                    },
                ],
            };
        }
        if (url.startsWith('license/analyzeraccesstype')) {
            return {
                statusCode: 200,
                body: [
                    {
                        id: 'LIC-A-1',
                        quarantined: false,
                        lastUsed: '2024-01-01T00:00:00Z',
                        user: { id: 'U2', userDirectory: 'DIR', userId: 'ID2' },
                    },
                ],
            };
        }
        if (url === 'user/U1') {
            return {
                statusCode: 200,
                body: { tags: [], customProperties: [], inactive: false, blacklisted: false, removedExternally: false },
            };
        }
        if (url === 'user/U2') {
            return {
                statusCode: 200,
                body: { tags: [], customProperties: [], inactive: false, blacklisted: false, removedExternally: false },
            };
        }
        return { statusCode: 404 };
    });
    const Delete = jest.fn(async (url) => {
        if (url.startsWith('license/professionalaccesstype/') || url.startsWith('license/analyzeraccesstype/')) {
            return { statusCode: 204, body: {} };
        }
        return { statusCode: 400 };
    });
    return { Get, Delete };
}

describe('qseow/qliksense_license', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        // Reset overrides
        qrsOverrides.get = {};

        cfg = {
            Butler: {
                // Destinations
                influxDb: { enable: true },
                mqttConfig: {
                    enable: true,
                    qlikSenseServerLicenseTopic: 'qs/server/license',
                    qlikSenseServerLicenseExpireTopic: 'qs/server/license/expire',
                },
                webhookNotification: { enable: true },

                // QRS cert/host
                configQRS: { host: 'qs-host' },

                // Server license monitor
                qlikSenseLicense: {
                    serverLicenseMonitor: {
                        enable: true,
                        frequency: 'every 1 hour',
                        alert: { thresholdDays: 5 },
                        destination: {
                            influxDb: { enable: true },
                            mqtt: { enable: true },
                            webhook: {
                                enable: true,
                                sendRecurring: { enable: true },
                                sendAlert: { enable: true },
                            },
                        },
                    },
                    licenseMonitor: {
                        enable: true,
                        frequency: 'every 1 hour',
                        destination: { influxDb: { enable: true } },
                    },
                    licenseRelease: {
                        enable: true,
                        frequency: 'every 1 hour',
                        dryRun: false,
                        neverRelease: {
                            user: [],
                            tag: [],
                            customProperty: [],
                            userDirectory: [],
                            inactive: 'ignore',
                            blocked: 'ignore',
                            removedExternally: 'ignore',
                        },
                        licenseType: {
                            professional: { enable: true, releaseThresholdDays: 30 },
                            analyzer: { enable: true, releaseThresholdDays: 30 },
                        },
                    },
                },
            },
        };

        // Common ESM mocks
        jest.unstable_mockModule('@breejs/later', () => ({
            default: {
                parse: { text: jest.fn(() => ({ parsed: true })) },
                setInterval: jest.fn(),
            },
        }));

        jest.unstable_mockModule('../../qrs_client.js', () => ({
            default: function QrsClient() {
                return makeQrs();
            },
        }));

        // Use path resolvable from this test file
        jest.unstable_mockModule('../../../globals.js', () => ({
            default: {
                logger,
                getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
                config: {
                    has: (path) => getByPath(cfg, path) !== undefined,
                    get: (path) => getByPath(cfg, path),
                },
                configQRS: { certPaths: { certPath: '/tmp/cert.pem', keyPath: '/tmp/key.pem' } },
                mqttClient: { publish: mqttPublishMock },
                getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
            },
        }));

        // Use path resolvable from this test file
        jest.unstable_mockModule('../../post_to_influxdb.js', () => ({
            postQlikSenseServerLicenseStatusToInfluxDB: postServerStatusMock,
            postQlikSenseLicenseStatusToInfluxDB: postLicenseStatusMock,
            postQlikSenseLicenseReleasedToInfluxDB: postReleasedMock,
        }));

        // Use path resolvable from this test file
        jest.unstable_mockModule('../webhook_notification.js', () => ({
            callQlikSenseServerLicenseWebhook: webhookServerLicenseMock,
        }));
    });

    test('setupQlikSenseServerLicenseMonitor posts to Influx, publishes MQTT, and sends recurring webhook on initial run', async () => {
        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        // Flush microtasks to allow async side-effects to complete
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Influx server license status posted
        expect(postServerStatusMock).toHaveBeenCalledWith(
            expect.objectContaining({ licenseExpired: false, expiryDateStr: '2099-12-31T00' }),
        );

        // MQTT general payload published
        expect(mqttPublishMock).toHaveBeenCalledWith(
            cfg.Butler.mqttConfig.qlikSenseServerLicenseTopic,
            expect.stringContaining('expiryDateStr'),
        );

        // Recurring webhook called
        expect(webhookServerLicenseMock).toHaveBeenCalledWith(
            expect.objectContaining({ event: 'server license status', expiryDateStr: '2099-12-31T00' }),
        );
    });

    test('setupQlikSenseAccessLicenseMonitor posts access license status to Influx on initial run', async () => {
        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(postLicenseStatusMock).toHaveBeenCalledWith({ access: 'ok' });
    });

    test('server license expired triggers MQTT expire topic and webhook alert', async () => {
        // Override server license to be expired
        qrsOverrides.get['license'] = {
            statusCode: 200,
            body: {
                isExpired: true,
                keyDetails: `Serial: 0000\nValid To: 2000-01-01T00:00:00Z\nOther: x`,
            },
        };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Expire topic should be used
        expect(mqttPublishMock).toHaveBeenCalledWith(
            cfg.Butler.mqttConfig.qlikSenseServerLicenseExpireTopic,
            expect.stringContaining('license expired'),
        );

        // Webhook alert for expired license
        expect(webhookServerLicenseMock).toHaveBeenCalledWith(expect.objectContaining({ event: 'server license has expired alert' }));
    });

    test('server license about to expire does not send alert when daysUntilExpiry is null', async () => {
        const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        qrsOverrides.get['license'] = {
            statusCode: 200,
            body: {
                isExpired: false,
                keyDetails: `Serial: 0000\nValid To: ${soon}\nOther: x`,
            },
        };
        // Ensure threshold makes it alert
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.alert.thresholdDays = 5;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // General publish occurs
        expect(mqttPublishMock).toHaveBeenCalledWith(cfg.Butler.mqttConfig.qlikSenseServerLicenseTopic, expect.any(String));
        // No expire alert publish
        expect(mqttPublishMock).not.toHaveBeenCalledWith(cfg.Butler.mqttConfig.qlikSenseServerLicenseExpireTopic, expect.any(String));
        // No webhook alert for about-to-expire
        expect(webhookServerLicenseMock).not.toHaveBeenCalledWith(
            expect.objectContaining({ event: 'server license about to expire alert' }),
        );
    });

    test('license release dryRun avoids delete and Influx posts', async () => {
        cfg.Butler.qlikSenseLicense.licenseRelease.dryRun = true;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(postReleasedMock).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Dry-run enabled. No licenses will be released'));
    });

    test('license release stops on QRS error without posting to Influx', async () => {
        // Make professional list call fail
        qrsOverrides.get['license/professionalaccesstype'] = { statusCode: 500, body: null };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(postReleasedMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('setupQlikSenseLicenseRelease releases both professional and analyzer licenses and posts to Influx', async () => {
        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Both releases should be recorded
        expect(postReleasedMock).toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'professional', licenseId: 'LIC-P-1' }));
        expect(postReleasedMock).toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'analyzer', licenseId: 'LIC-A-1' }));

        // Ensure multiple calls were made (both license types)
        expect(postReleasedMock).toHaveBeenCalledTimes(2);
    });

    test('server license monitor with disabled destination skips that destination', async () => {
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.enable = false;
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.destination.mqtt.enable = false;
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(postServerStatusMock).not.toHaveBeenCalled();
        expect(mqttPublishMock).not.toHaveBeenCalled();
        expect(webhookServerLicenseMock).not.toHaveBeenCalled();
    });

    test('server license monitor handles QRS error gracefully', async () => {
        qrsOverrides.get['license'] = { statusCode: 500, body: null };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('HTTP status code 500'));
        expect(postServerStatusMock).not.toHaveBeenCalled();
    });

    test('server license monitor handles empty response body', async () => {
        qrsOverrides.get['license'] = { statusCode: 200, body: null };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('HTTP status code 200'));
        expect(postServerStatusMock).not.toHaveBeenCalled();
    });

    test('server license with about to expire alert sends webhook and MQTT notifications', async () => {
        const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const soon = soonDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        qrsOverrides.get['license'] = {
            statusCode: 200,
            body: {
                isExpired: false,
                keyDetails: `Serial: 0000\nValid To: ${soon}\nOther: x`,
            },
        };
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.alert.thresholdDays = 5;
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.sendAlert.enable = true;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // About to expire webhook alert should be sent
        expect(webhookServerLicenseMock).toHaveBeenCalledWith(expect.objectContaining({ event: 'server license about to expire alert' }));

        // MQTT expire topic should be used
        expect(mqttPublishMock).toHaveBeenCalledWith(
            cfg.Butler.mqttConfig.qlikSenseServerLicenseExpireTopic,
            expect.stringContaining('is about to expire in 3 days'),
        );
    });

    test('access license monitor handles QRS error gracefully', async () => {
        qrsOverrides.get['license/accesstypeoverview'] = { statusCode: 500, body: null };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalled();
        expect(postLicenseStatusMock).not.toHaveBeenCalled();
    });

    test('access license monitor with disabled influx destination skips posting', async () => {
        cfg.Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(postLicenseStatusMock).not.toHaveBeenCalled();
    });

    test('license release with analyzer disabled skips analyzer license release', async () => {
        cfg.Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Only professional license should be released
        expect(postReleasedMock).toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'professional' }));
        expect(postReleasedMock).not.toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'analyzer' }));
        expect(postReleasedMock).toHaveBeenCalledTimes(1);
    });

    test('license release with professional disabled skips professional license release', async () => {
        cfg.Butler.qlikSenseLicense.licenseRelease.licenseType.professional.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Only analyzer license should be released
        expect(postReleasedMock).toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'analyzer' }));
        expect(postReleasedMock).not.toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'professional' }));
        expect(postReleasedMock).toHaveBeenCalledTimes(1);
    });

    test('license release with both license types disabled skips all releases', async () => {
        cfg.Butler.qlikSenseLicense.licenseRelease.licenseType.professional.enable = false;
        cfg.Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(postReleasedMock).not.toHaveBeenCalled();
    });

    test('license release handles delete error gracefully', async () => {
        qrsOverrides.get['license/professionalaccesstype'] = {
            statusCode: 200,
            body: [
                {
                    id: 'BAD-LICENSE',
                    quarantined: false,
                    lastUsed: '2024-01-01T00:00:00Z',
                    user: { id: 'U1', userDirectory: 'DIR', userId: 'ID' },
                },
            ],
        };
        // Override DELETE to return error
        const qrsInstance = makeQrs();
        qrsInstance.Delete = jest.fn().mockRejectedValue(new Error('Delete failed'));
        jest.unstable_mockModule('../../qrs_client.js', () => ({
            default: function QrsClient() {
                return qrsInstance;
            },
        }));

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Delete failed'));
    });

    test('license release with no licenses to release logs info', async () => {
        qrsOverrides.get['license/professionalaccesstype'] = { statusCode: 200, body: [] };
        qrsOverrides.get['license/analyzeraccesstype'] = { statusCode: 200, body: [] };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // When there are no licenses, the function should complete without errors
        expect(logger.error).not.toHaveBeenCalled();
    });

    test('server license monitor with webhook alert disabled skips alert webhook', async () => {
        const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        qrsOverrides.get['license'] = {
            statusCode: 200,
            body: {
                isExpired: false,
                keyDetails: `Serial: 0000\nValid To: ${soon}\nOther: x`,
            },
        };
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.alert.thresholdDays = 5;
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.sendAlert.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Recurring webhook should still be sent
        expect(webhookServerLicenseMock).toHaveBeenCalledWith(expect.objectContaining({ event: 'server license status' }));
        // But no alert webhook
        expect(webhookServerLicenseMock).not.toHaveBeenCalledWith(
            expect.objectContaining({ event: 'server license about to expire alert' }),
        );
    });

    test('server license monitor with recurring webhook disabled skips recurring webhook', async () => {
        cfg.Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.sendRecurring.enable = false;

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(webhookServerLicenseMock).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'server license status' }));
    });

    test('license release with invalid professional license list logs error', async () => {
        qrsOverrides.get['license/professionalaccesstype'] = { statusCode: 200, body: null };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalled();
        expect(postReleasedMock).not.toHaveBeenCalled();
    });

    test('license release with invalid analyzer license list logs error', async () => {
        qrsOverrides.get['license/analyzeraccesstype'] = { statusCode: 200, body: null };

        const mod = await import('../qliksense_license.js');
        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalled();
        // Professional should still work
        expect(postReleasedMock).toHaveBeenCalledWith(expect.objectContaining({ licenseType: 'professional' }));
    });

    test('setupQlikSenseLicenseRelease: should handle different license configurations', async () => {
        const mod = await import('../qliksense_license.js');

        cfg.Butler = {
            qlikSenseLicense: {
                licenseRelease: {
                    enable: true,
                    frequency: '0 */5 * * * *', // Every 5 minutes
                    licenseType: ['professional', 'analyzer', 'analyzer_capacity'],
                    destination: {
                        influxDb: { enable: true },
                        webhook: { enable: false },
                        mqtt: { enable: false },
                    },
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);

        expect(logger.verbose).toHaveBeenCalledWith('[QSEOW] Doing initial Qlik Sense license check');
    });

    test('setupQlikSenseAccessLicenseMonitor: should handle webhook destinations', async () => {
        const mod = await import('../qliksense_license.js');

        cfg.Butler = {
            qlikSenseLicense: {
                licenseMonitor: {
                    enable: true,
                    frequency: '0 */10 * * * *',
                    alertIfWithinDays: 30,
                    destination: {
                        influxDb: { enable: false },
                        webhook: {
                            enable: true,
                            rateLimit: 15,
                            webhooks: [
                                {
                                    description: 'License webhook',
                                    webhookURL: 'https://example.com/webhook',
                                    httpMethod: 'POST',
                                },
                            ],
                        },
                        mqtt: { enable: false },
                    },
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);

        expect(logger.verbose).toHaveBeenCalledWith('[QSEOW] Doing initial Qlik Sense license check');
    });

    test('setupQlikSenseServerLicenseMonitor: should handle MQTT destinations', async () => {
        const mod = await import('../qliksense_license.js');

        cfg.Butler = {
            qlikSenseLicense: {
                serverLicenseMonitor: {
                    enable: true,
                    frequency: '0 0 6 * * *', // Daily at 6 AM
                    destination: {
                        influxDb: { enable: false },
                        webhook: { enable: false },
                        mqtt: {
                            enable: true,
                            mqttConfig: {
                                brokerHost: 'localhost',
                                brokerPort: 1883,
                            },
                        },
                    },
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);

        expect(logger.verbose).toHaveBeenCalledWith('[QSEOW] Doing initial Qlik Sense server license check');
    });

    test('setupQlikSenseLicenseRelease: should handle disabled configuration', async () => {
        const mod = await import('../qliksense_license.js');

        cfg.Butler = {
            qlikSenseLicense: {
                licenseRelease: {
                    enable: false,
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseLicenseRelease(configObj, logger);

        // When disabled, the function should not log any verbose messages
        expect(logger.verbose).not.toHaveBeenCalledWith('[QSEOW] Doing initial Qlik Sense license check');
    });

    test('setupQlikSenseAccessLicenseMonitor: should handle disabled configuration', async () => {
        const mod = await import('../qliksense_license.js');

        cfg.Butler = {
            qlikSenseLicense: {
                licenseMonitor: {
                    enable: false,
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);

        // When disabled, the function should not log any verbose messages
        expect(logger.verbose).not.toHaveBeenCalledWith('[QSEOW] Doing initial Qlik Sense license check');
    });

    test('setupQlikSenseServerLicenseMonitor: should handle disabled configuration', async () => {
        const mod = await import('../qliksense_license.js');

        cfg.Butler = {
            qlikSenseLicense: {
                serverLicenseMonitor: {
                    enable: false,
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseServerLicenseMonitor(configObj, logger);

        // When disabled, the function should not log any verbose messages
        expect(logger.verbose).not.toHaveBeenCalledWith('[QSEOW] Doing initial Qlik Sense server license check');
    });

    test('should handle QRS API errors gracefully', async () => {
        const mod = await import('../qliksense_license.js');

        // Mock QRS to return error for the access license endpoint
        qrsOverrides.get['license/accesstypeoverview'] = { statusCode: 500, body: 'Internal Server Error' };

        cfg.Butler = {
            qlikSenseLicense: {
                licenseMonitor: {
                    enable: true,
                    frequency: '0 */1 * * * *',
                    alertIfWithinDays: 30,
                    destination: {
                        influxDb: { enable: true },
                    },
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('QLIKSENSE LICENSE MONITOR'));
    });

    test('should handle cron job creation errors', async () => {
        // Mock later to throw an error for invalid cron expressions
        jest.unstable_mockModule('@breejs/later', () => ({
            default: {
                parse: {
                    text: jest.fn((expr) => {
                        if (expr === 'invalid-cron-expression') {
                            throw new Error('Invalid cron expression');
                        }
                        return { parsed: true };
                    }),
                },
                setInterval: jest.fn(),
            },
        }));

        const mod = await import('../qliksense_license.js');

        // Force a cron job error by using invalid cron expression
        cfg.Butler = {
            qlikSenseLicense: {
                licenseMonitor: {
                    enable: true,
                    frequency: 'invalid-cron-expression',
                    alertIfWithinDays: 30,
                    destination: {
                        influxDb: { enable: true },
                    },
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('QLIKSENSE LICENSE MONITOR INIT'));
    });

    test('should handle missing license data gracefully', async () => {
        const mod = await import('../qliksense_license.js');

        // Mock QRS to return empty data for access license endpoint
        qrsOverrides.get['license/accesstypeoverview'] = { statusCode: 200, body: null };

        cfg.Butler = {
            qlikSenseLicense: {
                licenseMonitor: {
                    enable: true,
                    frequency: '0 */1 * * * *',
                    alertIfWithinDays: 30,
                    destination: {
                        influxDb: { enable: true },
                    },
                },
            },
        };

        const configObj = { get: (p) => getByPath(cfg, p) };
        await mod.setupQlikSenseAccessLicenseMonitor(configObj, logger);
        await Promise.resolve();
        await new Promise((r) => setImmediate(r));

        // Should handle null data gracefully
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('QLIKSENSE LICENSE MONITOR'));
    });
});
