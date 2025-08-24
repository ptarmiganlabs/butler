/* eslint-disable prettier/prettier */
/**
 * Tests for Qlik Sense Cloud Slack notifications (reload failure)
 */

import { jest } from '@jest/globals';

// Helper to build a configurable globals mock
function makeGlobalsMock(overrides = {}) {
    const store = new Map(Object.entries(overrides));
    const has = (k) => store.has(k);
    const get = (k) => store.get(k);
    const set = (k, v) => store.set(k, v);
    const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        verbose: jest.fn(),
        debug: jest.fn(),
    };
    return { config: { has, get, set }, logger };
}

// Async wait helper
async function waitUntil(predicate, { timeout = 1500, interval = 25 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (predicate()) return true;
        await new Promise((r) => setTimeout(r, interval));
    }
    return false;
}

// Common reload params fixture
const baseReloadParams = {
    tenantId: 't1',
    tenantComment: 'TenantOne',
    tenantUrl: 'https://tenant.example',
    userId: 'user-1',
    ownerId: 'owner-1',
    appId: 'app-1',
    appName: 'Sales App',
    appUrl: 'https://apps.example/app-1',
    appInfo: {
        attributes: {
            description: 'desc',
            hasSectionAccess: false,
            published: true,
            publishTime: 'now',
            thumbnail: 'thumb.png',
        },
    },
    reloadTrigger: 'manual',
    source: 'mqtt',
    eventType: 'reload',
    eventTypeVersion: '1',
    endedWithMemoryConstraint: false,
    isDirectQueryMode: false,
    isPartialReload: false,
    isSessionApp: false,
    isSkipStore: false,
    peakMemoryBytes: 123,
    reloadId: 'rid-1',
    rowLimit: 100,
    statements: 10,
    duration: 42,
    sizeMemory: 456,
    appItems: { resourceSize: { appFile: 789 } },
    reloadInfo: {
        errorCode: 'E1',
        errorMessage: 'Boom',
        log: 'line1\nline2\t',
        executionDuration: 12,
        executionStartTime: 's',
        executionStopTime: 'e',
        status: 'Failed',
    },
    // scriptLog can be false or an object with scriptLogFull
    scriptLog: false,
};

describe('qscloud slack notification - reload failures', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    test('basic message type sends Slack with blocks', async () => {
        const globalsMock = makeGlobalsMock({
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable': true,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType': 'basic',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicMsgTemplate':
                'Reload failed: {{appName}}',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.webhookURL': 'https://slack.example/webhook',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.headScriptLogLines': 5,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.tailScriptLogLines': 5,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.fromUser': 'from',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.iconEmoji': ':boom:',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.rateLimit': 1,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.channel': '#ops',
            Butler: undefined,
            'Butler.genericUrls': [],
        });

        // ESM pre-mocks
        await jest.unstable_mockModule('../../../globals.js', () => ({
            default: globalsMock,
        }));

        const slackSend = jest.fn().mockResolvedValue({ status: 200, statusText: 'OK', data: 'ok' });
        await jest.unstable_mockModule('../../slack_api.js', () => ({
            default: slackSend,
        }));

        await jest.unstable_mockModule('../api/user.js', () => ({
            getQlikSenseCloudUserInfo: jest.fn().mockResolvedValue({ name: 'Owner X', id: 'o1', email: 'o@e', picture: 'p' }),
        }));
        await jest.unstable_mockModule('../util.js', () => ({
            getQlikSenseCloudUrls: jest.fn().mockReturnValue({ qmcUrl: 'QMC', hubUrl: 'HUB' }),
        }));
        // Rate limiter: always allow
        const consume = jest.fn().mockResolvedValue({ remainingPoints: 1 });
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: class {
                constructor() {
                    this.consume = consume;
                }
            },
        }));

        const mod = await import('../slack_notification_qscloud.js');
        const { sendQlikSenseCloudAppReloadFailureNotificationSlack } = mod;

        sendQlikSenseCloudAppReloadFailureNotificationSlack({ ...baseReloadParams, scriptLog: { scriptLogFull: [] } });
        // Wait for rate-limiter info to confirm chain progressed
        const progressed = await waitUntil(() =>
            globalsMock.logger.info.mock.calls.some((c) => String(c[0]).includes('Rate limiting check passed')),
        );
        expect(progressed).toBe(true);
        expect(globalsMock.logger.error).not.toHaveBeenCalled();
    });

    test('formatted message type uses template and escapes backslashes in script logs', async () => {
        const globalsMock = makeGlobalsMock({
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable': true,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType': 'formatted',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.templateFile': '/tmp/tpl.hbs',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.webhookURL': 'https://slack.example/webhook',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.headScriptLogLines': 5,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.tailScriptLogLines': 5,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.rateLimit': 1,
            'Butler.genericUrls': [],
        });

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

        const slackSend = jest.fn().mockResolvedValue({ status: 200, statusText: 'OK', data: 'ok' });
        await jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSend }));

        await jest.unstable_mockModule('../api/user.js', () => ({
            getQlikSenseCloudUserInfo: jest.fn().mockResolvedValue({ name: 'Owner X', id: 'o1', email: 'o@e', picture: 'p' }),
        }));
        await jest.unstable_mockModule('../util.js', () => ({
            getQlikSenseCloudUrls: jest.fn().mockReturnValue({ qmcUrl: 'QMC', hubUrl: 'HUB' }),
        }));
        await jest.unstable_mockModule('../api/appreloadinfo.js', () => ({
            getQlikSenseCloudAppReloadScriptLogHead: jest.fn().mockReturnValue('C:\\\n\\path'),
            getQlikSenseCloudAppReloadScriptLogTail: jest.fn().mockReturnValue('D:\\folder'),
        }));

        // fs mocks: template exists and returns handlebars template
        await jest.unstable_mockModule('fs', () => ({
            default: {
                existsSync: jest.fn().mockReturnValue(true),
                readFileSync: jest.fn().mockReturnValue('Rendered {{appName}} {{scriptLogHead}} {{scriptLogTail}}'),
            },
        }));

        // Rate limiter allow
        const consume = jest.fn().mockResolvedValue({ remainingPoints: 1 });
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: class {
                constructor() {
                    this.consume = consume;
                }
            },
        }));

        const mod = await import('../slack_notification_qscloud.js');
        const { sendQlikSenseCloudAppReloadFailureNotificationSlack } = mod;

        const params = { ...baseReloadParams, scriptLog: { scriptLogFull: ['x'] } };
        sendQlikSenseCloudAppReloadFailureNotificationSlack(params);
        await waitUntil(() => slackSend.mock.calls.length > 0);
        expect(slackSend).toHaveBeenCalledTimes(1);
        const sent = slackSend.mock.calls[0][0];
        expect(typeof sent.text).toBe('string');
        // Expect escaped single backslashes -> double backslashes
        expect(sent.text).toMatch(/C:\\\\/); // C:\\ in string
        expect(sent.text).toMatch(/D:\\\\folder/);
    });

    test('disabled in config -> no Slack call and error logged', async () => {
        const globalsMock = makeGlobalsMock({
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable': false,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType': 'basic',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicMsgTemplate': 'X',
        });

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));
        const slackSend = jest.fn();
        await jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSend }));
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: class {
                constructor() {
                    this.consume = () => Promise.resolve({});
                }
            },
        }));

        const mod = await import('../slack_notification_qscloud.js');
        const { sendQlikSenseCloudAppReloadFailureNotificationSlack } = mod;

        await sendQlikSenseCloudAppReloadFailureNotificationSlack({ ...baseReloadParams });
        expect(slackSend).not.toHaveBeenCalled();
        expect(globalsMock.logger.error).toHaveBeenCalledWith(
            '[QSCLOUD] SLACK ALERT - APP RELOAD FAILED: Reload failure Slack notifications are disabled in config file - will not send Slack message',
        );
    });

    test('invalid messageType -> no Slack call and error logged', async () => {
        const globalsMock = makeGlobalsMock({
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable': true,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType': 'weird',
        });

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));
        const slackSend = jest.fn();
        await jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSend }));
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: class {
                constructor() {
                    this.consume = () => Promise.resolve({});
                }
            },
        }));

        const mod = await import('../slack_notification_qscloud.js');
        const { sendQlikSenseCloudAppReloadFailureNotificationSlack } = mod;
        await sendQlikSenseCloudAppReloadFailureNotificationSlack({ ...baseReloadParams });
        expect(slackSend).not.toHaveBeenCalled();
        expect(globalsMock.logger.error).toHaveBeenCalledWith(
            expect.stringContaining('[QSCLOUD] SLACK ALERT - APP RELOAD FAILED: Invalid Slack message type:'),
        );
    });

    test('formatted but missing template file -> error logged, no Slack call', async () => {
        const globalsMock = makeGlobalsMock({
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable': true,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType': 'formatted',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.templateFile': '/tmp/missing.hbs',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.webhookURL': 'https://slack.example/w',
        });

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));
        const slackSend = jest.fn();
        await jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSend }));
        await jest.unstable_mockModule('fs', () => ({
            default: { existsSync: jest.fn().mockReturnValue(false), readFileSync: jest.fn() },
        }));
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: class {
                constructor() {
                    this.consume = () => Promise.resolve({});
                }
            },
        }));

        const mod = await import('../slack_notification_qscloud.js');
        const { sendQlikSenseCloudAppReloadFailureNotificationSlack } = mod;
        sendQlikSenseCloudAppReloadFailureNotificationSlack({ ...baseReloadParams, scriptLog: { scriptLogFull: ['x'] } });
        await waitUntil(() => globalsMock.logger.error.mock.calls.some((c) => String(c[0]).includes('Could not open Slack template file')));
        expect(slackSend).not.toHaveBeenCalled();
        expect(globalsMock.logger.error).toHaveBeenCalledWith(
            expect.stringContaining('[QSCLOUD] SLACK SEND: Could not open Slack template file'),
        );
    });

    test('rate limit rejection -> warns and does not send Slack', async () => {
        const globalsMock = makeGlobalsMock({
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable': true,
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.messageType': 'basic',
            'Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicMsgTemplate':
                'Reload failed: {{appName}}',
        });

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));
        const slackSend = jest.fn();
        await jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSend }));
        // Rate limiter: reject
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: class {
                constructor() {
                    this.consume = () => Promise.reject({});
                }
            },
        }));

        const mod = await import('../slack_notification_qscloud.js');
        const { sendQlikSenseCloudAppReloadFailureNotificationSlack } = mod;
        sendQlikSenseCloudAppReloadFailureNotificationSlack({ ...baseReloadParams });
        await waitUntil(() => globalsMock.logger.warn.mock.calls.length > 0);
        expect(slackSend).not.toHaveBeenCalled();
        expect(globalsMock.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('[QSCLOUD] SLACK ALERT - APP RELOAD FAILED: Rate limiting failed.'),
        );
    });
});
