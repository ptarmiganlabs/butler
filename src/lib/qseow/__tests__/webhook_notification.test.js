/* eslint-disable prettier/prettier */
import { jest } from '@jest/globals';

// Mocks
const axiosReq = jest.fn().mockResolvedValue({ status: 200, data: {} });
jest.unstable_mockModule('axios', () => ({ default: { request: axiosReq } }));

const fsExistsSync = jest.fn().mockReturnValue(true);
const fsReadFileSync = jest.fn().mockReturnValue(Buffer.from('CA'));
jest.unstable_mockModule('fs', () => ({ default: { existsSync: fsExistsSync, readFileSync: fsReadFileSync } }));

jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
    default: jest.fn().mockResolvedValue({
        userName: 'owner',
        directory: 'DIR',
        userId: 'uid',
        emails: ['owner@example.com'],
    }),
}));

// Minimal globals with config and logger
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), error: jest.fn(), silly: jest.fn() };
const configStore = new Map();
const globalsMock = {
    logger,
    config: {
        has: (k) => configStore.has(k),
        get: (k) => configStore.get(k),
    },
};
jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

let sendReloadTaskFailureNotificationWebhook;
let sendReloadTaskAbortedNotificationWebhook;
let sendServiceMonitorWebhook;
let callQlikSenseServerLicenseWebhook;

// Pre-populate rateLimit keys so rate limiters initialize with short windows at module import time
configStore.set('Butler.webhookNotification.reloadTaskFailure.rateLimit', 1);
configStore.set('Butler.webhookNotification.reloadTaskAborted.rateLimit', 1);
configStore.set('Butler.webhookNotification.serviceMonitor.rateLimit', 1);
configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.rateLimit', 1);
configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.rateLimit', 1);

// Helper: wait until a condition becomes true or timeout
async function waitUntil(predicate, { timeout = 1500, interval = 25 } = {}) {
    const start = Date.now();
    while (true) {
        try {
            if (predicate()) return true;
        } catch (_) {
            // ignore predicate errors while dependencies initialize
        }
        if (Date.now() - start > timeout) return false;
        await new Promise((r) => setTimeout(r, interval));
    }
}

beforeAll(async () => {
    const mod = await import('../webhook_notification.js');
    ({
        sendReloadTaskFailureNotificationWebhook,
        sendReloadTaskAbortedNotificationWebhook,
        sendServiceMonitorWebhook,
        callQlikSenseServerLicenseWebhook,
    } = mod);
});

beforeEach(() => {
    jest.clearAllMocks();
    configStore.clear();

    // default rate limits
    configStore.set('Butler.webhookNotification.reloadTaskFailure.rateLimit', 1);
    configStore.set('Butler.webhookNotification.reloadTaskFailure', { enabled: true });
    configStore.set('Butler.webhookNotification.reloadTaskFailure.webhooks', [
        {
            description: 'GET hook',
            httpMethod: 'GET',
            webhookURL: 'https://example.com/hook',
            cert: { enable: true, rejectUnauthorized: false, certCA: '/path/ca.pem' },
        },
    ]);
    configStore.set('Butler.webhookNotification.serviceMonitor.rateLimit', 1);
    configStore.set('Butler.webhookNotification.enable', true);
    configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
        { description: 'POST hook', httpMethod: 'POST', webhookURL: 'https://example.com/service' },
    ]);
    configStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', true);

    // License monitor defaults
    configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.rateLimit', 1);
    configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
        { description: 'LM get', httpMethod: 'GET', webhookURL: 'https://example.com/lm' },
    ]);
    configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.rateLimit', 1);
    configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks', [
        { description: 'LA post', httpMethod: 'POST', webhookURL: 'https://example.com/la' },
    ]);
});

describe('webhook_notification', () => {
    test('sendReloadTaskFailureNotificationWebhook composes GET with query params and CA agent', async () => {
        const reloadParams = {
            hostName: 'host',
            user: 'user',
            taskName: 'task',
            taskId: 'tid1',
            appName: 'app',
            appId: 'aid1',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'exec1',
            logMessage: 'failed msg',
        };

        sendReloadTaskFailureNotificationWebhook(reloadParams);

        // allow async then() chain
        await new Promise((r) => setTimeout(r, 50));

        expect(axiosReq).toHaveBeenCalledTimes(1);
        const reqCfg = axiosReq.mock.calls[0][0];
        expect(reqCfg.method).toBe('get');
        expect(reqCfg.url).toMatch(/^https:\/\/example.com\/hook\?/);
        const urlObj = new URL(reqCfg.url);
        const qp = new URLSearchParams(urlObj.search);
        expect(qp.get('event')).toBe('Qlik Sense reload failed');
        expect(qp.get('taskName')).toBe('task');
        expect(reqCfg.httpsAgent).toBeDefined();
        expect(fsExistsSync).toHaveBeenCalledWith('/path/ca.pem');
        expect(fsReadFileSync).toHaveBeenCalledWith('/path/ca.pem');
    });

    test('sendServiceMonitorWebhook composes POST payload', async () => {
        const svc = {
            host: 'H1',
            serviceName: 'svc',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'Svc D', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };

        sendServiceMonitorWebhook(svc);

        await new Promise((r) => setTimeout(r, 10));

        expect(axiosReq).toHaveBeenCalledTimes(1);
        const reqCfg = axiosReq.mock.calls[0][0];
        expect(reqCfg.method).toBe('post');
        expect(reqCfg.url).toBe('https://example.com/service');
        expect(reqCfg.data).toEqual(
            expect.objectContaining({
                event: 'Windows service monitor',
                host: 'H1',
                serviceName: 'svc',
                currState: 'RUNNING',
            }),
        );
    });

    test('sendReloadTaskAbortedNotificationWebhook composes payload (POST)', async () => {
        // configure aborted webhook POST
        configStore.set('Butler.webhookNotification.reloadTaskAborted.rateLimit', 1);
        configStore.set('Butler.webhookNotification.reloadTaskAborted', { enabled: true });
        configStore.set('Butler.webhookNotification.reloadTaskAborted.webhooks', [
            { description: 'Aborted POST', httpMethod: 'POST', webhookURL: 'https://example.com/aborted' },
        ]);

        sendReloadTaskAbortedNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id2',
            appName: 'a',
            appId: 'aid2',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'aborted',
        });
        await new Promise((r) => setTimeout(r, 20));
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('post');
        expect(reqCfg.url).toBe('https://example.com/aborted');
    });

    test('sendReloadTaskAbortedNotificationWebhook GET with cert uses httpsAgent', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.reloadTaskAborted.rateLimit', 1);
        configStore.set('Butler.webhookNotification.reloadTaskAborted', { enabled: true });
        configStore.set('Butler.webhookNotification.reloadTaskAborted.webhooks', [
            {
                description: 'Aborted GET + cert',
                httpMethod: 'GET',
                webhookURL: 'https://example.com/aborted-get',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/ca.pem' },
            },
        ]);
        sendReloadTaskAbortedNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-aborted-get',
            appName: 'a',
            appId: 'aid-aborted-get',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'aborted',
        });
        await new Promise((r) => setTimeout(r, 40));
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('get');
        expect(reqCfg.url).toMatch(/^https:\/\/example.com\/aborted-get\?/);
        expect(reqCfg.httpsAgent).toBeDefined();
        expect(fsExistsSync).toHaveBeenCalledWith('/path/ca.pem');
        expect(fsReadFileSync).toHaveBeenCalledWith('/path/ca.pem');
    });

    test('sendReloadTaskAbortedNotificationWebhook PUT with cert composes JSON body and agent', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.reloadTaskAborted.rateLimit', 1);
        configStore.set('Butler.webhookNotification.reloadTaskAborted', { enabled: true });
        configStore.set('Butler.webhookNotification.reloadTaskAborted.webhooks', [
            {
                description: 'Aborted PUT + cert',
                httpMethod: 'PUT',
                webhookURL: 'https://example.com/aborted-put',
                cert: { enable: true, rejectUnauthorized: false, certCA: '/path/ca.pem' },
            },
        ]);
        sendReloadTaskAbortedNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-aborted-put',
            appName: 'a',
            appId: 'aid-aborted-put',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'aborted',
        });
        await new Promise((r) => setTimeout(r, 40));
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('put');
        expect(reqCfg.url).toBe('https://example.com/aborted-put');
        expect(reqCfg.data).toEqual(expect.objectContaining({ event: 'Qlik Sense reload aborted', taskName: 't' }));
        expect(reqCfg.httpsAgent).toBeDefined();
        expect(fsExistsSync).toHaveBeenCalledWith('/path/ca.pem');
        expect(fsReadFileSync).toHaveBeenCalledWith('/path/ca.pem');
    });

    test('aborted reload 404 error logs specific hint and url', async () => {
        axiosReq.mockClear();
        axiosReq.mockRejectedValueOnce({ message: 'Not Found', response: { status: 404 } });
        configStore.set('Butler.webhookNotification.reloadTaskAborted.rateLimit', 1);
        configStore.set('Butler.webhookNotification.reloadTaskAborted', { enabled: true });
        configStore.set('Butler.webhookNotification.reloadTaskAborted.webhooks', [
            { description: 'Aborted GET', httpMethod: 'GET', webhookURL: 'https://example.com/aborted404' },
        ]);
        sendReloadTaskAbortedNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-aborted-404',
            appName: 'a',
            appId: 'aid-aborted-404',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'aborted',
        });
        await new Promise((r) => setTimeout(r, 50));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('404 error could mean'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Webhook url:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Webhook config:'));
    });

    test('service monitor GET with cert uses httpsAgent', async () => {
        // Set service monitor webhook to GET with cert
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            {
                description: 'GET + cert',
                httpMethod: 'GET',
                webhookURL: 'https://example.com/service-get',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/ca.pem' },
            },
        ]);

        const svc = {
            host: 'H2',
            serviceName: 'svc2',
            serviceStatus: 'STOPPED',
            serviceDetails: { displayName: 'Svc2 D', startType: 'Manual' },
            prevState: 'RUNNING',
            currState: 'STOPPED',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 20));
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('get');
        expect(reqCfg.url).toMatch(/^https:\/\/example.com\/service-get\?/);
        expect(reqCfg.httpsAgent).toBeDefined();
    });

    test('service monitor PUT with cert composes JSON body and agent', async () => {
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            {
                description: 'PUT + cert',
                httpMethod: 'PUT',
                webhookURL: 'https://example.com/service-put',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/ca.pem' },
            },
        ]);

        const svc = {
            host: 'H3',
            serviceName: 'svc3',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'Svc3', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 20));
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('put');
        expect(reqCfg.url).toBe('https://example.com/service-put');
        expect(reqCfg.data).toEqual(expect.objectContaining({ event: 'Windows service monitor', host: 'H3', serviceName: 'svc3' }));
        expect(reqCfg.httpsAgent).toBeDefined();
    });

    test('invalid webhook method logs error and skips axios', async () => {
        axiosReq.mockClear();
        // use invalid method on reload failure
        configStore.set('Butler.webhookNotification.reloadTaskFailure.webhooks', [
            { description: 'Bad method', httpMethod: 'DELETE', webhookURL: 'https://bad.example.com' },
        ]);
        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id3',
            appName: 'a',
            appId: 'aid3',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'm',
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('invalid cert settings cause validation error and skip axios', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.reloadTaskFailure.webhooks', [
            {
                description: 'Bad cert types',
                httpMethod: 'GET',
                webhookURL: 'https://badcert.example.com',
                cert: { enable: true, rejectUnauthorized: 'nope', certCA: 123 },
            },
        ]);
        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-cert',
            appName: 'a',
            appId: 'aid-cert',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'm',
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('license expiry alert PUT method', async () => {
        // Use expiry alert webhooks to avoid clashing with the license-monitor rate limiter key
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks', [
            { description: 'LA put', httpMethod: 'PUT', webhookURL: 'https://example.com/la-put' },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-01-01',
            daysUntilExpiry: 10,
        });
        await new Promise((r) => setTimeout(r, 40));
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('put');
        expect(reqCfg.url).toBe('https://example.com/la-put');
    });

    test('no webhooks path logs info and skips axios for license expiry alert', async () => {
        axiosReq.mockClear();
        // Remove webhooks for expiry alert to trigger the no-webhooks path
        configStore.delete('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks');
        // Avoid rate limiter collisions with earlier tests
        await new Promise((r) => setTimeout(r, 1300));
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-01-01',
            daysUntilExpiry: 5,
        });
        // Wait until logger.info is invoked by the no-webhooks branch
        const logged = await waitUntil(
            () =>
                logger.info.mock.calls.some(
                    (c) =>
                        String(c[0]).includes('No outgoing webhooks to process') ||
                        String(c[0]).includes('QLIK SENSE SERVER LICENSE MONITOR: No outgoing webhooks to process'),
                ),
            { timeout: 1500 },
        );
        expect(logged).toBe(true);
        expect(axiosReq).not.toHaveBeenCalled();
    });

    test('reload failure 404 error logs specific hint', async () => {
        // Make axios reject once with a 404
        axiosReq.mockRejectedValueOnce({ message: 'Not Found', response: { status: 404 } });
        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id4',
            appName: 'a',
            appId: 'aid4',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'e',
            logMessage: 'm',
        });
        await new Promise((r) => setTimeout(r, 30));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('404 error could mean'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Webhook url:'));
    });

    test('callQlikSenseServerLicenseWebhook handles status and expiry alert events', async () => {
        // Status event -> GET to lm
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-12-31',
            daysUntilExpiry: 100,
        });
        // Wait for first axios call
        const firstSent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(firstSent).toBe(true);
        const c1 = axiosReq.mock.calls.pop()[0];
        expect(c1.method).toBe('get');
        expect(c1.url).toMatch(/^https:\/\/example.com\/lm\?/);

        // Expiry alert -> POST to la
        // Avoid rate limiter collisions with prior expiry-alert tests
        await new Promise((r) => setTimeout(r, 1300));
        await callQlikSenseServerLicenseWebhook({
            event: 'server license has expired alert',
            licenseExpired: true,
            expiryDateStr: '2000-01-01',
            daysUntilExpiry: 0,
        });
        const secondSent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(secondSent).toBe(true);
        const c2 = axiosReq.mock.calls.pop()[0];
        expect(c2.method).toBe('post');
        expect(c2.url).toBe('https://example.com/la');
        expect(c2.data).toEqual(expect.objectContaining({ event: 'server license has expired alert', licenseExpired: true }));
    });

    test('rate limiter prevents duplicate reload failure webhook', async () => {
        const req = {
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'tid-rate',
            appName: 'a',
            appId: 'aid-rate',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'e',
            logMessage: 'm',
        };
        axiosReq.mockClear();
        sendReloadTaskFailureNotificationWebhook(req);
        sendReloadTaskFailureNotificationWebhook(req);
        await new Promise((r) => setTimeout(r, 80));
        expect(axiosReq).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalled();
    });

    test('invalid webhook config logs and continues', async () => {
        // Break CA exists check so cert path fails and triggers error branch
        fsExistsSync.mockReturnValueOnce(false);
        // Inject a webhook with cert requirement in failure path
        configStore.set('Butler.webhookNotification.reloadTaskFailure.webhooks', [
            {
                description: 'Bad cert',
                httpMethod: 'GET',
                webhookURL: 'https://example.com/hook',
                cert: { enable: true, rejectUnauthorized: false, certCA: '/missing.pem' },
            },
        ]);

        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id',
            appName: 'a',
            appId: 'aid',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'e',
            logMessage: 'm',
        });
        await new Promise((r) => setTimeout(r, 20));
        // axios not called due to invalid config -> error logged
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('license status no-webhooks path logs info and skips axios', async () => {
        axiosReq.mockClear();
        // Remove webhooks for license monitor
        configStore.delete('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks');
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-01-01',
            daysUntilExpiry: 50,
        });
        const logged = await waitUntil(
            () =>
                logger.info.mock.calls.some(
                    (c) =>
                        String(c[0]).includes('No outgoing webhooks to process') ||
                        String(c[0]).includes('QLIK SENSE SERVER LICENSE MONITOR: No outgoing webhooks to process'),
                ),
            { timeout: 1500 },
        );
        expect(logged).toBe(true);
        expect(axiosReq).not.toHaveBeenCalled();
    });

    test('license monitor rate limiter suppresses duplicate sends', async () => {
        axiosReq.mockClear();
        // Ensure previous status events have expired their limiter window
        await new Promise((r) => setTimeout(r, 1300));
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-12-31',
            daysUntilExpiry: 120,
        });
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-12-31',
            daysUntilExpiry: 120,
        });
        // Wait for first axios request only
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        // Give a moment for limiter catch to log
        await new Promise((r) => setTimeout(r, 40));
        expect(axiosReq).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(
            expect.stringContaining('Rate limiting failed. Not sending Qlik Sense server license monitor notification'),
        );
    });

    test('license expiry alert rate limiter suppresses duplicate sends', async () => {
        axiosReq.mockClear();
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-01-01',
            daysUntilExpiry: 7,
        });
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-01-01',
            daysUntilExpiry: 7,
        });
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        await new Promise((r) => setTimeout(r, 40));
        expect(axiosReq).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(
            expect.stringContaining('Rate limiting failed. Not sending Qlik Sense server license expiry alert'),
        );
    });

    test('license monitor GET with cert uses httpsAgent', async () => {
        axiosReq.mockClear();
        // Cooldown to avoid limiter collisions
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            {
                description: 'LM GET cert',
                httpMethod: 'GET',
                webhookURL: 'https://example.com/lm-cert',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/ca.pem' },
            },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-11-11',
            daysUntilExpiry: 90,
        });
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('get');
        expect(reqCfg.url).toMatch(/^https:\/\/example.com\/lm-cert\?/);
        expect(reqCfg.httpsAgent).toBeDefined();
        expect(fsExistsSync).toHaveBeenCalledWith('/path/ca.pem');
        expect(fsReadFileSync).toHaveBeenCalledWith('/path/ca.pem');
    });

    test('reload failure with no webhooks logs info and skips axios', async () => {
        axiosReq.mockClear();
        // Ensure key exists (config.has true) but value is null so sendOutgoingWebhook hits the no-webhooks branch
        configStore.set('Butler.webhookNotification.reloadTaskFailure.webhooks', null);
        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-nw',
            appName: 'a',
            appId: 'aid-nw',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'e',
            logMessage: 'm',
        });
        const logged = await waitUntil(() => logger.info.mock.calls.some((c) => String(c[0]).includes('No outgoing webhooks to process')), {
            timeout: 800,
        });
        expect(logged).toBe(true);
        expect(axiosReq).not.toHaveBeenCalled();
    });

    test('license expiry POST with cert uses httpsAgent', async () => {
        axiosReq.mockClear();
        // Cooldown to avoid limiter collisions
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks', [
            {
                description: 'LA POST cert',
                httpMethod: 'POST',
                webhookURL: 'https://example.com/la-cert',
                cert: { enable: true, rejectUnauthorized: false, certCA: '/path/ca.pem' },
            },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-10-10',
            daysUntilExpiry: 15,
        });
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('post');
        expect(reqCfg.url).toBe('https://example.com/la-cert');
        expect(reqCfg.httpsAgent).toBeDefined();
        expect(fsExistsSync).toHaveBeenCalledWith('/path/ca.pem');
        expect(fsReadFileSync).toHaveBeenCalledWith('/path/ca.pem');
    });

    test('license monitor invalid method logs error and skips axios', async () => {
        axiosReq.mockClear();
        // Cooldown
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            { description: 'LM bad', httpMethod: 'DELETE', webhookURL: 'https://bad.example.com' },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-12-31',
            daysUntilExpiry: 200,
        });
        // short wait
        await new Promise((r) => setTimeout(r, 50));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('license expiry invalid cert types logs error and skips axios', async () => {
        axiosReq.mockClear();
        // Cooldown
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks', [
            {
                description: 'LA bad cert',
                httpMethod: 'POST',
                webhookURL: 'https://example.com/la-bad',
                cert: { enable: true, rejectUnauthorized: 'nope', certCA: 42 },
            },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-12-01',
            daysUntilExpiry: 25,
        });
        await new Promise((r) => setTimeout(r, 50));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('license monitor 404 error logs outer error message', async () => {
        axiosReq.mockClear();
        // Next request rejects with 404
        axiosReq.mockRejectedValueOnce({ message: 'Not Found', response: { status: 404 } });
        // Cooldown and set GET hook
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            { description: 'LM GET', httpMethod: 'GET', webhookURL: 'https://example.com/lm404' },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-08-08',
            daysUntilExpiry: 140,
        });
        // wait a bit for logging
        await new Promise((r) => setTimeout(r, 60));
        // License monitor path logs via outer catch, without the inner 404 hint
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT QLIK SENSE SERVER LICENSE MONITOR 1 message:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Not Found'));
    });

    test('service monitor no-webhooks path yields config-missing error and skips axios', async () => {
        axiosReq.mockClear();
        configStore.delete('Butler.webhookNotification.serviceMonitor.webhooks');
        const svc = {
            host: 'H-NO',
            serviceName: 'svc-no',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcNo', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        const errLogged = await waitUntil(
            () =>
                logger.error.mock.calls.some((c) =>
                    String(c[0]).includes('Service monitor outgoing webhook config info missing in Butler config file'),
                ),
            { timeout: 600 },
        );
        expect(errLogged).toBe(true);
        expect(axiosReq).not.toHaveBeenCalled();
    });

    test('license monitor GET with cert but missing CA file logs and skips axios', async () => {
        axiosReq.mockClear();
        // Cooldown
        await new Promise((r) => setTimeout(r, 1300));
        // Configure GET with cert
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            {
                description: 'LM GET cert missing',
                httpMethod: 'GET',
                webhookURL: 'https://example.com/lm-missing-ca',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/missing-ca.pem' },
            },
        ]);
        // Make fs.existsSync return false for the CA check
        fsExistsSync.mockReturnValueOnce(false);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-07-07',
            daysUntilExpiry: 180,
        });
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('CA cert file not found'));
    });

    test('license expiry POST with cert but missing CA file logs and skips axios', async () => {
        axiosReq.mockClear();
        // Cooldown
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks', [
            {
                description: 'LA POST cert missing',
                httpMethod: 'POST',
                webhookURL: 'https://example.com/la-missing-ca',
                cert: { enable: true, rejectUnauthorized: false, certCA: '/path/missing-ca.pem' },
            },
        ]);
        // Make fs.existsSync return false for the CA check
        fsExistsSync.mockReturnValueOnce(false);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-05-05',
            daysUntilExpiry: 60,
        });
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('CA cert file not found'));
    });

    test('license expiry invalid method logs error and skips axios', async () => {
        axiosReq.mockClear();
        // Cooldown
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseExpiryAlert.webhooks', [
            { description: 'LA bad', httpMethod: 'DELETE', webhookURL: 'https://bad.example.com/la' },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license about to expire alert',
            licenseExpired: false,
            expiryDateStr: '2099-04-04',
            daysUntilExpiry: 45,
        });
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('service monitor rate limiter suppresses duplicate sends', async () => {
        axiosReq.mockClear();
        // Ensure config is present
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            { description: 'POST hook', httpMethod: 'POST', webhookURL: 'https://example.com/service' },
        ]);
        const svc = {
            host: 'H-LIM',
            serviceName: 'svc-lim',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcLim', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        sendServiceMonitorWebhook(svc);
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(
            expect.stringContaining('Rate limiting failed. Not sending service monitor notification via outgoing webhook'),
        );
    });

    test('service monitor GET with cert but missing CA file logs and skips axios', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            {
                description: 'SM GET cert missing',
                httpMethod: 'GET',
                webhookURL: 'https://example.com/sm-missing-ca',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/missing-ca.pem' },
            },
        ]);
        fsExistsSync.mockReturnValueOnce(false);
        const svc = {
            host: 'H-SM',
            serviceName: 'svc-sm',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcSM', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('CA cert file not found'));
    });

    test('service monitor invalid cert types logs error and skips axios', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            {
                description: 'SM bad cert types',
                httpMethod: 'POST',
                webhookURL: 'https://example.com/sm-bad',
                cert: { enable: true, rejectUnauthorized: 'nope', certCA: 123 },
            },
        ]);
        const svc = {
            host: 'H-SM2',
            serviceName: 'svc-sm2',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcSM2', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('service monitor invalid method logs error and skips axios', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            { description: 'SM bad method', httpMethod: 'DELETE', webhookURL: 'https://bad.example.com/sm' },
        ]);
        const svc = {
            host: 'H-SM3',
            serviceName: 'svc-sm3',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcSM3', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('service monitor with no webhooks (key present null) logs info and skips axios', async () => {
        axiosReq.mockClear();
        // Ensure all required has() checks pass but webhooks value is null
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', null);
        const svc = {
            host: 'H-SM-NW',
            serviceName: 'svc-sm-nw',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcSMNW', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        const logged = await waitUntil(() => logger.info.mock.calls.some((c) => String(c[0]).includes('No outgoing webhooks to process')), {
            timeout: 800,
        });
        expect(logged).toBe(true);
        expect(axiosReq).not.toHaveBeenCalled();
    });

    test('license monitor PUT with cert uses httpsAgent', async () => {
        axiosReq.mockClear();
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            {
                description: 'LM PUT cert',
                httpMethod: 'PUT',
                webhookURL: 'https://example.com/lm-put',
                cert: { enable: true, rejectUnauthorized: true, certCA: '/path/ca.pem' },
            },
        ]);
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-06-06',
            daysUntilExpiry: 170,
        });
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        const reqCfg = axiosReq.mock.calls.pop()[0];
        expect(reqCfg.method).toBe('put');
        expect(reqCfg.url).toBe('https://example.com/lm-put');
        expect(reqCfg.httpsAgent).toBeDefined();
        expect(fsExistsSync).toHaveBeenCalledWith('/path/ca.pem');
        expect(fsReadFileSync).toHaveBeenCalledWith('/path/ca.pem');
    });

    test('service monitor axios error with message/stack logs both', async () => {
        axiosReq.mockClear();
        // Configure a valid webhook so we reach axios.request
        configStore.set('Butler.webhookNotification.serviceMonitor.webhooks', [
            { description: 'SM POST', httpMethod: 'POST', webhookURL: 'https://example.com/sm-post' },
        ]);
        // Next request rejects with an Error (has message and stack)
        axiosReq.mockRejectedValueOnce(new Error('sm boom'));
        const svc = {
            host: 'H-SM-ERR',
            serviceName: 'svc-sm-err',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcSMErr', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 80));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SERVICE MONITOR WEBHOOKOUT 1 message:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SERVICE MONITOR WEBHOOKOUT 1 stack:'));
    });

    test('license monitor axios error with message/stack logs both', async () => {
        axiosReq.mockClear();
        // Cooldown to avoid limiter collisions
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            { description: 'LM GET', httpMethod: 'GET', webhookURL: 'https://example.com/lm-err' },
        ]);
        axiosReq.mockRejectedValueOnce(new Error('lm boom'));
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-03-03',
            daysUntilExpiry: 250,
        });
        await new Promise((r) => setTimeout(r, 80));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT QLIK SENSE SERVER LICENSE MONITOR 1 message:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT QLIK SENSE SERVER LICENSE MONITOR 1 stack:'));
    });

    test('reload aborted rate limiter suppresses duplicate sends', async () => {
        axiosReq.mockClear();
        // Configure aborted webhook
        configStore.set('Butler.webhookNotification.reloadTaskAborted.rateLimit', 1);
        configStore.set('Butler.webhookNotification.reloadTaskAborted', { enabled: true });
        configStore.set('Butler.webhookNotification.reloadTaskAborted.webhooks', [
            { description: 'Aborted GET', httpMethod: 'GET', webhookURL: 'https://example.com/aborted-get' },
        ]);
        const req = {
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-abort',
            appName: 'a',
            appId: 'aid-abort',
            logTimeStamp: 'ts',
            logLevel: 'WARN',
            executionId: 'e',
            logMessage: 'aborted',
        };
        sendReloadTaskAbortedNotificationWebhook(req);
        sendReloadTaskAbortedNotificationWebhook(req);
        const sent = await waitUntil(() => axiosReq.mock.calls.length >= 1, { timeout: 1200 });
        expect(sent).toBe(true);
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT RELOAD TASK ABORTED: Rate limiting failed.'));
    });

    test('reload failure webhook logs fallback when error has no message/stack', async () => {
        axiosReq.mockClear();
        axiosReq.mockRejectedValueOnce({ foo: 'bar' });
        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-fallback',
            appName: 'a',
            appId: 'aid-fallback',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'e',
            logMessage: 'm',
        });
        await new Promise((r) => setTimeout(r, 60));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Webhook call failed:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('foo'));
    });

    test('service monitor webhook logs fallback when error has no message/stack', async () => {
        axiosReq.mockClear();
        axiosReq.mockRejectedValueOnce({ foo: 'bar' });
        const svc = {
            host: 'H-FB',
            serviceName: 'svc-fb',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'SvcFB', startType: 'Automatic' },
            prevState: 'STOPPED',
            currState: 'RUNNING',
            stateChanged: true,
        };
        sendServiceMonitorWebhook(svc);
        await new Promise((r) => setTimeout(r, 60));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SERVICE MONITOR WEBHOOKOUT 1:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('foo'));
    });

    test('license monitor webhook logs fallback when error has no message/stack', async () => {
        axiosReq.mockClear();
        await new Promise((r) => setTimeout(r, 1300));
        configStore.set('Butler.webhookNotification.qlikSenseServerLicenseMonitor.webhooks', [
            { description: 'LM POST', httpMethod: 'POST', webhookURL: 'https://example.com/lm-post' },
        ]);
        axiosReq.mockRejectedValueOnce({ foo: 'bar' });
        await callQlikSenseServerLicenseWebhook({
            event: 'server license status',
            licenseExpired: false,
            expiryDateStr: '2099-09-09',
            daysUntilExpiry: 200,
        });
        await new Promise((r) => setTimeout(r, 60));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT QLIK SENSE SERVER LICENSE MONITOR 1:'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('foo'));
    });

    test('reload failure invalid URL logs invalid config and outer message', async () => {
        axiosReq.mockClear();
        configStore.set('Butler.webhookNotification.reloadTaskFailure.webhooks', [
            { description: 'Bad URL', httpMethod: 'GET', webhookURL: '::::' },
        ]);
        sendReloadTaskFailureNotificationWebhook({
            hostName: 'h',
            user: 'u',
            taskName: 't',
            taskId: 'id-badurl',
            appName: 'a',
            appId: 'aid-badurl',
            logTimeStamp: 'ts',
            logLevel: 'ERROR',
            executionId: 'e',
            logMessage: 'm',
        });
        await new Promise((r) => setTimeout(r, 60));
        expect(axiosReq).not.toHaveBeenCalled();
        // Inner invalid config log
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid outgoing webhook config'));
        // Outer catch message log
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT 1 message:'));
        // Outer catch stack log
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('WEBHOOKOUT 1 stack:'));
    });
});
