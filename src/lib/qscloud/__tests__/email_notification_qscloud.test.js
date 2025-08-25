import { jest } from '@jest/globals';

describe('lib/qscloud/email_notification_qscloud', () => {
    let sendQlikSenseCloudAppReloadFailureNotificationEmail;
    
    const mockGlobals = {
        config: {
            has: jest.fn(),
            get: jest.fn(),
        },
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        },
    };

    const mockGetQlikSenseCloudUserInfo = jest.fn();
    const mockGetQlikSenseCloudUrls = jest.fn();
    const mockSendEmail = jest.fn();
    const mockIsSmtpConfigOk = jest.fn();
    const mockGetQlikSenseCloudAppReloadScriptLogHead = jest.fn();
    const mockGetQlikSenseCloudAppReloadScriptLogTail = jest.fn();

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../api/user.js', () => ({ 
            getQlikSenseCloudUserInfo: mockGetQlikSenseCloudUserInfo 
        }));
        await jest.unstable_mockModule('../util.js', () => ({ 
            getQlikSenseCloudUrls: mockGetQlikSenseCloudUrls 
        }));
        await jest.unstable_mockModule('../../qseow/smtp.js', () => ({ 
            sendEmail: mockSendEmail,
            isSmtpConfigOk: mockIsSmtpConfigOk 
        }));
        await jest.unstable_mockModule('../api/appreloadinfo.js', () => ({ 
            getQlikSenseCloudAppReloadScriptLogHead: mockGetQlikSenseCloudAppReloadScriptLogHead,
            getQlikSenseCloudAppReloadScriptLogTail: mockGetQlikSenseCloudAppReloadScriptLogTail 
        }));

        const module = await import('../email_notification_qscloud.js');
        ({ sendQlikSenseCloudAppReloadFailureNotificationEmail } = module);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockGlobals.config.has.mockReturnValue(true);
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') return true;
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients') return ['test@example.com'];
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert') return { enable: false };
            return 'default-value';
        });

        mockGetQlikSenseCloudUserInfo.mockResolvedValue({
            id: 'user123',
            name: 'Test User',
            email: 'user@example.com'
        });

        mockGetQlikSenseCloudUrls.mockReturnValue({
            qmcUrl: 'https://tenant.qlikcloud.com/qmc',
            hubUrl: 'https://tenant.qlikcloud.com/hub'
        });

        mockIsSmtpConfigOk.mockReturnValue(true);
        mockSendEmail.mockResolvedValue(true);
        mockGetQlikSenseCloudAppReloadScriptLogHead.mockReturnValue('Script log head');
        mockGetQlikSenseCloudAppReloadScriptLogTail.mockReturnValue('Script log tail');
    });

    describe('sendQlikSenseCloudAppReloadFailureNotificationEmail', () => {
        const basicReloadParams = {
            tenantId: 'tenant123',
            tenantComment: 'Test tenant',
            tenantUrl: 'https://tenant.qlikcloud.com',
            userId: 'user123',
            ownerId: 'owner123',
            appId: 'app123',
            appName: 'Test App',
            appUrl: 'https://tenant.qlikcloud.com/app/app123',
            appInfo: { attributes: { description: 'Test app' } },
            appItems: { 
                meta: { tags: [] },
                resourceSize: { appFile: 1024000 }
            },
            reloadInfo: {
                errorCode: 500,
                errorMessage: 'Script error',
                log: 'Detailed error log'
            },
            scriptLog: {
                scriptLogFull: ['Line 1', 'Line 2']
            }
        };

        test('should return 1 when email notifications are disabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') return false;
                return 'default';
            });

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(basicReloadParams);

            expect(result).toBe(1);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Email alerts on failed reloads are disabled')
            );
        });

        test('should handle missing config and return 1', async () => {
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Config error');
            });

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(basicReloadParams);

            expect(result).toBe(1);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('EMAIL ALERT - APP RELOAD FAILED: Error: Config error')
            );
        });

        test('should return false when no email addresses found', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients') return [];
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert') return { enable: false };
                return 'default';
            });

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(basicReloadParams);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('No email addresses found to send alert email')
            );
        });

        test('should return false when SMTP config is invalid', async () => {
            mockIsSmtpConfigOk.mockReturnValue(false);

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(basicReloadParams);

            expect(result).toBe(false);
        });

        test('should handle scriptLog as false', async () => {
            const reloadParamsNoLog = {
                ...basicReloadParams,
                scriptLog: false
            };

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParamsNoLog);

            expect(result).toBe(true);
            expect(mockGetQlikSenseCloudAppReloadScriptLogHead).not.toHaveBeenCalled();
        });

        test('should handle undefined reloadInfo.log', async () => {
            const reloadParamsNoLog = {
                ...basicReloadParams,
                reloadInfo: {
                    ...basicReloadParams.reloadInfo,
                    log: undefined
                }
            };

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(reloadParamsNoLog);

            expect(result).toBe(true);
        });

        test('should handle generic URLs gracefully', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.genericUrls') return undefined;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients') return ['test@example.com'];
                return 'default';
            });

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(basicReloadParams);

            expect(result).toBe(true);
        });

        test('should handle errors in main execution', async () => {
            mockGetQlikSenseCloudUserInfo.mockRejectedValue(new Error('API Error'));

            const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(basicReloadParams);

            expect(result).toBe(true);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('EMAIL ALERT - APP RELOAD FAILED: Error: API Error')
            );
        });
    });
});