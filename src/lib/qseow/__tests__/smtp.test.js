import { jest } from '@jest/globals';

// Mock external dependencies
const createTransporterMock = jest.fn();

jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransporter: createTransporterMock,
    },
}));

jest.unstable_mockModule('nodemailer-express-handlebars', () => ({
    default: jest.fn(),
}));

jest.unstable_mockModule('express-handlebars', () => ({
    default: {
        create: jest.fn().mockReturnValue({
            handlebars: {
                registerHelper: jest.fn(),
            },
        }),
    },
}));

jest.unstable_mockModule('handlebars', () => ({
    default: {
        compile: jest.fn().mockReturnValue(() => 'compiled template'),
    },
}));

jest.unstable_mockModule('rate-limiter-flexible', () => ({
    RateLimiterMemory: jest.fn().mockImplementation(() => ({
        consume: jest.fn().mockResolvedValue(undefined),
    })),
}));

jest.unstable_mockModule('email-validator', () => ({
    default: {
        validate: jest.fn(),
    },
}));

jest.unstable_mockModule('../../../globals.js', () => ({
    default: {
        config: {
            has: jest.fn(),
            get: jest.fn(),
        },
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            verbose: jest.fn(),
            debug: jest.fn(),
        },
    },
}));

jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
    getTaskCustomPropertyValues: jest.fn().mockResolvedValue([]),
    isCustomPropertyValueSet: jest.fn().mockReturnValue(false),
}));

jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
    default: jest.fn().mockResolvedValue([]),
}));

jest.unstable_mockModule('../get_qs_urls.js', () => ({
    getQlikSenseUrls: jest.fn().mockReturnValue({
        appBaseUrl: 'https://qlik-server/app/',
        qmcBaseUrl: 'https://qlik-server/qmc/',
    }),
}));

// Logger mock
const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
};

describe('smtp', () => {
    let smtpModule;
    let nodemailerMock;
    let globalsMock;
    let emailValidatorMock;

    beforeAll(async () => {
        const nodemailerLib = await import('nodemailer');
        nodemailerMock = nodemailerLib.default;

        const globalsLib = await import('../../../globals.js');
        globalsMock = globalsLib.default;

        const emailValidatorLib = await import('email-validator');
        emailValidatorMock = emailValidatorLib.default;

        smtpModule = await import('../smtp.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        globalsMock.config.has.mockReturnValue(true);
        globalsMock.config.get.mockImplementation((key) => {
            const configMap = {
                'Butler.emailNotification.enable': true,
                'Butler.emailNotification.smtp.host': 'smtp.company.com',
                'Butler.emailNotification.smtp.port': 587,
                'Butler.emailNotification.smtp.secure': false,
                'Butler.emailNotification.smtp.auth.enable': true,
                'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                'Butler.emailNotification.smtp.auth.password': 'secret',
                'Butler.emailNotification.reloadTaskSuccess.rateLimit': 300,
                'Butler.emailNotification.reloadTaskFailure.rateLimit': 300,
                'Butler.emailNotification.reloadTaskAborted.rateLimit': 300,
                'Butler.emailNotification.serviceStopped.rateLimit': 300,
            };
            return configMap[key];
        });

        emailValidatorMock.validate.mockReturnValue(true);

        // Setup default transporter mock
        nodemailerMock.createTransporter = jest.fn().mockReturnValue({
            sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
            verify: jest.fn().mockResolvedValue(true),
            use: jest.fn(),
        });
    });

    describe('isSmtpConfigOk', () => {
        test('should return true when email notifications are enabled', () => {
            globalsMock.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return true;
                return 'default-value';
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(true);
        });

        test('should return false when email notifications are disabled', () => {
            globalsMock.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return false;
                return 'default-value';
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });

        test('should return false when config access throws error', () => {
            globalsMock.config.get.mockImplementation(() => {
                throw new Error('Config access error');
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });
    });

    describe('sendEmailBasic', () => {
        test('should handle invalid email addresses', async () => {
            emailValidatorMock.validate.mockReturnValue(false);

            const result = await smtpModule.sendEmailBasic('sender@company.com', ['invalid-email'], 'normal', 'Test Subject', 'Test Body');

            expect(result).toBeUndefined();
        });

        test('should handle SMTP configuration errors', async () => {
            // Test when email notifications are disabled entirely
            globalsMock.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return false;
                return 'default-value';
            });

            const result = await smtpModule.sendEmailBasic(
                'sender@company.com',
                ['valid@company.com'],
                'normal',
                'Test Subject',
                'Test Body',
            );

            expect(result).toBe(1);
        });

        test('should handle email sending errors', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error')),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            const result = await smtpModule.sendEmailBasic(
                'sender@company.com',
                ['recipient@company.com'],
                'normal',
                'Test Subject',
                'Test Body',
            );

            expect(result).toBeUndefined();
        });
    });

    describe('sendEmail', () => {
        test('should handle template errors', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValue(new Error('Template Error')),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            const result = await smtpModule.sendEmail(
                'sender@company.com',
                ['recipient@company.com'],
                'normal',
                'Test Subject {{variable}}',
                '/path/to/templates',
                'template.hbs',
                { variable: 'value' },
            );

            expect(result).toBeUndefined();
        });
    });

    describe('sendReloadTaskFailureNotificationEmail', () => {
        test('should handle valid reload failure parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.smtp.host': 'smtp.company.com',
                    'Butler.emailNotification.smtp.port': 587,
                    'Butler.emailNotification.smtp.secure': false,
                    'Butler.emailNotification.smtp.auth.enable': true,
                    'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                    'Butler.emailNotification.smtp.auth.password': 'secret',
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskFailure.subject': 'Task Failed: {{taskName}}',
                    'Butler.emailNotification.reloadTaskFailure.priority': 'high',
                    'Butler.emailNotification.reloadTaskFailure.fromAddress': 'butler@company.com',
                    'Butler.emailNotification.reloadTaskFailure.bodyFileDirectory': '/templates',
                    'Butler.emailNotification.reloadTaskFailure.htmlTemplateFile': 'failure.hbs',
                    'Butler.emailNotification.reloadTaskFailure.headScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskFailure.tailScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable': false,
                };
                return configMap[key];
            });

            const reloadParams = {
                hostName: 'qlik-server',
                user: 'testuser',
                taskName: 'Test Task',
                taskId: 'test-task-id',
                appName: 'Test App',
                appId: 'test-app-id',
                logTimeStamp: new Date().toISOString(),
                logLevel: 'ERROR',
                logMessage: 'Task failed due to error',
                executingNodeName: 'node1',
                executionDuration: 120,
                executionStartTime: new Date(),
                executionStopTime: new Date(),
                executionStatusNum: 5,
                executionStatusText: 'Failed',
                scriptLogSize: 1024,
                scriptLogHead: 'Script log beginning...',
                scriptLogTail: 'Script log end...',
                scriptLogTailCount: 10,
                scriptLogHeadCount: 10,
                scriptLog: {
                    scriptLogFull: ['line1', 'line2', 'line3'],
                },
                qs_taskMetadata: {
                    isManuallyTriggered: false,
                    isPartialReload: false,
                    maxRetries: 3,
                    modifiedByUserName: 'admin',
                    taskSessionTimeout: 600,
                    operational: {
                        nextExecution: '2025-01-01T12:00:00.000Z',
                    },
                },
                qs_taskCustomProperties: [],
                qs_taskTags: [],
            };

            const result = await smtpModule.sendReloadTaskFailureNotificationEmail(reloadParams);

            expect(result).toBeUndefined();
        });

        test('should handle email sending errors gracefully', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error')),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.smtp.host': 'smtp.company.com',
                    'Butler.emailNotification.smtp.port': 587,
                    'Butler.emailNotification.smtp.secure': false,
                    'Butler.emailNotification.smtp.auth.enable': true,
                    'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                    'Butler.emailNotification.smtp.auth.password': 'secret',
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskFailure.subject': 'Task Failed: {{taskName}}',
                    'Butler.emailNotification.reloadTaskFailure.priority': 'high',
                    'Butler.emailNotification.reloadTaskFailure.fromAddress': 'butler@company.com',
                    'Butler.emailNotification.reloadTaskFailure.bodyFileDirectory': '/templates',
                    'Butler.emailNotification.reloadTaskFailure.htmlTemplateFile': 'failure.hbs',
                    'Butler.emailNotification.reloadTaskFailure.headScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskFailure.tailScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable': false,
                };
                return configMap[key];
            });

            const reloadParams = {
                hostName: 'qlik-server',
                user: 'testuser',
                taskName: 'Test Task',
                taskId: 'test-task-id',
                appName: 'Test App',
                appId: 'test-app-id',
                scriptLog: {
                    scriptLogFull: ['line1', 'line2', 'line3'],
                },
                qs_taskMetadata: {
                    isManuallyTriggered: false,
                    isPartialReload: false,
                    maxRetries: 3,
                    modifiedByUserName: 'admin',
                    taskSessionTimeout: 600,
                    operational: {
                        nextExecution: '2025-01-01T12:00:00.000Z',
                    },
                },
                qs_taskCustomProperties: [],
                qs_taskTags: [],
            };

            const result = await smtpModule.sendReloadTaskFailureNotificationEmail(reloadParams);

            expect(result).toBeUndefined();
        });
    });

    describe('sendReloadTaskAbortedNotificationEmail', () => {
        test('should handle valid reload aborted parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.smtp.host': 'smtp.company.com',
                    'Butler.emailNotification.smtp.port': 587,
                    'Butler.emailNotification.smtp.secure': false,
                    'Butler.emailNotification.smtp.auth.enable': true,
                    'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                    'Butler.emailNotification.smtp.auth.password': 'secret',
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskAborted.enable': true,
                    'Butler.emailNotification.reloadTaskAborted.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskAborted.subject': 'Task Aborted: {{taskName}}',
                    'Butler.emailNotification.reloadTaskAborted.priority': 'high',
                    'Butler.emailNotification.reloadTaskAborted.fromAddress': 'butler@company.com',
                    'Butler.emailNotification.reloadTaskAborted.bodyFileDirectory': '/templates',
                    'Butler.emailNotification.reloadTaskAborted.htmlTemplateFile': 'aborted.hbs',
                    'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.enable': false,
                    'Butler.emailNotification.reloadTaskAborted.headScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskAborted.tailScriptLogLines': 10,
                };
                return configMap[key];
            });

            const reloadParams = {
                hostName: 'qlik-server',
                user: 'testuser',
                taskName: 'Test Task',
                taskId: 'test-task-id',
                appName: 'Test App',
                appId: 'test-app-id',
                scriptLog: {
                    scriptLogFull: ['line1', 'line2', 'line3'],
                },
                qs_taskMetadata: {
                    isManuallyTriggered: false,
                    isPartialReload: false,
                    maxRetries: 3,
                    modifiedByUserName: 'admin',
                    taskSessionTimeout: 600,
                    operational: {
                        nextExecution: '2025-01-01T12:00:00.000Z',
                    },
                },
                qs_taskCustomProperties: [],
                qs_taskTags: [],
            };

            const result = await smtpModule.sendReloadTaskAbortedNotificationEmail(reloadParams);

            expect(result).toBeUndefined();
        });
    });

    describe('sendReloadTaskSuccessNotificationEmail', () => {
        test('should handle valid reload success parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.smtp.host': 'smtp.company.com',
                    'Butler.emailNotification.smtp.port': 587,
                    'Butler.emailNotification.smtp.secure': false,
                    'Butler.emailNotification.smtp.auth.enable': true,
                    'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                    'Butler.emailNotification.smtp.auth.password': 'secret',
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskSuccess.subject': 'Task Success: {{taskName}}',
                    'Butler.emailNotification.reloadTaskSuccess.priority': 'normal',
                    'Butler.emailNotification.reloadTaskSuccess.fromAddress': 'butler@company.com',
                    'Butler.emailNotification.reloadTaskSuccess.bodyFileDirectory': '/templates',
                    'Butler.emailNotification.reloadTaskSuccess.htmlTemplateFile': 'success.hbs',
                    'Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.enable': false,
                    'Butler.emailNotification.reloadTaskSuccess.headScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskSuccess.tailScriptLogLines': 10,
                };
                return configMap[key];
            });

            const reloadParams = {
                hostName: 'qlik-server',
                user: 'testuser',
                taskName: 'Test Task',
                taskId: 'test-task-id',
                appName: 'Test App',
                appId: 'test-app-id',
                scriptLog: {
                    scriptLogFull: ['line1', 'line2', 'line3'],
                },
                qs_taskMetadata: {
                    isManuallyTriggered: false,
                    isPartialReload: false,
                    maxRetries: 3,
                    modifiedByUserName: 'admin',
                    taskSessionTimeout: 600,
                    operational: {
                        nextExecution: '2025-01-01T12:00:00.000Z',
                    },
                },
                qs_taskCustomProperties: [],
                qs_taskTags: [],
            };

            const result = await smtpModule.sendReloadTaskSuccessNotificationEmail(reloadParams);

            expect(result).toBeUndefined();
        });
    });

    describe('sendServiceMonitorNotificationEmail', () => {
        test('should handle valid service monitor parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.smtp.host': 'smtp.company.com',
                    'Butler.emailNotification.smtp.port': 587,
                    'Butler.emailNotification.smtp.secure': false,
                    'Butler.emailNotification.smtp.auth.enable': true,
                    'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                    'Butler.emailNotification.smtp.auth.password': 'secret',
                    'Butler.emailNotification.enable': true,
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.alertDestination.email.enable': true,
                    'Butler.emailNotification.serviceStopped.recipients': ['admin@company.com'],
                    'Butler.emailNotification.serviceStopped.subject': 'Service Alert: {{serviceName}}',
                    'Butler.emailNotification.serviceStopped.priority': 'high',
                    'Butler.emailNotification.serviceStopped.fromAddress': 'butler@company.com',
                    'Butler.emailNotification.serviceStopped.bodyFileDirectory': '/templates',
                    'Butler.emailNotification.serviceStopped.htmlTemplateFile': 'service.hbs',
                };
                return configMap[key];
            });

            const serviceParams = {
                host: 'qlik-server',
                serviceName: 'QlikSenseEngineService',
                serviceFriendlyName: 'Qlik Sense Engine Service',
                serviceStatus: 'STOPPED',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                    startMode: 'AUTO',
                    status: 'STOPPED',
                },
                prevState: 'RUNNING',
                currState: 'STOPPED',
                stateChanged: true,
            };

            const result = await smtpModule.sendServiceMonitorNotificationEmail(serviceParams);

            expect(result).toBeUndefined();
        });
    });

    describe('Edge cases', () => {
        test('should handle missing config values gracefully', () => {
            globalsMock.config.get.mockReturnValue(undefined);

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });

        test('should handle rate limiting', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            // Setup rate limiting by having specific configuration
            globalsMock.config.has.mockReturnValue(true);
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.smtp.host': 'smtp.company.com',
                    'Butler.emailNotification.smtp.port': 587,
                    'Butler.emailNotification.smtp.secure': false,
                    'Butler.emailNotification.smtp.auth.enable': true,
                    'Butler.emailNotification.smtp.auth.user': 'butler@company.com',
                    'Butler.emailNotification.smtp.auth.password': 'secret',
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskFailure.subject': 'Task Failed: {{taskName}}',
                    'Butler.emailNotification.reloadTaskFailure.priority': 'high',
                    'Butler.emailNotification.reloadTaskFailure.fromAddress': 'butler@company.com',
                    'Butler.emailNotification.reloadTaskFailure.bodyFileDirectory': '/templates',
                    'Butler.emailNotification.reloadTaskFailure.htmlTemplateFile': 'failure.hbs',
                    'Butler.emailNotification.reloadTaskFailure.headScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskFailure.tailScriptLogLines': 10,
                    'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.enable': false,
                };
                return configMap[key];
            });

            const reloadParams = {
                hostName: 'qlik-server',
                user: 'testuser',
                taskName: 'Test Task',
                taskId: 'test-task-id',
                appName: 'Test App',
                appId: 'test-app-id',
                scriptLog: {
                    scriptLogFull: ['line1', 'line2', 'line3'],
                },
                qs_taskMetadata: {
                    isManuallyTriggered: false,
                    isPartialReload: false,
                    maxRetries: 3,
                    modifiedByUserName: 'admin',
                    taskSessionTimeout: 600,
                    operational: {
                        nextExecution: '2025-01-01T12:00:00.000Z',
                    },
                },
                qs_taskCustomProperties: [],
                qs_taskTags: [],
            };

            // Should handle rate limiting internally
            const result = await smtpModule.sendReloadTaskFailureNotificationEmail(reloadParams);

            // The function should still attempt to send and return undefined
            expect(result).toBeUndefined();
        });
    });
});
