import { jest } from '@jest/globals';

// Capture constructor args for assertions
const webhookCalls = [];
const sendMessageMock = jest.fn().mockResolvedValue({ status: 200, statusText: 'OK', data: 'ok' });

// Mock ms-teams-wrapper
jest.unstable_mockModule('ms-teams-wrapper', () => ({
    Webhook: jest.fn().mockImplementation((url, msg) => {
        webhookCalls.push({ url, msg });
        return { sendMessage: sendMessageMock };
    }),
    SimpleTextCard: jest.fn(),
}));

// Mock FS to avoid template file access when not needed
jest.unstable_mockModule('fs', () => ({ default: { existsSync: jest.fn(), readFileSync: jest.fn() } }));

// Mock helpers used by the module
jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
    default: jest.fn().mockResolvedValue({ userName: 'owner', directory: 'DIR', userId: 'uid', emails: ['owner@example.com'] }),
}));

jest.unstable_mockModule('../get_qs_urls.js', () => ({
    getQlikSenseUrls: jest.fn().mockReturnValue({
        appBaseUrl: 'https://sense/apps',
        qmcUrl: 'https://sense/qmc',
        hubUrl: 'https://sense/hub',
    }),
}));

// Minimal globals with config and logger
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
const cfg = new Map();
const globalsMock = {
    logger,
    config: {
        has: (k) => cfg.has(k),
        get: (k) => cfg.get(k),
    },
};
jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

let sendReloadTaskFailureNotificationTeams;
let sendServiceMonitorNotificationTeams;

beforeAll(async () => {
    const mod = await import('../msteams_notification.js');
    ({ sendReloadTaskFailureNotificationTeams, sendServiceMonitorNotificationTeams } = mod);
});

beforeEach(() => {
    jest.clearAllMocks();
    webhookCalls.length = 0;
    cfg.clear();

    // Enable Teams notifications (basic template)
    cfg.set('Butler.teamsNotification.reloadTaskFailure.enable', true);
    cfg.set('Butler.teamsNotification.reloadTaskFailure.messageType', 'basic');
    cfg.set('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate', 'Failed {{taskName}}');
    cfg.set('Butler.teamsNotification.reloadTaskFailure.webhookURL', 'https://teams.example.com/hook');

    // Service monitor
    cfg.set('Butler.serviceMonitor.alertDestination.teams.enable', true);
    // Ensure both serviceStarted and serviceStopped configs are valid, as the module validates both
    cfg.set('Butler.teamsNotification.serviceStarted.messageType', 'basic');
    cfg.set('Butler.teamsNotification.serviceStarted.basicMsgTemplate', 'Service {{serviceName}} is RUNNING');
    cfg.set('Butler.teamsNotification.serviceStarted.webhookURL', 'https://teams.example.com/service');
    cfg.set('Butler.teamsNotification.serviceStopped.messageType', 'basic');
    cfg.set('Butler.teamsNotification.serviceStopped.basicMsgTemplate', 'Service {{serviceName}} is STOPPED');
    cfg.set('Butler.teamsNotification.serviceStopped.webhookURL', 'https://teams.example.com/service-stopped');
});

const baseReloadParams = {
    hostName: 'host',
    user: 'user',
    taskName: 'Task A',
    taskId: 'tid-1',
    appName: 'App1',
    appId: 'aid-1',
    qs_taskCustomProperties: [],
    qs_taskTags: [],
    qs_taskMetadata: {
        isManuallyTriggered: false,
        isPartialReload: false,
        maxRetries: 0,
        modifiedByUserName: 'u',
        modifiedDate: '2024-01-01',
        taskSessionTimeout: 0,
        operational: { nextExecution: 'Never' },
    },
    qs_appMetadata: {},
    qs_appCustomProperties: [],
    qs_appTags: [],
    logTimeStamp: 'ts',
    logLevel: 'ERROR',
    logMessage: 'failed',
    scriptLog: {
        executingNodeName: '',
        executionDuration: 0,
        executionStartTime: '',
        executionStopTime: '',
        executionStatusNum: 0,
        executionStatusText: 'error',
        executionDetails: [],
        executionDetailsConcatenated: '',
        scriptLogSize: 0,
        scriptLogFull: [],
        scriptLogHead: '',
        scriptLogTail: '',
    },
};

describe('msteams_notification', () => {
    test('sendReloadTaskFailureNotificationTeams sends a basic message', async () => {
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 50));

        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(webhookCalls[0].url).toBe('https://teams.example.com/hook');
        expect(webhookCalls[0].msg).toMatchObject({ '@type': 'MessageCard', title: expect.stringContaining('Failed Task A') });
    });

    test('sendServiceMonitorNotificationTeams sends RUNNING basic message', async () => {
        const svc = {
            host: 'H1',
            serviceName: 'svc1',
            serviceStatus: 'RUNNING',
            serviceFriendlyName: 'Service 1',
            serviceDetails: { displayName: 'Service 1', startType: 'Automatic', exePath: 'C:/svc.exe' },
        };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(webhookCalls[0].url).toBe('https://teams.example.com/service');
    });
});
