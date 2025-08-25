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

    test('sendReloadTaskFailureNotificationEmail handles rate limiting', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.rateLimit = 1; // 1 second rate limit
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        const params = makeReloadParams();
        
        // Send first email
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        // Try to send second email immediately (should be rate limited)
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        // Should only have sent one email due to rate limiting
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });

    test('sendReloadTaskSuccessNotificationEmail handles rate limiting', async () => {
        cfg.Butler.emailNotification.reloadTaskSuccess.rateLimit = 1;
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        const params = makeReloadParams();
        
        await mod.sendReloadTaskSuccessNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        await mod.sendReloadTaskSuccessNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });

    test('sendReloadTaskAbortedNotificationEmail handles rate limiting', async () => {
        cfg.Butler.emailNotification.reloadTaskAborted.rateLimit = 1;
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        const params = makeReloadParams();
        
        await mod.sendReloadTaskAbortedNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        await mod.sendReloadTaskAbortedNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });

    test('sendEmailBasic handles smtp error gracefully', async () => {
        sendMailMock.mockRejectedValueOnce(new Error('SMTP error'));
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const result = await mod.sendEmailBasic('from@example.com', ['u@example.com'], 'normal', 'Hello', 'Body');
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('SMTP error'));
    });

    test('isSmtpConfigOk returns true when email enabled and has required config', async () => {
        cfg.Butler.emailNotification.enable = true;
        cfg.Butler.emailNotification.smtp = { host: 'smtp.example.com' };
        mockGlobals();
        const mod = await import('../smtp.js');
        expect(mod.isSmtpConfigOk()).toBe(true);
    });

    test('isSmtpConfigOk returns false when smtp config missing', async () => {
        cfg.Butler.emailNotification.enable = true;
        delete cfg.Butler.emailNotification.smtp;
        mockGlobals();
        const mod = await import('../smtp.js');
        expect(mod.isSmtpConfigOk()).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Missing SMTP config'));
    });

    test('sendReloadTaskFailureNotificationEmail with custom property alert enabled uses task custom properties', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable = true;
        cfg.Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName = 'AlertLevel';
        cfg.Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enabledValue = 'High';
        
        // Mock task custom property check to return true (alert enabled)
        jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
            getTaskCustomPropertyValues: jest.fn().mockResolvedValue([]),
            isCustomPropertyValueSet: jest.fn().mockResolvedValue(true),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        params.qs_taskCustomProperties = [{ definition: { name: 'AlertLevel' }, value: 'High' }];
        
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalled();
    });

    test('sendReloadTaskFailureNotificationEmail with custom property alert disabled skips sending', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable = true;
        cfg.Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName = 'AlertLevel';
        cfg.Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enabledValue = 'High';
        
        // Mock task custom property check to return false (alert disabled)
        jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
            getTaskCustomPropertyValues: jest.fn().mockResolvedValue([]),
            isCustomPropertyValueSet: jest.fn().mockResolvedValue(false),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).not.toHaveBeenCalled();
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Not sending reload failure alert email'));
    });

    test('sendServiceMonitorNotificationEmail sends email for service events', async () => {
        cfg.Butler.serviceMonitor.alertDestination.email.enable = true;
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const serviceEvent = {
            serviceStatus: 'STOPPED',
            serviceName: 'TestService',
            serviceDisplayName: 'Test Service',
            host: 'localhost',
            serviceStartType: 'Automatic',
            serviceExePath: 'C:\\test.exe'
        };
        
        await mod.sendServiceMonitorNotificationEmail(serviceEvent);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(createTransportMock).toHaveBeenCalled();
        expect(sendMailMock).toHaveBeenCalled();
    });

    test('sendServiceMonitorNotificationEmail handles rate limiting', async () => {
        cfg.Butler.serviceMonitor.alertDestination.email.enable = true;
        cfg.Butler.emailNotification.serviceStopped.rateLimit = 1;
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const serviceEvent = { serviceStatus: 'STOPPED', serviceName: 'TestService', host: 'localhost' };
        
        await mod.sendServiceMonitorNotificationEmail(serviceEvent);
        await new Promise((r) => setTimeout(r, 0));
        
        await mod.sendServiceMonitorNotificationEmail(serviceEvent);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Rate limiting failed'));
    });

    test('sendServiceMonitorNotificationEmail with service disabled skips sending', async () => {
        cfg.Butler.serviceMonitor.alertDestination.email.enable = false;
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const serviceEvent = { serviceStatus: 'STOPPED', serviceName: 'TestService' };
        await mod.sendServiceMonitorNotificationEmail(serviceEvent);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Service monitor email notifications are disabled'));
    });

    test('sendEmailBasic with authentication enabled includes auth in transport config', async () => {
        cfg.Butler.emailNotification.smtp.auth = {
            enable: true,
            user: 'test@example.com',
            password: 'password123'
        };
        mockGlobals();
        const mod = await import('../smtp.js');
        
        await mod.sendEmailBasic('from@example.com', ['u@example.com'], 'normal', 'Hello', 'Body');
        
        expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({
            auth: expect.objectContaining({
                user: 'test@example.com',
                pass: 'password123'
            })
        }));
    });

    test('sendEmailBasic with no authentication does not include auth in transport config', async () => {
        cfg.Butler.emailNotification.smtp.auth = { enable: false };
        mockGlobals();
        const mod = await import('../smtp.js');
        
        await mod.sendEmailBasic('from@example.com', ['u@example.com'], 'normal', 'Hello', 'Body');
        
        expect(createTransportMock).toHaveBeenCalledWith(expect.not.objectContaining({
            auth: expect.anything()
        }));
    });

    test('sendEmailBasic handles verification error', async () => {
        verifyMock.mockRejectedValueOnce(new Error('Verification failed'));
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const result = await mod.sendEmailBasic('from@example.com', ['u@example.com'], 'normal', 'Hello', 'Body');
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Verification failed'));
    });

    test('sendServiceMonitorNotificationEmail sends started service email', async () => {
        cfg.Butler.serviceMonitor.alertDestination.email.enable = true;
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const serviceEvent = {
            serviceStatus: 'RUNNING',
            serviceName: 'TestService',
            host: 'localhost'
        };
        
        await mod.sendServiceMonitorNotificationEmail(serviceEvent);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalled();
        const callArgs = sendMailMock.mock.calls[0][0];
        expect(callArgs.to).toContain('ops@example.com');
        expect(callArgs.subject).toContain('Started');
    });

    test('sendReloadTaskFailureNotificationEmail with app owner alerts enabled includes app owner', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.appOwnerAlert = {
            enable: true,
            includeOwner: { includeAll: true },
            excludeOwner: { user: [] }
        };
        
        // Mock app owner with email
        jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
            default: jest.fn().mockResolvedValue({
                userName: 'appowner',
                directory: 'DIR',
                userId: 'uid',
                emails: ['appowner@example.com']
            }),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalled();
        // Check that app owner was included in recipients
        const callArgs = sendMailMock.mock.calls[0][0];
        expect(callArgs.to).toContain('appowner@example.com');
    });

    test('sendReloadTaskFailureNotificationEmail with app owner alerts but no owner email warns', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.appOwnerAlert = {
            enable: true,
            includeOwner: { includeAll: true },
            excludeOwner: { user: [] }
        };
        
        // Mock app owner without email
        jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
            default: jest.fn().mockResolvedValue({
                userName: 'appowner',
                directory: 'DIR',
                userId: 'uid',
                emails: [] // No email
            }),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No email address for owner'));
    });

    test('sendReloadTaskFailureNotificationEmail with selective app owner inclusion works', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.appOwnerAlert = {
            enable: true,
            includeOwner: { 
                includeAll: false,
                user: [{ directory: 'DIR', userId: 'uid' }]
            },
            excludeOwner: { user: [] }
        };
        
        jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
            default: jest.fn().mockResolvedValue({
                userName: 'appowner',
                directory: 'DIR',
                userId: 'uid',
                emails: ['appowner@example.com']
            }),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalled();
        const callArgs = sendMailMock.mock.calls[0][0];
        expect(callArgs.to).toContain('appowner@example.com');
    });

    test('sendReloadTaskFailureNotificationEmail with app owner exclusion removes owner', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.appOwnerAlert = {
            enable: true,
            includeOwner: { includeAll: true },
            excludeOwner: { 
                user: [{ directory: 'DIR', userId: 'uid' }]
            }
        };
        
        jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
            default: jest.fn().mockResolvedValue({
                userName: 'appowner',
                directory: 'DIR',
                userId: 'uid',
                emails: ['appowner@example.com']
            }),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(sendMailMock).toHaveBeenCalled();
        const callArgs = sendMailMock.mock.calls[0][0];
        expect(callArgs.to).not.toContain('appowner@example.com');
    });

    test('sendReloadTaskFailureNotificationEmail with selective inclusion but owner not on list warns', async () => {
        cfg.Butler.emailNotification.reloadTaskFailure.appOwnerAlert = {
            enable: true,
            includeOwner: { 
                includeAll: false,
                user: [{ directory: 'OTHER', userId: 'other-uid' }] // Different user
            },
            excludeOwner: { user: [] }
        };
        
        jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
            default: jest.fn().mockResolvedValue({
                userName: 'appowner',
                directory: 'DIR',
                userId: 'uid',
                emails: ['appowner@example.com']
            }),
        }));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No app owners on include list'));
    });

    test('sendReloadTaskFailureNotificationEmail handles sendMail error gracefully', async () => {
        sendMailMock.mockRejectedValueOnce(new Error('Send mail failed'));
        mockQlikHelpers();
        mockGlobals();
        const mod = await import('../smtp.js');
        
        const params = makeReloadParams();
        await mod.sendReloadTaskFailureNotificationEmail(params);
        await new Promise((r) => setTimeout(r, 0));
        
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Send mail failed'));
    });

    test('sendEmailBasic validates all email recipients', async () => {
        // Mix of valid and invalid emails
        const emailValidateMock = jest.fn()
            .mockReturnValueOnce(true)  // valid@example.com
            .mockReturnValueOnce(false) // invalid-email
            .mockReturnValueOnce(true); // another@example.com
            
        jest.unstable_mockModule('email-validator', () => ({ 
            default: { validate: emailValidateMock } 
        }));
        mockGlobals();
        const mod = await import('../smtp.js');
        
        await mod.sendEmailBasic(
            'from@example.com', 
            ['valid@example.com', 'invalid-email', 'another@example.com'], 
            'normal', 
            'Hello', 
            'Body'
        );
        
        expect(emailValidateMock).toHaveBeenCalledTimes(3);
        expect(sendMailMock).toHaveBeenCalledTimes(2); // Only valid emails
    });

    test('sendEmailBasic handles TLS configuration', async () => {
        cfg.Butler.emailNotification.smtp.tls = {
            rejectUnauthorized: true,
            serverName: 'mail.example.com',
            ignoreTLS: false,
            requireTLS: true
        };
        mockGlobals();
        const mod = await import('../smtp.js');
        
        await mod.sendEmailBasic('from@example.com', ['user@example.com'], 'normal', 'Hello', 'Body');
        
        expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({
            tls: expect.objectContaining({
                rejectUnauthorized: true,
                serverName: 'mail.example.com',
                ignoreTLS: false,
                requireTLS: true
            })
        }));
    });
});
