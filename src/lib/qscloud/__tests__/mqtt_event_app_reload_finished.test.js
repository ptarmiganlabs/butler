/* eslint-disable prettier/prettier */
import { jest } from '@jest/globals';
import { toCloudEventsFormat } from './qscloud_events.js';

// Mocks for API helpers
const getQlikSenseCloudAppReloadScriptLog = jest.fn().mockResolvedValue({ scriptLogFull: ['a', 'b'] });
const getQlikSenseCloudAppReloadInfo = jest.fn().mockResolvedValue({ type: 'scheduled', appId: 'aid', reloadId: 'rid' });
jest.unstable_mockModule('../api/appreloadinfo.js', () => ({
    getQlikSenseCloudAppReloadScriptLog,
    getQlikSenseCloudAppReloadInfo,
}));

const getQlikSenseCloudAppInfo = jest.fn().mockResolvedValue({ id: 'aid', name: 'App' });
const getQlikSenseCloudAppMetadata = jest.fn().mockResolvedValue({ foo: 'bar' });
const getQlikSenseCloudAppItems = jest.fn().mockResolvedValue({ data: [{ resourceId: 'aid' }] });
jest.unstable_mockModule('../api/app.js', () => ({
    getQlikSenseCloudAppInfo,
    getQlikSenseCloudAppMetadata,
    getQlikSenseCloudAppItems,
}));

const appOwner = { id: 'owner', name: 'App Owner', email: 'owner@example.com' };
// The user who triggered the reload
const reloadUser = { id: 'user-1', name: 'Reload User', email: 'user@example.com' };
// Reading any other user fails, which getQlikSenseCloudUserInfo() reports by returning false
const users = { owner: appOwner, 'user-1': reloadUser };
const getQlikSenseCloudUserInfo = jest.fn(async (userId) => users[userId] || false);
jest.unstable_mockModule('../api/user.js', () => ({ getQlikSenseCloudUserInfo }));

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
        // Like node-config, get() throws for a key the config file doesn't have
        get: (k) => {
            if (!cfg.has(k)) {
                throw new Error(`Configuration property "${k}" is not defined`);
            }
            return cfg.get(k);
        },
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

// The same event in the CloudEvents format, the only format Qlik Sense Cloud sends from 10 December 2026
const cloudEventsMsg = toCloudEventsFormat(baseMsg);

// Until then, Qlik Sense Cloud sends the attributes of both formats in each event
const bothFormatsMsg = { ...baseMsg, ...cloudEventsMsg };

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

    test('skips an event without a tenant ID, and says that is why', async () => {
        const res = await handleQlikSenseCloudAppReloadFinished({ ...cloudEventsMsg, tenantid: undefined });

        expect(res).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            '[QSCLOUD] Incoming MQTT event from Qlik Sense Cloud has no tenant ID. Skipping event. App ID="aid"',
        );
        expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('is not defined in the Butler configuration file'));
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).not.toHaveBeenCalled();
        }
    });

    test.each([
        ['of another type', { ...cloudEventsMsg, type: 'com.qlik.v1.app.opened' }, 'com.qlik.v1.app.opened'],
        [
            'in a format Butler does not read',
            { specversion: '2.0', kind: 'com.qlik.v1.app.reload.finished', data: baseMsg.data },
            'undefined',
        ],
    ])('skips an event %s, with a warning', async (_, msg, eventType) => {
        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            `[QSCLOUD] Incoming MQTT event from Qlik Sense Cloud is not an app reload finished event. Skipping event. Event type="${eventType}"`,
        );
        expect(getQlikSenseCloudAppReloadScriptLog).not.toHaveBeenCalled();
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).not.toHaveBeenCalled();
        }
    });

    test('sends notifications when enabled', async () => {
        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);
        expect(res).toBe(true);
        expect(sendTeams).toHaveBeenCalledTimes(1);
        expect(sendSlack).toHaveBeenCalledTimes(1);
        expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    test('still sends notifications when the config file has no Butler.scriptLog section', async () => {
        cfg.delete('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable');

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(logger.error).not.toHaveBeenCalled();
        expect(writeFileSync).not.toHaveBeenCalled();
        expect(sendTeams).toHaveBeenCalledTimes(1);
        expect(sendSlack).toHaveBeenCalledTimes(1);
        expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    test('stores the script log on disk when enabled', async () => {
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', true);
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory', '/logs/qscloud');

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('2024-10-14'), { recursive: true });
        expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('appId=aid_reloadId=rid.log'), 'a\nb');
    });

    test('still sends every alert when the script log directory cannot be created', async () => {
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', true);
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory', '/logs/qscloud');
        mkdirSync.mockImplementationOnce(() => {
            throw new Error("EACCES: permission denied, mkdir '/logs/qscloud/2024-10-14'");
        });

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(writeFileSync).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not store script log to disk file'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('EACCES: permission denied'));
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledTimes(1);
        }
    });

    test('stores nothing on disk, and logs no error, when the script log could not be read', async () => {
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', true);
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory', '/logs/qscloud');
        // getQlikSenseCloudAppReloadScriptLog() returns false when it fails
        getQlikSenseCloudAppReloadScriptLog.mockResolvedValueOnce(false);

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(mkdirSync).not.toHaveBeenCalled();
        expect(writeFileSync).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Not storing the script log to disk file'));
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledTimes(1);
        }
    });

    test('stores the script log under the time Butler got the event, when the event has no time', async () => {
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', true);
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory', '/logs/qscloud');
        // Only the clock is faked, so the reads still resolve
        jest.useFakeTimers({ now: new Date('2026-11-06T13:57:27.123Z'), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });

        try {
            // The CloudEvents format doesn't require an event time
            const res = await handleQlikSenseCloudAppReloadFinished({ ...cloudEventsMsg, time: undefined });

            expect(res).toBe(true);
            expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('2026-11-06'), { recursive: true });
            expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('2026-11-06T13-57-27_appId=aid_reloadId=rid.log'), 'a\nb');
            for (const sender of [sendTeams, sendSlack, sendEmail]) {
                expect(sender).toHaveBeenCalledTimes(1);
            }
        } finally {
            jest.useRealTimers();
        }
    });

    test('still sends every alert when the config file has no script log directory', async () => {
        // Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory is missing, so config.get() throws for it
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', true);

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(writeFileSync).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not store script log to disk file'));
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledTimes(1);
        }
    });

    test.each([
        ['Teams', 'teamsNotification', sendTeams, [sendSlack, sendEmail]],
        ['Slack', 'slackNotification', sendSlack, [sendTeams, sendEmail]],
    ])('basicContentOnly for %s leaves the script log out of that alert only', async (_, channel, basicSender, otherSenders) => {
        cfg.set(`Butler.qlikSenseCloud.event.mqtt.tenant.alert.${channel}.reloadAppFailure.basicContentOnly`, true);

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(basicSender).toHaveBeenCalledWith(expect.objectContaining({ scriptLog: {} }));
        for (const sender of otherSenders) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ scriptLog: { scriptLogFull: ['a', 'b'] } }));
        }
    });

    test('basicContentOnly still sends every alert when the reload info could not be read', async () => {
        cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicContentOnly', true);
        getQlikSenseCloudAppReloadInfo.mockResolvedValueOnce(false);

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(sendTeams).toHaveBeenCalledWith(expect.objectContaining({ reloadInfo: { appId: 'aid', reloadId: 'rid' } }));
        expect(sendSlack).toHaveBeenCalledWith(expect.objectContaining({ reloadInfo: false }));
        expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    test.each([
        ['match the app', { data: [{ resourceId: 'aid' }] }, { resourceId: 'aid' }],
        ['could not be read', false, undefined],
        ['do not match the app', { data: [{ resourceId: 'other-app' }] }, undefined],
    ])('sends every alert when the app items %s', async (_, appItems, sentAppItem) => {
        getQlikSenseCloudAppItems.mockResolvedValueOnce(appItems);

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appItems: sentAppItem }));
        }
    });

    test('starts every Qlik Sense Cloud API read before waiting for any of them', async () => {
        const reads = [
            getQlikSenseCloudAppReloadScriptLog,
            getQlikSenseCloudAppReloadInfo,
            getQlikSenseCloudAppInfo,
            getQlikSenseCloudAppItems,
            // Once for the app owner, and once for the user who triggered the reload
            getQlikSenseCloudUserInfo,
            getQlikSenseCloudUserInfo,
        ];
        // Count the reads under way at the same time. Each one fails after a moment, as during an API outage.
        let readsUnderWay = 0;
        let mostReadsUnderWay = 0;
        for (const read of reads) {
            read.mockImplementationOnce(async () => {
                readsUnderWay += 1;
                mostReadsUnderWay = Math.max(mostReadsUnderWay, readsUnderWay);
                await new Promise((resolve) => setImmediate(resolve));
                readsUnderWay -= 1;
                return false;
            });
        }

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(mostReadsUnderWay).toBe(reads.length);
    });

    test('reads the app owner and the user who triggered the reload once each, and passes them on to every alert', async () => {
        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledTimes(2);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner');
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('user-1');
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appOwner, reloadUser }));
        }
    });

    test('reads the app owner only once when they triggered the reload', async () => {
        const msg = { ...baseMsg, extensions: { ...baseMsg.extensions, userId: 'owner' } };

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledTimes(1);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner');
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appOwner, reloadUser: appOwner }));
        }
    });

    test('reads no user but the app owner when the event has no user ID', async () => {
        const msg = { ...baseMsg, extensions: { topLevelResourceId: 'aid', ownerId: 'owner', tenantId: 'tenant-1' } };

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledTimes(1);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner');
        expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Could not get the user who triggered the app reload'));
        // The template fields then show the user as unknown
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appOwner, reloadUser: false }));
        }
    });

    test('reads no user but the app owner when a service account triggered the reload', async () => {
        // The CloudEvents attributes say what type of principal triggered the event
        const msg = { ...bothFormatsMsg, authtype: 'service_account' };

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledTimes(1);
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner');
        expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Could not get the user who triggered the app reload'));
        expect(logger.verbose).toHaveBeenCalledWith(
            '[QSCLOUD] No user who triggered the app reload to get, as a service account triggered it. App ID="aid"',
        );
        // The template fields then show the user as unknown
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appOwner, reloadUser: false }));
        }
    });

    test('sends every alert when the user who triggered the reload could not be read', async () => {
        // A user the users API doesn't know
        const msg = { ...baseMsg, extensions: { ...baseMsg.extensions, userId: 'deleted-user' } };

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(
            '[QSCLOUD] Could not get the user who triggered the app reload. App ID="aid", user ID="deleted-user"',
        );
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appOwner, reloadUser: false }));
        }
    });

    test('sends every alert when reading the user who triggered the reload throws', async () => {
        // The app owner is read first, and then the user who triggered the reload
        getQlikSenseCloudUserInfo.mockResolvedValueOnce(appOwner).mockRejectedValueOnce(new Error('socket hang up'));

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('[QSCLOUD] Could not get the user who triggered the app reload. Error=socket hang up');
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ appOwner, reloadUser: false }));
        }
    });

    test('does not read the app owner or the user who triggered the reload when no alert channel is enabled', async () => {
        for (const channel of ['teamsNotification', 'slackNotification', 'emailNotification']) {
            cfg.set(`Butler.qlikSenseCloud.event.mqtt.tenant.alert.${channel}.reloadAppFailure.enable`, false);
        }

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudUserInfo).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Could not get app owner'));
        expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Could not get the user who triggered the app reload'));
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).not.toHaveBeenCalled();
        }
    });

    test.each(['teamsNotification', 'slackNotification', 'emailNotification'])(
        'reads the app owner and the user who triggered the reload when only the %s alert is enabled',
        async (enabledChannel) => {
            for (const channel of ['teamsNotification', 'slackNotification', 'emailNotification']) {
                cfg.set(`Butler.qlikSenseCloud.event.mqtt.tenant.alert.${channel}.reloadAppFailure.enable`, channel === enabledChannel);
            }

            const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

            expect(res).toBe(true);
            expect(getQlikSenseCloudUserInfo).toHaveBeenCalledTimes(2);
            expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner');
            expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('user-1');
        },
    );

    test('does not read the app metadata, which no alert uses', async () => {
        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudAppMetadata).not.toHaveBeenCalled();
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender.mock.calls[0][0]).not.toHaveProperty('appMetadata');
        }
    });

    test.each([
        ['app reload script log', getQlikSenseCloudAppReloadScriptLog, 'scriptLog'],
        ['app reload info', getQlikSenseCloudAppReloadInfo, 'reloadInfo'],
        ['app info', getQlikSenseCloudAppInfo, 'appInfo'],
        ['app owner', getQlikSenseCloudUserInfo, 'appOwner'],
    ])('sends every alert when reading the %s throws', async (description, read, field) => {
        read.mockRejectedValueOnce(new Error('socket hang up'));

        const res = await handleQlikSenseCloudAppReloadFinished(baseMsg);

        expect(res).toBe(true);
        expect(logger.error).toHaveBeenCalledWith(`[QSCLOUD] Could not get ${description}. Error=socket hang up`);
        // A read that throws is treated as one that failed
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(expect.objectContaining({ [field]: false }));
        }
    });

    test.each([
        ['app reload script log', getQlikSenseCloudAppReloadScriptLog, baseMsg, 'App ID="aid", reload ID="rid"'],
        ['app reload info', getQlikSenseCloudAppReloadInfo, baseMsg, 'App ID="aid", reload ID="rid"'],
        ['app info', getQlikSenseCloudAppInfo, baseMsg, 'App ID="aid"'],
        ['app items', getQlikSenseCloudAppItems, baseMsg, 'App ID="aid"'],
        // The users API doesn't know this owner, so that read returns false without a mock change
        [
            'app owner',
            undefined,
            { ...baseMsg, extensions: { ...baseMsg.extensions, ownerId: 'deleted-owner' } },
            'App ID="aid", owner ID="deleted-owner"',
        ],
    ])('warns that the %s could not be obtained, with its IDs', async (description, read, msg, ids) => {
        // The API functions return false when a read fails
        read?.mockResolvedValueOnce(false);

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(logger.warn).toHaveBeenCalledWith(`[QSCLOUD] Could not get ${description}. ${ids}`);
    });
});

describe.each([
    ['the legacy format', baseMsg, '1'],
    ['the CloudEvents format', cloudEventsMsg, undefined],
    ['both formats', bothFormatsMsg, '1'],
])('qscloud mqtt handler, for an app reload failure event in %s', (_, msg, eventTypeVersion) => {
    test('sends every alert, with the IDs from the event', async () => {
        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(getQlikSenseCloudAppReloadScriptLog).toHaveBeenCalledWith('aid', 'rid');
        expect(getQlikSenseCloudAppInfo).toHaveBeenCalledWith('aid');
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner');
        expect(getQlikSenseCloudUserInfo).toHaveBeenCalledWith('user-1');
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'tenant-1',
                    userId: 'user-1',
                    ownerId: 'owner',
                    appId: 'aid',
                    appUrl: 'https://tenant.example.com/sense/app/aid',
                    source: 'qscloud',
                    eventType: 'com.qlik.v1.app.reload.finished',
                    eventTypeVersion,
                }),
            );
        }
    });

    test('names the stored script log after the event time', async () => {
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable', true);
        cfg.set('Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.logDirectory', '/logs/qscloud');

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(true);
        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('2024-10-14'), { recursive: true });
        expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('2024-10-14T11-31-39_appId=aid_reloadId=rid.log'), 'a\nb');
    });

    test('skips the event when its tenant is not monitored', async () => {
        cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.id', 'other-tenant');

        const res = await handleQlikSenseCloudAppReloadFinished(msg);

        expect(res).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('tenant ID "tenant-1" is not defined in the Butler configuration file'),
        );
        for (const sender of [sendTeams, sendSlack, sendEmail]) {
            expect(sender).not.toHaveBeenCalled();
        }
    });
});
