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

    test('reload failure with teams notifications disabled logs error and skips sending', async () => {
        cfg.set('Butler.teamsNotification.reloadTaskFailure.enable', false);
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Reload failure Teams notifications are disabled'));
    });

    test('reload failure with invalid message type logs error and skips sending', async () => {
        cfg.set('Butler.teamsNotification.reloadTaskFailure.messageType', 'invalid');
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid Teams message type: invalid'));
    });

    test('reload failure with basic messageType but missing template logs error and skips sending', async () => {
        cfg.delete('Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate');
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No message text in config file'));
    });

    test('reload failure with formatted messageType but missing templateFile logs error and skips sending', async () => {
        cfg.set('Butler.teamsNotification.reloadTaskFailure.messageType', 'formatted');
        cfg.delete('Butler.teamsNotification.reloadTaskFailure.templateFile');
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Message template file not specified'));
    });

    test('reload failure with formatted messageType uses template file', async () => {
        const fs = await import('fs');
        fs.default.existsSync.mockReturnValue(true);
        fs.default.readFileSync.mockReturnValue('{"title": "Failed {{taskName}}"}');
        
        cfg.set('Butler.teamsNotification.reloadTaskFailure.messageType', 'formatted');
        cfg.set('Butler.teamsNotification.reloadTaskFailure.templateFile', '/path/to/template.json');
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 50));
        
        expect(fs.default.existsSync).toHaveBeenCalledWith('/path/to/template.json');
        expect(fs.default.readFileSync).toHaveBeenCalledWith('/path/to/template.json');
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
    });

    test('reload failure with formatted messageType and missing file logs error and skips sending', async () => {
        const fs = await import('fs');
        fs.default.existsSync.mockReturnValue(false);
        
        cfg.set('Butler.teamsNotification.reloadTaskFailure.messageType', 'formatted');
        cfg.set('Butler.teamsNotification.reloadTaskFailure.templateFile', '/path/to/missing.json');
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Teams formatting template file '));
    });

    test('sendReloadTaskFailureNotificationTeams handles webhook send error', async () => {
        sendMessageMock.mockRejectedValueOnce(new Error('Webhook failed'));
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 50));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('TEAMS RELOAD TASK FAILED'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Webhook failed'));
    });

    test('service monitor with teams notifications disabled logs error and skips sending', async () => {
        cfg.set('Butler.serviceMonitor.alertDestination.teams.enable', false);
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Teams service monitor notifications are disabled'));
    });

    test('service monitor STOPPED sends to stopped webhook url', async () => {
        const svc = {
            host: 'H2',
            serviceName: 'svc2',
            serviceStatus: 'STOPPED',
            serviceFriendlyName: 'Service 2',
            serviceDetails: { displayName: 'Service 2', startType: 'Manual', exePath: 'C:/svc2.exe' },
        };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(webhookCalls[0].url).toBe('https://teams.example.com/service-stopped');
        expect(webhookCalls[0].msg.title).toContain('STOPPED');
    });

    test('service monitor with invalid started message type logs error and skips sending', async () => {
        cfg.set('Butler.teamsNotification.serviceStarted.messageType', 'invalid');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid message type'));
    });

    test('service monitor with invalid stopped message type logs error and skips sending', async () => {
        cfg.set('Butler.teamsNotification.serviceStopped.messageType', 'invalid');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'STOPPED', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid message type'));
    });

    test('service monitor with missing started template logs error and skips sending', async () => {
        cfg.delete('Butler.teamsNotification.serviceStarted.basicMsgTemplate');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No basic message template specified'));
    });

    test('service monitor with missing stopped template logs error and skips sending', async () => {
        cfg.delete('Butler.teamsNotification.serviceStopped.basicMsgTemplate');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'STOPPED', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('No basic message template specified'));
    });

    test('service monitor with formatted type and missing template file logs error', async () => {
        cfg.set('Butler.teamsNotification.serviceStarted.messageType', 'formatted');
        cfg.delete('Butler.teamsNotification.serviceStarted.templateFile');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Message template file not specified'));
    });

    test('service monitor with formatted type uses template file', async () => {
        const fs = await import('fs');
        fs.default.existsSync.mockReturnValue(true);
        fs.default.readFileSync.mockReturnValue('{"title": "Service {{serviceName}} status changed"}');
        
        cfg.set('Butler.teamsNotification.serviceStarted.messageType', 'formatted');
        cfg.set('Butler.teamsNotification.serviceStarted.templateFile', '/path/to/service.json');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 50));
        
        expect(fs.default.existsSync).toHaveBeenCalledWith('/path/to/service.json');
        expect(fs.default.readFileSync).toHaveBeenCalledWith('/path/to/service.json');
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
    });

    test('service monitor with formatted type and missing file logs error', async () => {
        const fs = await import('fs');
        fs.default.existsSync.mockReturnValue(false);
        
        cfg.set('Butler.teamsNotification.serviceStarted.messageType', 'formatted');
        cfg.set('Butler.teamsNotification.serviceStarted.templateFile', '/path/to/missing-service.json');
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 30));
        
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Teams formatting template file '));
    });

    test('service monitor with webhook send error logs error message', async () => {
        sendMessageMock.mockRejectedValueOnce(new Error('Service webhook failed'));
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'RUNNING', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 50));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('TEAMS SERVICE MONITOR'));
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Service webhook failed'));
    });

    test('reload failure with rate limiting suppresses duplicate sends', async () => {
        cfg.set('Butler.teamsNotification.reloadTaskFailure.rateLimit', 1);
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        sendReloadTaskFailureNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 100));
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });

    test('service monitor with rate limiting suppresses duplicate sends', async () => {
        cfg.set('Butler.teamsNotification.serviceStopped.rateLimit', 1);
        const svc = { host: 'H1', serviceName: 'svc1', serviceStatus: 'STOPPED', serviceDetails: {} };
        sendServiceMonitorNotificationTeams(svc);
        sendServiceMonitorNotificationTeams(svc);
        await new Promise((r) => setTimeout(r, 100));
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });

    test('reload failure sends aborted notification properly', async () => {
        // Import the sendReloadTaskAbortedNotificationTeams function
        const mod = await import('../msteams_notification.js');
        const { sendReloadTaskAbortedNotificationTeams } = mod;
        
        cfg.set('Butler.teamsNotification.reloadTaskAborted.enable', true);
        cfg.set('Butler.teamsNotification.reloadTaskAborted.messageType', 'basic');
        cfg.set('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate', 'Aborted {{taskName}}');
        cfg.set('Butler.teamsNotification.reloadTaskAborted.webhookURL', 'https://teams.example.com/aborted');
        
        sendReloadTaskAbortedNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 50));
        
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(webhookCalls[0].url).toBe('https://teams.example.com/aborted');
        expect(webhookCalls[0].msg.title).toContain('Aborted Task A');
    });

    test('reload aborted with disabled notifications logs error and skips sending', async () => {
        const mod = await import('../msteams_notification.js');
        const { sendReloadTaskAbortedNotificationTeams } = mod;
        
        cfg.set('Butler.teamsNotification.reloadTaskAborted.enable', false);
        sendReloadTaskAbortedNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Reload aborted Teams notifications are disabled'));
    });

    test('reload aborted with invalid message type logs error and skips sending', async () => {
        const mod = await import('../msteams_notification.js');
        const { sendReloadTaskAbortedNotificationTeams } = mod;
        
        cfg.set('Butler.teamsNotification.reloadTaskAborted.enable', true);
        cfg.set('Butler.teamsNotification.reloadTaskAborted.messageType', 'invalid');
        sendReloadTaskAbortedNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 30));
        expect(sendMessageMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid Teams message type: invalid'));
    });

    test('reload aborted with rate limiting suppresses duplicate sends', async () => {
        const mod = await import('../msteams_notification.js');
        const { sendReloadTaskAbortedNotificationTeams } = mod;
        
        cfg.set('Butler.teamsNotification.reloadTaskAborted.enable', true);
        cfg.set('Butler.teamsNotification.reloadTaskAborted.messageType', 'basic');
        cfg.set('Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate', 'Aborted {{taskName}}');
        cfg.set('Butler.teamsNotification.reloadTaskAborted.webhookURL', 'https://teams.example.com/aborted');
        cfg.set('Butler.teamsNotification.reloadTaskAborted.rateLimit', 1);
        
        sendReloadTaskAbortedNotificationTeams(baseReloadParams);
        sendReloadTaskAbortedNotificationTeams(baseReloadParams);
        await new Promise((r) => setTimeout(r, 100));
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });
});
