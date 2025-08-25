import { jest } from '@jest/globals';

// Mock external dependencies
jest.unstable_mockModule('nodemailer', () => ({
    default: {
        createTransporter: jest.fn(),
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
    },
}));

jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
    getTaskCustomPropertyValues: jest.fn(),
    isCustomPropertyValueSet: jest.fn(),
}));

jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
    default: jest.fn(),
}));

jest.unstable_mockModule('../get_qs_urls.js', () => ({
    getQlikSenseUrls: jest.fn(),
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
                'Butler.smtp.host': 'smtp.company.com',
                'Butler.smtp.port': 587,
                'Butler.smtp.secure': false,
                'Butler.smtp.auth.enable': true,
                'Butler.smtp.auth.user': 'butler@company.com',
                'Butler.smtp.auth.password': 'secret',
                'Butler.emailNotification.reloadTaskSuccess.rateLimit': 300,
                'Butler.emailNotification.reloadTaskFailure.rateLimit': 300,
                'Butler.emailNotification.reloadTaskAborted.rateLimit': 300,
                'Butler.emailNotification.serviceStopped.rateLimit': 300,
            };
            return configMap[key];
        });
        
        emailValidatorMock.validate.mockReturnValue(true);
    });

    describe('isSmtpConfigOk', () => {
        test('should return true with valid SMTP configuration', () => {
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                };
                return configMap[key];
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(true);
        });

        test('should return false when SMTP host is empty', () => {
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': '',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                };
                return configMap[key];
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });

        test('should return false when SMTP port is zero', () => {
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 0,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                };
                return configMap[key];
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });

        test('should return false when auth is enabled but user is empty', () => {
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': '',
                    'Butler.smtp.auth.password': 'secret',
                };
                return configMap[key];
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });

        test('should return false when auth is enabled but password is empty', () => {
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': '',
                };
                return configMap[key];
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(false);
        });

        test('should return true when auth is disabled', () => {
            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': false,
                    'Butler.smtp.auth.user': '',
                    'Butler.smtp.auth.password': '',
                };
                return configMap[key];
            });

            const result = smtpModule.isSmtpConfigOk();

            expect(result).toBe(true);
        });
    });

    describe('sendEmailBasic', () => {
        test('should handle invalid email addresses', async () => {
            emailValidatorMock.validate.mockReturnValue(false);

            const result = await smtpModule.sendEmailBasic(
                'sender@company.com',
                ['invalid-email'],
                'normal',
                'Test Subject',
                'Test Body'
            );

            expect(result).toBe(false);
        });

        test('should handle SMTP configuration errors', async () => {
            globalsMock.config.get.mockImplementation((key) => {
                if (key === 'Butler.smtp.host') return '';
                return 'default-value';
            });

            const result = await smtpModule.sendEmailBasic(
                'sender@company.com',
                ['valid@company.com'],
                'normal',
                'Test Subject',
                'Test Body'
            );

            expect(result).toBe(false);
        });

        test('should create transporter with correct options', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            await smtpModule.sendEmailBasic(
                'sender@company.com',
                ['recipient@company.com'],
                'normal',
                'Test Subject',
                'Test Body'
            );

            expect(nodemailerMock.createTransporter).toHaveBeenCalledWith({
                host: 'smtp.company.com',
                port: 587,
                secure: false,
                auth: {
                    user: 'butler@company.com',
                    pass: 'secret',
                },
            });
        });

        test('should handle email sending errors', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error')),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            const result = await smtpModule.sendEmailBasic(
                'sender@company.com',
                ['recipient@company.com'],
                'normal',
                'Test Subject',
                'Test Body'
            );

            expect(result).toBe(false);
        });
    });

    describe('sendEmail', () => {
        test('should handle template compilation and sending', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            const result = await smtpModule.sendEmail(
                'sender@company.com',
                ['recipient@company.com'],
                'normal',
                'Test Subject {{variable}}',
                '/path/to/templates',
                'template.hbs',
                { variable: 'value' }
            );

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });

        test('should handle template errors', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValue(new Error('Template Error')),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            const result = await smtpModule.sendEmail(
                'sender@company.com',
                ['recipient@company.com'],
                'normal',
                'Test Subject {{variable}}',
                '/path/to/templates',
                'template.hbs',
                { variable: 'value' }
            );

            expect(result).toBe(false);
        });
    });

    describe('sendReloadTaskFailureNotificationEmail', () => {
        test('should handle valid reload failure parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                    'Butler.emailNotification.reloadTaskFailure.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskFailure.subject': 'Task Failed: {{taskName}}',
                    'Butler.emailNotification.reloadTaskFailure.priority': 'high',
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
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
            };

            const result = await smtpModule.sendReloadTaskFailureNotificationEmail(reloadParams);

            expect(result).toBe(true);
        });

        test('should handle email sending errors gracefully', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error')),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                    'Butler.emailNotification.reloadTaskFailure.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskFailure.subject': 'Task Failed: {{taskName}}',
                    'Butler.emailNotification.reloadTaskFailure.priority': 'high',
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
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
            };

            const result = await smtpModule.sendReloadTaskFailureNotificationEmail(reloadParams);

            expect(result).toBe(false);
        });
    });

    describe('sendReloadTaskAbortedNotificationEmail', () => {
        test('should handle valid reload aborted parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                    'Butler.emailNotification.reloadTaskAborted.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskAborted.subject': 'Task Aborted: {{taskName}}',
                    'Butler.emailNotification.reloadTaskAborted.priority': 'high',
                    'Butler.emailNotification.reloadTaskAborted.enable': true,
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
            };

            const result = await smtpModule.sendReloadTaskAbortedNotificationEmail(reloadParams);

            expect(result).toBe(true);
        });
    });

    describe('sendReloadTaskSuccessNotificationEmail', () => {
        test('should handle valid reload success parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                    'Butler.emailNotification.reloadTaskSuccess.recipients': ['admin@company.com'],
                    'Butler.emailNotification.reloadTaskSuccess.subject': 'Task Success: {{taskName}}',
                    'Butler.emailNotification.reloadTaskSuccess.priority': 'normal',
                    'Butler.emailNotification.reloadTaskSuccess.enable': true,
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
            };

            const result = await smtpModule.sendReloadTaskSuccessNotificationEmail(reloadParams);

            expect(result).toBe(true);
        });
    });

    describe('sendServiceMonitorNotificationEmail', () => {
        test('should handle valid service monitor parameters', async () => {
            const mockTransporter = {
                sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
                use: jest.fn(),
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            globalsMock.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.smtp.host': 'smtp.company.com',
                    'Butler.smtp.port': 587,
                    'Butler.smtp.secure': false,
                    'Butler.smtp.auth.enable': true,
                    'Butler.smtp.auth.user': 'butler@company.com',
                    'Butler.smtp.auth.password': 'secret',
                    'Butler.emailNotification.serviceStopped.recipients': ['admin@company.com'],
                    'Butler.emailNotification.serviceStopped.subject': 'Service Alert: {{serviceName}}',
                    'Butler.emailNotification.serviceStopped.priority': 'high',
                    'Butler.emailNotification.serviceStopped.enable': true,
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

            expect(result).toBe(true);
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
            };
            nodemailerMock.createTransporter = jest.fn().mockReturnValue(mockTransporter);

            // Setup rate limiting by having specific configuration
            globalsMock.config.has.mockReturnValue(true);

            const reloadParams = {
                hostName: 'qlik-server',
                user: 'testuser',
                taskName: 'Test Task',
                taskId: 'test-task-id',
                appName: 'Test App',
                appId: 'test-app-id',
            };

            // Should handle rate limiting internally
            const result = await smtpModule.sendReloadTaskFailureNotificationEmail(reloadParams);

            // The function should still attempt to send
            expect(typeof result).toBe('boolean');
        });
    });
});