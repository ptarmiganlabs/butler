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

    test('returns false when tag gating is enabled and app lacks the tag (no recipients)', async () => {
        const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail(params);

        expect(result).toBe(false);
        expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('No email addresses found to send alert email'));
        expect(mockSendEmail).not.toHaveBeenCalled();
    });

    test('sends to the configured recipients when tag gating is enabled and the app tags could not be read', async () => {
        // appItems is undefined when the app reload handler could not get the app items, or they did not match the app.
        // The app may have the tag, so the alert email is sent rather than lost.
        const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail({ ...params, appItems: undefined });
        // Alert emails are sent once the rate limiter lets them through
        await new Promise((r) => setImmediate(r));

        expect(result).toBe(true);
        expect(mockGlobals.logger.error).not.toHaveBeenCalled();
        expect(mockGlobals.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining(
                'Could not get the tags of app [app1] "App 1", as its app items could not be read or did not match the app. Sending alert email to the configured recipients anyway, in case the app has the tag "notify".',
            ),
        );
        expect(mockSendEmail).toHaveBeenCalledTimes(1);
        expect(mockSendEmail.mock.calls[0][1]).toEqual(['sys@example.com']);
    });

    test('also sends the app owner alert when tag gating is enabled and the app tags could not be read', async () => {
        const getConfig = mockGlobals.config.get.getMockImplementation();
        mockGlobals.config.get.mockImplementation((key) =>
            key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.emailNotification.reloadAppFailure.appOwnerAlert'
                ? { enable: true, includeOwner: { includeAll: true } }
                : getConfig(key),
        );

        // Another app than in the test above, so the rate limiter lets the email to sys@example.com through
        const result = await sendQlikSenseCloudAppReloadFailureNotificationEmail({ ...params, appId: 'app2', appItems: undefined });
        await new Promise((r) => setImmediate(r));

        expect(result).toBe(true);
        expect(mockGlobals.logger.error).not.toHaveBeenCalled();
        const recipients = mockSendEmail.mock.calls.map(([, to]) => to).flat();
        expect(recipients.sort()).toEqual(['owner@example.com', 'sys@example.com']);
    });
});
