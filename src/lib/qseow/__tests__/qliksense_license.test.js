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

        jest.unstable_mockModule('qrs-interact', () => ({
            default: function QrsInteract() {
                return makeQrs();
            },
        }));

        // Use path resolvable from this test file
        jest.unstable_mockModule('../../../globals.js', () => ({
            default: {
                logger,
                config: {
                    has: (path) => getByPath(cfg, path) !== undefined,
                    get: (path) => getByPath(cfg, path),
                },
                configQRS: { certPaths: { certPath: '/tmp/cert.pem', keyPath: '/tmp/key.pem' } },
                mqttClient: { publish: mqttPublishMock },
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
});
