/* eslint-disable import/no-dynamic-require */
import { jest } from '@jest/globals';

describe('email_notification_qscloud', () => {
    let emailNotificationQscloud;
    let mockGlobals;
    let mockGetQlikSenseCloudUserInfo;
    let mockGetQlikSenseCloudAppInfo;
    let mockGetQlikSenseCloudUrls;
    let mockSendEmail;
    let mockIsSmtpConfigOk;
    let mockGetQlikSenseCloudAppReloadScriptLogHead;
    let mockGetQlikSenseCloudAppReloadScriptLogTail;

    const mockConfig = {
        has: jest.fn(),
        get: jest.fn(),
    };

    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
    };

    beforeAll(async () => {
        // Mock globals
        mockGlobals = {
            config: mockConfig,
            logger: mockLogger,
        };

        // Mock dependencies
        await jest.unstable_mockModule('../../../globals.js', () => ({
            default: mockGlobals,
        }));

        await jest.unstable_mockModule('../api/user.js', () => ({
            getQlikSenseCloudUserInfo: jest.fn(),
        }));

        await jest.unstable_mockModule('../api/app.js', () => ({
            getQlikSenseCloudAppInfo: jest.fn(),
        }));

        await jest.unstable_mockModule('../util.js', () => ({
            getQlikSenseCloudUrls: jest.fn(),
        }));

        await jest.unstable_mockModule('../../qseow/smtp.js', () => ({
            sendEmail: jest.fn(),
            isSmtpConfigOk: jest.fn(),
        }));

        await jest.unstable_mockModule('../api/appreloadinfo.js', () => ({
            getQlikSenseCloudAppReloadScriptLogHead: jest.fn(),
            getQlikSenseCloudAppReloadScriptLogTail: jest.fn(),
        }));

        // Import the modules after mocking
        const userModule = await import('../api/user.js');
        const appModule = await import('../api/app.js');
        const utilModule = await import('../util.js');
        const smtpModule = await import('../../qseow/smtp.js');
        const appreloadinfoModule = await import('../api/appreloadinfo.js');

        mockGetQlikSenseCloudUserInfo = userModule.getQlikSenseCloudUserInfo;
        mockGetQlikSenseCloudAppInfo = appModule.getQlikSenseCloudAppInfo;
        mockGetQlikSenseCloudUrls = utilModule.getQlikSenseCloudUrls;
        mockSendEmail = smtpModule.sendEmail;
        mockIsSmtpConfigOk = smtpModule.isSmtpConfigOk;
        mockGetQlikSenseCloudAppReloadScriptLogHead = appreloadinfoModule.getQlikSenseCloudAppReloadScriptLogHead;
        mockGetQlikSenseCloudAppReloadScriptLogTail = appreloadinfoModule.getQlikSenseCloudAppReloadScriptLogTail;

        // Import the module under test
        emailNotificationQscloud = await import('../email_notification_qscloud.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset default config responses
        mockConfig.has.mockReturnValue(true);
        mockConfig.get.mockImplementation((key) => {
            const configMap = {
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.rateLimit': 300,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable': true,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert': {
                    enable: true,
                    includeOwner: { includeAll: true },
                    excludeOwner: { user: [] }
                },
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable': false,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.tag': 'email-alert',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.headScriptLogLines': 10,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.tailScriptLogLines': 10,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.priority': 'high',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.subject': 'QS Cloud App Reload Failed',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.bodyFileDirectory': './templates',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.htmlTemplateFile': 'email.html',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.fromAddress': 'butler@company.com',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients': ['admin@company.com'],
                'Butler.genericUrls': [{ id: 'company', url: 'https://company.com' }]
            };
            return configMap[key];
        });

        mockGetQlikSenseCloudUrls.mockReturnValue({
            qmcUrl: 'https://tenant.qlikcloud.com/qmc',
            hubUrl: 'https://tenant.qlikcloud.com/hub'
        });

        mockGetQlikSenseCloudUserInfo.mockResolvedValue({
            id: 'user123',
            name: 'John Doe',
            email: 'john.doe@company.com',
            picture: 'https://avatar.url'
        });

        mockIsSmtpConfigOk.mockReturnValue(true);
        mockSendEmail.mockResolvedValue(true);

        mockGetQlikSenseCloudAppReloadScriptLogHead.mockReturnValue('Script log head content');
        mockGetQlikSenseCloudAppReloadScriptLogTail.mockReturnValue('Script log tail content');
    });

    describe('sendQlikSenseCloudAppReloadFailureNotificationEmail', () => {
        const defaultReloadParams = {
            tenantId: 'tenant123',
            tenantComment: 'Test tenant',
            tenantUrl: 'https://tenant.qlikcloud.com',
            userId: 'user123',
            ownerId: 'owner123',
            appId: 'app123',
            appName: 'Test App',
            appUrl: 'https://tenant.qlikcloud.com/app/app123',
            appInfo: {
                attributes: {
                    description: 'Test app description',
                    hasSectionAccess: false,
                    published: true,
                    publishTime: '2023-01-01T00:00:00Z',
                    thumbnail: 'thumbnail.png'
                }
            },
            appItems: {
                meta: {
                    tags: []
                },
                resourceSize: {
                    appFile: 1024000
                }
            },
            reloadTrigger: 'manual',
            source: 'hub',
            eventType: 'app-reload-finished',
            eventTypeVersion: '1.0',
            endedWithMemoryConstraint: false,
            isDirectQueryMode: false,
            isPartialReload: false,
            isSessionApp: false,
            isSkipStore: false,
            peakMemoryBytes: 50000000,
            reloadId: 'reload123',
            rowLimit: 10000,
            statements: 100,
            status: 'failed',
            duration: 300,
            sizeMemory: 25000000,
            reloadInfo: {
                errorCode: 500,
                errorMessage: 'Script error',
                log: 'Detailed error log',
                executionDuration: 250,
                executionStartTime: '2023-01-01T10:00:00Z',
                executionStopTime: '2023-01-01T10:04:10Z',
                status: 'Failed'
            },
            scriptLog: {
                scriptLogFull: ['Line 1 of script log', 'Line 2 of script log', 'Error occurred']
            }
        };

        test('should successfully send email notification when all conditions are met', async () => {
            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(true);
            expect(mockGetQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner123');
            expect(mockIsSmtpConfigOk).toHaveBeenCalled();
            expect(mockSendEmail).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for failed task notification')
            );
        });

        test('should return 1 when email notifications are disabled', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') {
                    return false;
                }
                return mockConfig.get.mockReturnValue();
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Email alerts on failed reloads are disabled')
            );
        });

        test('should handle missing config gracefully', async () => {
            mockConfig.get.mockImplementation(() => {
                throw new Error('Config key not found');
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('EMAIL ALERT - APP RELOAD FAILED: Error: Config key not found')
            );
        });

        test('should only send email for apps with specific tag when tag filtering is enabled', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable': true,
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.tag': 'email-alert',
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients': ['admin@company.com'],
                };
                return configMap[key] || true;
            });

            const reloadParamsWithTag = {
                ...defaultReloadParams,
                appItems: {
                    meta: {
                        tags: [{ name: 'email-alert' }]
                    },
                    resourceSize: { appFile: 1024000 }
                }
            };

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParamsWithTag);

            expect(result).toBe(true);
            expect(mockSendEmail).toHaveBeenCalled();
        });

        test('should not send email when app lacks required tag and tag filtering is enabled', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable': true,
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.tag': 'email-alert',
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients': ['admin@company.com'],
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert': {
                        enable: false
                    }
                };
                return configMap[key] || true;
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('does not have the tag "email-alert" set')
            );
        });

        test('should handle app owner without email address', async () => {
            mockGetQlikSenseCloudUserInfo.mockResolvedValue({
                id: 'user123',
                name: 'John Doe',
                email: '', // Empty email
                picture: 'https://avatar.url'
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(true);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('App owner email address is not set')
            );
        });

        test('should exclude app owners from exclusion list', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert': {
                        enable: true,
                        includeOwner: { includeAll: true },
                        excludeOwner: { 
                            user: [{ email: 'john.doe@company.com' }] 
                        }
                    },
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients': []
                };
                return configMap[key] || true;
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('No email addresses found to send alert email')
            );
        });

        test('should return false when SMTP config is invalid', async () => {
            mockIsSmtpConfigOk.mockReturnValue(false);

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(false);
            expect(mockSendEmail).not.toHaveBeenCalled();
        });

        test('should handle script log processing when scriptLog is false', async () => {
            const reloadParamsNoLog = {
                ...defaultReloadParams,
                scriptLog: false
            };

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParamsNoLog);

            expect(result).toBe(true);
            expect(mockGetQlikSenseCloudAppReloadScriptLogHead).not.toHaveBeenCalled();
            expect(mockGetQlikSenseCloudAppReloadScriptLogTail).not.toHaveBeenCalled();
        });

        test('should handle empty script log arrays', async () => {
            const reloadParamsEmptyLog = {
                ...defaultReloadParams,
                scriptLog: {
                    scriptLogFull: []
                }
            };

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParamsEmptyLog);

            expect(result).toBe(true);
        });

        test('should handle missing generic URLs config', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.genericUrls') {
                    return undefined;
                }
                return true;
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(true);
        });

        test('should handle app owner include list properly', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert': {
                        enable: true,
                        includeOwner: { 
                            includeAll: false,
                            user: [{ email: 'john.doe@company.com' }]
                        },
                        excludeOwner: { user: [] }
                    },
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients': []
                };
                return configMap[key] || true;
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(true);
            expect(mockSendEmail).toHaveBeenCalled();
        });

        test('should handle errors in main execution', async () => {
            mockGetQlikSenseCloudUserInfo.mockRejectedValue(new Error('API Error'));

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(true);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('EMAIL ALERT - APP RELOAD FAILED: Error: API Error')
            );
        });

        test('should handle undefined reloadInfo.log gracefully', async () => {
            const reloadParamsNoLog = {
                ...defaultReloadParams,
                reloadInfo: {
                    ...defaultReloadParams.reloadInfo,
                    log: undefined
                }
            };

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParamsNoLog);

            expect(result).toBe(true);
        });

        test('should remove duplicate email addresses from send list', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients': ['john.doe@company.com', 'admin@company.com'],
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert': {
                        enable: true,
                        includeOwner: { includeAll: true },
                        excludeOwner: { user: [] }
                    }
                };
                return configMap[key] || true;
            });

            const result = await emailNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationEmail(defaultReloadParams);

            expect(result).toBe(true);
            expect(mockSendEmail).toHaveBeenCalledTimes(2); // Only 2 unique emails
        });
    });
});