import { jest } from '@jest/globals';

// Stable mocks reused across tests
const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
};

// Dot-path getter
function getByPath(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

// Mutable config populated in beforeEach
let cfg;

// Core SMTP/template mocks
const verifyMock = jest.fn().mockResolvedValue(true);
const sendMailMock = jest.fn().mockResolvedValue({ accepted: ['user@example.com'] });
const createTransportMock = jest.fn().mockReturnValue({ verify: verifyMock, sendMail: sendMailMock, use: jest.fn() });
const compileMock = jest.fn(() => () => 'Subject');

function setupCommonMocks({ emailValidate = true } = {}) {
    jest.unstable_mockModule('nodemailer', () => ({ default: { createTransport: createTransportMock } }));
    jest.unstable_mockModule('nodemailer-express-handlebars', () => ({ default: () => ({}) }));
    jest.unstable_mockModule('express-handlebars', () => ({ default: { create: () => ({}) } }));
    jest.unstable_mockModule('handlebars', () => ({ default: { registerHelper: jest.fn(), compile: compileMock } }));
    jest.unstable_mockModule('email-validator', () => ({ default: { validate: () => emailValidate } }));
}

function mockGlobals() {
    jest.unstable_mockModule('../../../globals.js', () => ({
        default: {
            logger,
            config: {
                has: (path) => getByPath(cfg, path) !== undefined,
                get: (path) => getByPath(cfg, path),
            },
        },
    }));
}

function mockQlikHelpers() {
    jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
        getTaskCustomPropertyValues: jest.fn().mockResolvedValue([]),
        isCustomPropertyValueSet: jest.fn().mockResolvedValue(false),
    }));
    jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
        default: jest.fn().mockResolvedValue({ emails: ['owner@example.com'], directory: 'dir', userId: 'uid', userName: 'Owner' }),
    }));
    jest.unstable_mockModule('../get_qs_urls.js', () => ({
        getQlikSenseUrls: jest
            .fn()
            .mockReturnValue({ appBaseUrl: 'https://sense/apps/', qmcUrl: 'https://sense/qmc', hubUrl: 'https://sense/hub' }),
    }));
}

function makeReloadParams() {
    return {
        hostName: 'node1',
        user: 'svc',
        taskName: 'Task A',
        taskId: 'task-1',
        appName: 'App A',
        appId: 'app-1',
        logTimeStamp: '2025-08-24 10:00:00',
        logLevel: 'error',
        logMessage: 'failed',
        qs_taskMetadata: {
            isManuallyTriggered: false,
            isPartialReload: false,
            maxRetries: 0,
            modifiedByUserName: 'user',
            modifiedDate: '2025-08-24T10:00:00Z',
            taskSessionTimeout: 30,
            operational: { nextExecution: '1753-01-01T00:00:00.000Z' },
        },
        qs_taskCustomProperties: [],
        qs_taskTags: [],
        scriptLog: {
            executingNodeName: 'node1',
            executionDuration: { minutes: 1, seconds: 0 },
            executionStartTime: {},
            executionStopTime: {},
            executionStatusNum: 8,
            executionStatusText: 'FinishedFail',
            executionDetails: [],
            scriptLogSize: 3,
            scriptLogSizeRows: 3,
            scriptLogSizeCharacters: 10,
            scriptLogTailCount: 2,
            scriptLogHeadCount: 2,
            scriptLogFull: ['row1', 'row2', 'row3'],
        },
    };
}

describe('smtp.js', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        // Default config
        cfg = {
            Butler: {
                emailNotification: {
                    enable: true,
                    smtp: {
                        host: 'smtp.example.com',
                        port: 587,
                        secure: false,
                        tls: {
                            rejectUnauthorized: false,
                            serverName: 'smtp.example.com',
                            ignoreTLS: false,
                            requireTLS: false,
                        },
                        auth: { enable: false },
                    },
                    reloadTaskFailure: {
                        enable: true,
                        rateLimit: 1,
                        recipients: ['fail1@example.com', 'fail2@example.com'],
                        fromAddress: 'from@example.com',
                        priority: 'high',
                        subject: 'Reload failed',
                        bodyFileDirectory: '/tmp',
                        htmlTemplateFile: 'tmpl_fail.hbs',
                        alertEnableByCustomProperty: { enable: false },
                        headScriptLogLines: 2,
                        tailScriptLogLines: 2,
                    },
                    reloadTaskSuccess: {
                        enable: true,
                        rateLimit: 1,
                        recipients: ['succ1@example.com'],
                        fromAddress: 'from@example.com',
                        priority: 'normal',
                        subject: 'Reload success',
                        bodyFileDirectory: '/tmp',
                        htmlTemplateFile: 'tmpl_success.hbs',
                        alertEnableByCustomProperty: { enable: false },
                        headScriptLogLines: 2,
                        tailScriptLogLines: 2,
                    },
                    reloadTaskAborted: {
                        enable: true,
                        rateLimit: 1,
                        recipients: ['abort1@example.com'],
                        fromAddress: 'from@example.com',
                        priority: 'normal',
                        subject: 'Reload aborted',
                        bodyFileDirectory: '/tmp',
                        htmlTemplateFile: 'tmpl_aborted.hbs',
                        alertEnableByCustomProperty: { enable: false },
                        headScriptLogLines: 2,
                        tailScriptLogLines: 2,
                    },
                    serviceStopped: {
                        rateLimit: 1,
                        recipients: ['ops@example.com'],
                        fromAddress: 'from@example.com',
                        priority: 'high',
                        subject: 'Stopped',
                        bodyFileDirectory: '/tmp',
                        htmlTemplateFile: 'tmpl.hbs',
                    },
                    serviceStarted: {
                        rateLimit: 1,
                        recipients: ['ops@example.com'],
                        fromAddress: 'from@example.com',
                        priority: 'low',
                        subject: 'Started',
                        bodyFileDirectory: '/tmp',
                        htmlTemplateFile: 'tmpl.hbs',
                    },
                },
                serviceMonitor: { enable: true, alertDestination: { email: { enable: true } } },
            },
        };

        // Register default mocks
        setupCommonMocks();
    });

    test('isSmtpConfigOk returns false and logs when email disabled', async () => {
        cfg.Butler.emailNotification.enable = false;
        mockGlobals();
        const mod = await import('../smtp.js');
        expect(mod.isSmtpConfigOk()).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SMTP notifications are disabled'));
    });

    test('sendReloadTaskFailureNotificationEmail sends emails to recipients (global gating)', async () => {
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        expect(createTransportMock).toHaveBeenCalled();
        expect(verifyMock).toHaveBeenCalled();
        expect(sendMailMock).toHaveBeenCalledTimes(cfg.Butler.emailNotification.reloadTaskFailure.recipients.length);
        expect(compileMock).toHaveBeenCalledWith(cfg.Butler.emailNotification.reloadTaskFailure.subject);
    });

    test('sendReloadTaskSuccessNotificationEmail sends emails to recipients (global gating)', async () => {
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        const params = makeReloadParams();
        await mod.sendReloadTaskSuccessNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        expect(sendMailMock).toHaveBeenCalledTimes(cfg.Butler.emailNotification.reloadTaskSuccess.recipients.length);
        expect(compileMock).toHaveBeenCalledWith(cfg.Butler.emailNotification.reloadTaskSuccess.subject);
    });

    test('sendReloadTaskAbortedNotificationEmail sends emails to recipients (global gating)', async () => {
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        const params = makeReloadParams();
        await mod.sendReloadTaskAbortedNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        expect(sendMailMock).toHaveBeenCalledTimes(cfg.Butler.emailNotification.reloadTaskAborted.recipients.length);
        expect(compileMock).toHaveBeenCalledWith(cfg.Butler.emailNotification.reloadTaskAborted.subject);
    });

    test('sendEmailBasic does not send when email is invalid', async () => {
        // Re-register validator mock to return false for this test
        jest.resetModules();
        jest.clearAllMocks();
        setupCommonMocks({ emailValidate: false });
        mockGlobals();
        const mod = await import('../smtp.js');
        await mod.sendEmailBasic('from@example.com', ['bad@example.com'], 'normal', 'Hello', 'Body');
        expect(sendMailMock).not.toHaveBeenCalled();
    });

    test('sendEmailBasic does not send when transporter.verify is false', async () => {
        verifyMock.mockResolvedValueOnce(false);
        mockGlobals();
        const mod = await import('../smtp.js');
        await mod.sendEmailBasic('from@example.com', ['u@example.com'], 'normal', 'Hello', 'Body');
        expect(sendMailMock).not.toHaveBeenCalled();
    });
});
