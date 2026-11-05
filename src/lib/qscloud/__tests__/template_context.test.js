import { jest } from '@jest/globals';

// The email, Teams and Slack senders all give their templates the fields prepared here, so this is the list of
// template fields a Qlik Sense Cloud app reload alert has, and what they hold when an API read behind them failed.

// Minimal globals with config
const cfg = new Map();
jest.unstable_mockModule('../../../globals.js', () => ({
    default: {
        config: {
            has: (k) => cfg.has(k),
            get: (k) => cfg.get(k),
        },
    },
}));

jest.unstable_mockModule('../util.js', () => ({
    getQlikSenseCloudUrls: jest
        .fn()
        .mockReturnValue({ qmcUrl: 'https://tenant.example.com/console', hubUrl: 'https://tenant.example.com/hub' }),
}));

let prepareQlikSenseCloudAppReloadTemplateContext;
let escapeLineBreaksAndTabsForJson;

beforeAll(async () => {
    ({ prepareQlikSenseCloudAppReloadTemplateContext, escapeLineBreaksAndTabsForJson } = await import('../template_context.js'));
});

const genericUrls = [{ id: 'docs', linkText: 'Docs', comment: 'Butler documentation', url: 'https://example.com/docs' }];

beforeEach(() => {
    cfg.clear();
    cfg.set('Butler.genericUrls', genericUrls);
});

// What the app reload handler passes on for a failed app reload
const reloadParams = {
    tenantId: 'tenant-1',
    tenantComment: 'Production tenant',
    tenantUrl: 'https://tenant.example.com',
    userId: 'user-1',
    ownerId: 'owner-1',
    appId: 'app-1',
    appName: 'Sales forecast',
    appUrl: 'https://tenant.example.com/sense/app/app-1',
    reloadTrigger: 'chronos',
    source: 'com.qlik/engine',
    eventType: 'com.qlik.v1.app.reload.finished',
    eventTypeVersion: '1.0.0',
    duration: '12s',
    endedWithMemoryConstraint: false,
    errors: [],
    isDirectQueryMode: false,
    isPartialReload: true,
    isSessionApp: false,
    isSkipStore: false,
    peakMemoryBytes: 1048576,
    reloadId: 'reload-1',
    rowLimit: 1000,
    statements: [],
    status: 'error',
    usage: {},
    warnings: [],
    sizeMemory: 2097152,
    scriptLog: { scriptLogFull: ['Starting reload', 'Error: table not found'], scriptLogSize: 2 },
    reloadInfo: {
        type: 'chronos',
        errorCode: 'EngineReloadScriptError',
        errorMessage: 'error in app script or datasource',
        log: 'Started loading data\r\nUnknown statement:\tThisFailsForSure',
        status: 'FAILED',
        executionDuration: { hours: 0, minutes: 0, seconds: 12 },
        executionStartTime: { startTimeLocal1: '2026-11-03 10:00:00' },
        executionStopTime: { stopTimeLocal1: '2026-11-03 10:00:12' },
    },
    appInfo: {
        attributes: {
            description: 'Forecasts',
            hasSectionAccess: true,
            published: true,
            publishTime: '2026-10-01T08:00:00Z',
            thumbnail: '/api/v1/apps/app-1/media/thumbnail.png',
        },
    },
    appItems: { resourceSize: { appFile: 4096 }, meta: { tags: [] } },
    appOwner: { id: 'owner-1', name: 'Ada Owner', email: 'ada@example.com', picture: 'https://example.com/ada.png' },
};

// What prepareQlikSenseCloudScriptLogForNotification() gives for that reload's script log
const scriptLogData = {
    scriptLogAvailable: true,
    scriptLogSizeRows: 2,
    scriptLogSizeCharacters: 37,
    scriptLogHeadCount: 1,
    scriptLogTailCount: 1,
    scriptLogHead: 'Starting reload',
    scriptLogTail: 'Error: table not found',
};

describe('prepareQlikSenseCloudAppReloadTemplateContext', () => {
    test('gives every template field for a failed app reload', () => {
        expect(prepareQlikSenseCloudAppReloadTemplateContext(reloadParams, scriptLogData)).toEqual({
            tenantId: 'tenant-1',
            tenantComment: 'Production tenant',
            tenantUrl: 'https://tenant.example.com',

            userId: 'user-1',
            userName: 'Ada Owner',

            appId: 'app-1',
            appName: 'Sales forecast',
            appDescription: 'Forecasts',
            appUrl: 'https://tenant.example.com/sense/app/app-1',
            appHasSectionAccess: true,
            appIsPublished: true,
            appPublishTime: '2026-10-01T08:00:00Z',
            appThumbnail: '/api/v1/apps/app-1/media/thumbnail.png',

            reloadTrigger: 'chronos',
            source: 'com.qlik/engine',
            eventType: 'com.qlik.v1.app.reload.finished',
            eventTypeVersion: '1.0.0',
            endedWithMemoryConstraint: false,
            isDirectQueryMode: false,
            isPartialReload: true,
            isSessionApp: false,
            isSkipStore: false,

            peakMemoryBytes: (1048576).toLocaleString(),
            reloadId: 'reload-1',
            rowLimit: (1000).toLocaleString(),
            statements: [],
            status: 'error',
            usageDuration: '12s',
            sizeMemoryBytes: (2097152).toLocaleString(),
            appFileSize: (4096).toLocaleString(),

            errorCode: 'EngineReloadScriptError',
            errorMessage: 'error in app script or datasource',
            logMessage: 'Started loading data\r\nUnknown statement:\tThisFailsForSure',
            executionDuration: { hours: 0, minutes: 0, seconds: 12 },
            executionStartTime: { startTimeLocal1: '2026-11-03 10:00:00' },
            executionStopTime: { stopTimeLocal1: '2026-11-03 10:00:12' },
            executionStatusText: 'FAILED',
            scriptLogAvailable: true,
            scriptLogSize: '2',
            scriptLogSizeRows: '2',
            scriptLogSizeCharacters: '37',
            scriptLogHead: 'Starting reload',
            scriptLogTail: 'Error: table not found',
            scriptLogTailCount: 1,
            scriptLogHeadCount: 1,

            qlikSenseQMC: 'https://tenant.example.com/console',
            qlikSenseHub: 'https://tenant.example.com/hub',
            genericUrls,

            appOwnerName: 'Ada Owner',
            appOwnerUserId: 'owner-1',
            appOwnerPicture: 'https://example.com/ada.png',
            appOwnerEmail: 'ada@example.com',
        });
    });

    test('falls back to defaults for the info that could not be obtained', () => {
        // What the app reload handler passes on when the reload info, app info, app items and app owner reads fail
        const templateContext = prepareQlikSenseCloudAppReloadTemplateContext(
            { ...reloadParams, reloadInfo: false, appInfo: false, appItems: undefined, appOwner: false },
            scriptLogData,
        );

        expect(templateContext).toEqual(
            expect.objectContaining({
                userName: 'Unknown',
                appDescription: '',
                appHasSectionAccess: false,
                appIsPublished: false,
                appPublishTime: '',
                appThumbnail: '',
                appFileSize: '0',
                errorCode: undefined,
                errorMessage: undefined,
                logMessage: '',
                executionDuration: undefined,
                executionStartTime: undefined,
                executionStopTime: undefined,
                executionStatusText: undefined,
                appOwnerName: 'Unknown',
                appOwnerUserId: 'Unknown',
                appOwnerPicture: '',
                appOwnerEmail: 'Unknown',
            }),
        );
    });

    test('shows numbers missing from the app reload event as 0', () => {
        const templateContext = prepareQlikSenseCloudAppReloadTemplateContext(
            { ...reloadParams, peakMemoryBytes: undefined, rowLimit: undefined, sizeMemory: undefined },
            scriptLogData,
        );

        expect(templateContext).toEqual(expect.objectContaining({ peakMemoryBytes: '0', rowLimit: '0', sizeMemoryBytes: '0' }));
    });

    test('gives an empty list of generic URLs when the config file sets them to null', () => {
        // The config file schema allows null. A config file without the setting fails before this, in config.get()
        cfg.set('Butler.genericUrls', null);

        expect(prepareQlikSenseCloudAppReloadTemplateContext(reloadParams, scriptLogData).genericUrls).toEqual([]);
    });

    test('does not change the reload params it is given', () => {
        // The handler gives the email, Teams and Slack senders the same reload info
        const reloadParamsBefore = structuredClone(reloadParams);

        prepareQlikSenseCloudAppReloadTemplateContext(reloadParams, scriptLogData);

        expect(reloadParams).toEqual(reloadParamsBefore);
    });
});

describe('escapeLineBreaksAndTabsForJson', () => {
    test('removes carriage returns, and writes line feeds and tabs as escape sequences', () => {
        expect(escapeLineBreaksAndTabsForJson('Started loading data\r\nUnknown statement:\tThisFailsForSure')).toBe(
            'Started loading data\\nUnknown statement:\\tThisFailsForSure',
        );
    });
});
