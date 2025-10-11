import { jest } from '@jest/globals';

describe('lib/qscloud/email_notification_qscloud (tag gating)', () => {
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
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    const mockGetQlikSenseCloudUserInfo = jest.fn();
    const mockGetQlikSenseCloudUrls = jest.fn();
    const mockSendEmail = jest.fn();
    const mockIsSmtpConfigOk = jest.fn();

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../api/user.js', () => ({
            getQlikSenseCloudUserInfo: mockGetQlikSenseCloudUserInfo,
        }));
        await jest.unstable_mockModule('../util.js', () => ({ getQlikSenseCloudUrls: mockGetQlikSenseCloudUrls }));
        await jest.unstable_mockModule('../../qseow/smtp/index.js', () => ({
            sendEmail: mockSendEmail,
            isSmtpConfigOk: mockIsSmtpConfigOk,
        }));

        const module = await import('../email_notification_qscloud.js');
        ({ sendQlikSenseCloudAppReloadFailureNotificationEmail } = module);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockGlobals.config.has.mockReturnValue(true);
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.enable') return true;
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.recipients')
                return ['sys@example.com'];
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert')
                return { enable: false };
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.enable')
                return true; // tag gating enabled
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.alertEnableByTag.tag')
                return 'notify';
            return 'default';
        });

        mockGetQlikSenseCloudUserInfo.mockResolvedValue({
            id: 'owner123',
            name: 'Owner User',
            email: 'owner@example.com',
        });

        mockGetQlikSenseCloudUrls.mockReturnValue({
            qmcUrl: 'https://tenant.qlikcloud.com/qmc',
            hubUrl: 'https://tenant.qlikcloud.com/hub',
        });

        mockIsSmtpConfigOk.mockReturnValue(true);
        mockSendEmail.mockResolvedValue(true);
    });

    test('returns false when tag gating is enabled and app lacks the tag (no recipients)', async () => {
        const params = {
            tenantId: 't',
            tenantComment: 'c',
            tenantUrl: 'https://tenant.qlikcloud.com',
            userId: 'u',
            ownerId: 'owner123',
            appId: 'app1',
            appName: 'App 1',
            appUrl: 'https://tenant.qlikcloud.com/app/app1',
            appInfo: { attributes: {} },
            appItems: { meta: { tags: [] }, resourceSize: { appFile: 42 } },
            reloadInfo: { errorCode: 1, errorMessage: 'err', log: 'log' },
            scriptLog: { scriptLogFull: ['a', 'b'] },
        };

        const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(params);

        expect(result).toBe(false);
        expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('No email addresses found to send alert email'));
        expect(mockSendEmail).not.toHaveBeenCalled();
    });
});
