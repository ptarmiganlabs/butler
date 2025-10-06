/* eslint-disable prettier/prettier */
import { jest } from '@jest/globals';

// Mocks for API helpers
jest.unstable_mockModule('../api/appreloadinfo.js', () => ({
    getQlikSenseCloudAppReloadScriptLog: jest.fn().mockResolvedValue({ scriptLogFull: ['a', 'b'] }),
    getQlikSenseCloudAppReloadInfo: jest.fn().mockResolvedValue({ type: 'scheduled', appId: 'aid', reloadId: 'rid' }),
}));

jest.unstable_mockModule('../api/app.js', () => ({
    getQlikSenseCloudAppInfo: jest.fn().mockResolvedValue({ id: 'aid', name: 'App' }),
    getQlikSenseCloudAppMetadata: jest.fn().mockResolvedValue({ foo: 'bar' }),
    getQlikSenseCloudAppItems: jest.fn().mockResolvedValue({ data: [{ resourceId: 'aid' }] }),
}));

// Notification mocks
const sendTeams = jest.fn();
const sendSlack = jest.fn();
const sendEmail = jest.fn();
jest.unstable_mockModule('../msteams_notification_qscloud.js', () => ({
    sendQlikSenseCloudAppReloadFailureNotificationTeams: sendTeams,
}));
jest.unstable_mockModule('../slack_notification_qscloud.js', () => ({
    sendQlikSenseCloudAppReloadFailureNotificationSlack: sendSlack,
}));
jest.unstable_mockModule('../email_notification_qscloud.js', () => ({
    sendQlikSenseCloudAppReloadFailureNotificationEmail: sendEmail,
}));

// FS mock for optional log writes
const mkdirSync = jest.fn();
const writeFileSync = jest.fn();
jest.unstable_mockModule('fs', () => ({ default: { mkdirSync, writeFileSync } }));

// Globals mock
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() };
const cfg = new Map();
const globalsMock = {
    logger,
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    config: {
        has: (k) => cfg.has(k),
        get: (k) => cfg.get(k),
    },
};
jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

let handleQlikSenseCloudAppReloadFinished;

beforeAll(async () => {
    const mod = await import('../mqtt_event_app_reload_finished.js');
    ({ handleQlikSenseCloudAppReloadFinished } = mod);
});

beforeEach(() => {
    jest.clearAllMocks();
    cfg.clear();
    // basic config
    cfg.set('Butler.qlikSenseCloud.enable', true);
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.id', 'tenant-1');
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.comment', 'Prod tenant');
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl', 'https://tenant.example.com');
    cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', false);
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable', true);
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicContentOnly', false);
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.enable', true);
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.alert.slackNotification.reloadAppFailure.basicContentOnly', false);
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable', true);
});

const baseMsg = {
    eventType: 'com.qlik.v1.app.reload.finished',
    extensions: {
        topLevelResourceId: 'aid',
        ownerId: 'owner',
        tenantId: 'tenant-1',
        userId: 'user-1',
    },
    data: {
        status: 'error',
        name: 'App',
        reloadId: 'rid',
        size: { memory: 10 },
        duration: 1,
        endedWithMemoryConstraint: false,
        errors: [],
        isDirectQueryMode: false,
        isPartialReload: false,
        isSessionApp: false,
        isSkipStore: false,
        peakMemoryBytes: 10,
        rowLimit: 0,
        statements: 0,
        usage: {},
        warnings: [],
    },
    source: 'qscloud',
    eventTime: '2024-10-14T11:31:39Z',
    eventTypeVersion: '1',
};

describe('qscloud mqtt handler', () => {
    test('ignores events from unmonitored tenants', async () => {
        const msg = JSON.parse(JSON.stringify(baseMsg));
        msg.extensions.tenantId = 'other-tenant';
        const res = await handleQlikSenseCloudAppReloadFinished(msg);
        expect(res).toBe(false);
        expect(sendTeams).not.toHaveBeenCalled();
        expect(sendSlack).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
    });

    test('sends notifications when enabled', async () => {
        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);
        expect(res).toBe(true);
        expect(sendTeams).toHaveBeenCalledTimes(1);
        expect(sendSlack).toHaveBeenCalledTimes(1);
        expect(sendEmail).toHaveBeenCalledTimes(1);
    });
});
