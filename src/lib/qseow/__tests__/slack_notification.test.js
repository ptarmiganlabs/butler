import { jest } from '@jest/globals';

// Mock slack_api to capture outgoing payload
const slackSendMock = jest.fn().mockResolvedValue({ status: 200, statusText: 'OK', data: 'ok' });
jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSendMock }));

// Mock FS since formatted path may check existsSync; we use basic here
jest.unstable_mockModule('fs', () => ({ default: { existsSync: jest.fn(), readFileSync: jest.fn() } }));

// Mock get_app_owner
jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
    default: jest.fn().mockResolvedValue({ userName: 'owner', directory: 'DIR', userId: 'uid', emails: ['owner@example.com'] }),
}));

// Mock Sense URLs helper
jest.unstable_mockModule('../get_qs_urls.js', () => ({
    getQlikSenseUrls: jest
        .fn()
        .mockReturnValue({ appBaseUrl: 'https://sense/apps', qmcUrl: 'https://sense/qmc', hubUrl: 'https://sense/hub' }),
}));

// Globals
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
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

let sendReloadTaskFailureNotificationSlack;
let sendServiceMonitorNotificationSlack;
let sendReloadTaskAbortedNotificationSlack;

beforeAll(async () => {
    const mod = await import('../slack_notification.js');
    ({ sendReloadTaskFailureNotificationSlack, sendServiceMonitorNotificationSlack, sendReloadTaskAbortedNotificationSlack } = mod);
});

beforeEach(() => {
    jest.clearAllMocks();
    cfg.clear();

    // Enable Slack basic messages
    cfg.set('Butler.slackNotification.reloadTaskFailure.enable', true);
    cfg.set('Butler.slackNotification.reloadTaskFailure.messageType', 'basic');
    cfg.set('Butler.slackNotification.reloadTaskFailure.basicMsgTemplate', 'Failed {{taskName}}');
    cfg.set('Butler.slackNotification.reloadTaskFailure.webhookURL', 'https://slack.example.com/hook');

    cfg.set('Butler.serviceMonitor.alertDestination.slack.enable', true);
    // Provide both serviceStarted and serviceStopped configs as module validates both
    cfg.set('Butler.slackNotification.serviceStarted.messageType', 'basic');
    cfg.set('Butler.slackNotification.serviceStarted.basicMsgTemplate', 'Service {{serviceName}} is RUNNING');
    cfg.set('Butler.slackNotification.serviceStarted.webhookURL', 'https://slack.example.com/service');
    cfg.set('Butler.slackNotification.serviceStopped.messageType', 'basic');
    cfg.set('Butler.slackNotification.serviceStopped.basicMsgTemplate', 'Service {{serviceName}} is STOPPED');
    cfg.set('Butler.slackNotification.serviceStopped.webhookURL', 'https://slack.example.com/service-stopped');

    // Aborted config
    cfg.set('Butler.slackNotification.reloadTaskAborted.enable', true);
    cfg.set('Butler.slackNotification.reloadTaskAborted.messageType', 'basic');
    cfg.set('Butler.slackNotification.reloadTaskAborted.basicMsgTemplate', 'Aborted {{taskName}}');
    cfg.set('Butler.slackNotification.reloadTaskAborted.webhookURL', 'https://slack.example.com/hook-aborted');
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

describe('slack_notification', () => {
    test('sendReloadTaskFailureNotificationSlack sends basic message', async () => {
        sendReloadTaskFailureNotificationSlack(baseReloadParams);
        await new Promise((r) => setTimeout(r, 50));
        expect(slackSendMock).toHaveBeenCalledTimes(1);
        const [slackCfgArg] = slackSendMock.mock.calls[0];
        expect(slackCfgArg.webhookUrl).toBe('https://slack.example.com/hook');
        expect(slackCfgArg.messageType).toBe('basic');
        // Text is a JSON-like object for basic
        expect(slackCfgArg.text).toBeDefined();
    });

    test('sendServiceMonitorNotificationSlack sends RUNNING basic message', async () => {
        const svc = {
            host: 'H1',
            serviceName: 'svc1',
            serviceStatus: 'RUNNING',
            serviceFriendlyName: 'Service 1',
            serviceDetails: { displayName: 'Service 1', startType: 'Automatic', exePath: 'C:/svc.exe' },
        };
        sendServiceMonitorNotificationSlack(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(slackSendMock).toHaveBeenCalledTimes(1);
        const [slackCfgArg] = slackSendMock.mock.calls[0];
        expect(slackCfgArg.webhookUrl).toBe('https://slack.example.com/service');
    });

    test('service monitor invalid message type prevents send', async () => {
        // Break config for serviceStarted to trigger validation error
        cfg.set('Butler.slackNotification.serviceStarted.messageType', 'bogus');
        const svc = {
            host: 'H2',
            serviceName: 'svc-bad',
            serviceStatus: 'RUNNING',
            serviceFriendlyName: 'Service bad',
            serviceDetails: { displayName: 'Service bad', startType: 'Manual', exePath: 'C:/bad.exe' },
        };
        sendServiceMonitorNotificationSlack(svc);
        await new Promise((r) => setTimeout(r, 30));
        expect(slackSendMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        // restore for later tests
        cfg.set('Butler.slackNotification.serviceStarted.messageType', 'basic');
    });

    test('sendServiceMonitorNotificationSlack sends STOPPED basic message', async () => {
        const svc = {
            host: 'H1',
            serviceName: 'svc2',
            serviceStatus: 'STOPPED',
            serviceFriendlyName: 'Service 2',
            serviceDetails: { displayName: 'Service 2', startType: 'Manual', exePath: 'C:/svc2.exe' },
        };
        sendServiceMonitorNotificationSlack(svc);
        await new Promise((r) => setTimeout(r, 30));
        const last = slackSendMock.mock.calls.pop()[0];
        expect(last.webhookUrl).toBe('https://slack.example.com/service-stopped');
    });

    test('sendReloadTaskFailureNotificationSlack truncates very long script logs', async () => {
        const long = 'x'.repeat(4000);
        const params = {
            ...baseReloadParams,
            taskId: 'tid-long',
            scriptLog: {
                ...baseReloadParams.scriptLog,
                scriptLogHead: long,
                scriptLogTail: long,
                scriptLogFull: [long],
            },
        };
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 50));
        expect(slackSendMock).toHaveBeenCalled();
        // verify logger.warn called for truncation at least once
        expect(logger.warn).toHaveBeenCalled();
    });

    test('sendReloadTaskAbortedNotificationSlack truncates very long script logs', async () => {
        const long = 'y'.repeat(4000);
        const params = {
            ...baseReloadParams,
            taskId: 'tid-long-aborted',
            scriptLog: {
                ...baseReloadParams.scriptLog,
                scriptLogHead: long,
                scriptLogTail: long,
                scriptLogFull: [long],
            },
        };
        sendReloadTaskAbortedNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 50));
        expect(slackSendMock).toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalled();
    });

    test('sendReloadTaskFailureNotificationSlack disabled config prevents send', async () => {
        cfg.set('Butler.slackNotification.reloadTaskFailure.enable', false);
        const params = { ...baseReloadParams, taskId: 'tid-disabled' };
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 30));
        expect(slackSendMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('sendReloadTaskAbortedNotificationSlack sends basic message', async () => {
        const params = { ...baseReloadParams, taskId: 'tid-aborted' };
        sendReloadTaskAbortedNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 50));
        expect(slackSendMock).toHaveBeenCalled();
        const arg = slackSendMock.mock.calls.pop()[0];
        expect(arg.webhookUrl).toBe('https://slack.example.com/hook-aborted');
    });

    test('service monitor formatted message uses template file', async () => {
        // Switch to formatted for started
        cfg.set('Butler.slackNotification.serviceStarted.messageType', 'formatted');
        cfg.set('Butler.slackNotification.serviceStarted.templateFile', '/tmp/template.hbs');
        // Mock fs to have template
        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('Rendered template with {{serviceName}}');

        const svc = {
            host: 'H1',
            serviceName: 'svc3',
            serviceStatus: 'RUNNING',
            serviceFriendlyName: 'Service 3',
            serviceDetails: { displayName: 'Service 3', startType: 'Automatic', exePath: 'C:/svc3.exe' },
        };
        sendServiceMonitorNotificationSlack(svc);
        await new Promise((r) => setTimeout(r, 50));
        expect(slackSendMock).toHaveBeenCalled();
    });

    test('reload failure formatted message with optional fields', async () => {
        // Enable formatted and set optional fields
        cfg.set('Butler.slackNotification.reloadTaskFailure.enable', true);
        cfg.set('Butler.slackNotification.reloadTaskFailure.messageType', 'formatted');
        cfg.set('Butler.slackNotification.reloadTaskFailure.templateFile', '/tmp/reload-fmt.hbs');
        cfg.set('Butler.slackNotification.reloadTaskFailure.channel', '#ops');
        cfg.set('Butler.slackNotification.reloadTaskFailure.fromUser', 'butler');
        cfg.set('Butler.slackNotification.reloadTaskFailure.iconEmoji', ':robot_face:');

        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"text":"Task {{taskName}} failed. Log: {{logMessage}}"}');

        const params = { ...baseReloadParams, taskId: 'tid-fmt-1', taskName: 'T1', logMessage: 'msg' };
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 60));
        expect(slackSendMock).toHaveBeenCalled();
        const arg = slackSendMock.mock.calls.pop()[0];
        expect(arg.messageType).toBe('formatted');
        expect(arg.channel).toBe('#ops');
        expect(arg.fromUser || arg.username).toBeDefined();
        expect(arg.iconEmoji || arg.icon_emoji).toBeDefined();
        expect(typeof arg.text).toBe('string');
    });

    test('reload aborted formatted message path', async () => {
        cfg.set('Butler.slackNotification.reloadTaskAborted.enable', true);
        cfg.set('Butler.slackNotification.reloadTaskAborted.messageType', 'formatted');
        cfg.set('Butler.slackNotification.reloadTaskAborted.templateFile', '/tmp/aborted-fmt.hbs');
        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"text":"Task {{taskName}} aborted by {{user}}"}');

        const params = { ...baseReloadParams, taskId: 'tid-fmt-2', taskName: 'T2', logMessage: 'aborted' };
        sendReloadTaskAbortedNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 60));
        expect(slackSendMock).toHaveBeenCalled();
        const arg = slackSendMock.mock.calls.pop()[0];
        expect(arg.messageType).toBe('formatted');
        expect(typeof arg.text).toBe('string');
    });

    test('formatted template missing logs error and does not send', async () => {
        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(false);
        cfg.set('Butler.slackNotification.reloadTaskFailure.enable', true);
        cfg.set('Butler.slackNotification.reloadTaskFailure.messageType', 'formatted');
        cfg.set('Butler.slackNotification.reloadTaskFailure.templateFile', '/tmp/missing.hbs');

        const params = { ...baseReloadParams, taskId: 'tid-fmt-3' };
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 40));
        expect(slackSendMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
    });

    test('reload failure formatted escapes backslashes in script logs', async () => {
        // Enable formatted and set a template that emits scriptLogHead
        cfg.set('Butler.slackNotification.reloadTaskFailure.enable', true);
        cfg.set('Butler.slackNotification.reloadTaskFailure.messageType', 'formatted');
        cfg.set('Butler.slackNotification.reloadTaskFailure.templateFile', '/tmp/reload-escape.hbs');

        const fs = (await import('fs')).default;
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('Head: {{scriptLogHead}} Tail: {{scriptLogTail}}');

        const params = {
            ...baseReloadParams,
            taskId: 'tid-fmt-escape',
            scriptLog: {
                ...baseReloadParams.scriptLog,
                // Provide full log lines containing single backslashes; implementation derives head/tail from full
                scriptLogFull: ['C:\\temp', 'C:\\logs\\file'],
            },
        };
        // Ensure only first and last lines are picked for head/tail
        cfg.set('Butler.slackNotification.reloadTaskFailure.headScriptLogLines', 1);
        cfg.set('Butler.slackNotification.reloadTaskFailure.tailScriptLogLines', 1);
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 60));
        expect(slackSendMock).toHaveBeenCalled();
        const arg = slackSendMock.mock.calls.pop()[0];
        // Backslashes should be preserved in some form; check minimally that a backslash path appears
        // With JSON.stringify escaping, backslashes are properly escaped for JSON
        const ok = /C:\\\\temp/.test(arg.text) || /C:\\\\\\\\temp/.test(arg.text);
        expect(ok).toBe(true);
    });

    test('invalid messageType prevents send for reload failure', async () => {
        cfg.set('Butler.slackNotification.reloadTaskFailure.messageType', 'weird');
        const params = { ...baseReloadParams, taskId: 'tid-invalid-type' };
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 40));
        expect(slackSendMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        // restore
        cfg.set('Butler.slackNotification.reloadTaskFailure.messageType', 'basic');
    });

    test('rate limiter suppresses duplicate reload failure sends', async () => {
        const params = { ...baseReloadParams, taskId: 'tid-dup' };
        sendReloadTaskFailureNotificationSlack(params);
        sendReloadTaskFailureNotificationSlack(params);
        await new Promise((r) => setTimeout(r, 80));
        expect(slackSendMock).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalled();
    });

    test('rate limiter suppresses duplicate service monitor sends', async () => {
        const svc = {
            host: 'H-dup',
            serviceName: 'svc-dup',
            serviceStatus: 'RUNNING',
            serviceFriendlyName: 'Service dup',
            serviceDetails: { displayName: 'Service dup', startType: 'Auto', exePath: 'C:/dup.exe' },
        };
        sendServiceMonitorNotificationSlack(svc);
        sendServiceMonitorNotificationSlack(svc);
        await new Promise((r) => setTimeout(r, 80));
        expect(slackSendMock).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalled();
    });
});
