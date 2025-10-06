import { jest } from '@jest/globals';

describe('qscloud/msteams_notification_qscloud', () => {
    let sendQlikSenseCloudAppReloadFailureNotificationTeams;
    let mockFs;
    let mockWebhook;
    let mockHandlebars;
    let mockRateLimiterMemory;
    let mockGetQlikSenseCloudUserInfo;
    let mockGetQlikSenseCloudAppInfo;
    let mockGetQlikSenseCloudUrls;
    let mockGetQlikSenseCloudAppReloadScriptLogHead;
    let mockGetQlikSenseCloudAppReloadScriptLogTail;
    let mockConsume;
    let mockCompile;
    let mockCompiledTemplate;

    const mockGlobals = {
        config: {
            get: jest.fn(),
            has: jest.fn(),
        },
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            verbose: jest.fn(),
            debug: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        mockFs = {
            existsSync: jest.fn(() => true),
            readFileSync: jest.fn(() => 'Mock template content: {{appName}} failed'),
        };

        mockWebhook = {
            sendMessage: jest.fn(() => Promise.resolve({ status: 200, statusText: 'OK', data: 'success' })),
        };

        // Reset consume mock to default successful behavior
        mockConsume = jest.fn(() => Promise.resolve({ totalHits: 1, remainingPoints: 0 }));

        mockRateLimiterMemory = jest.fn(() => ({
            consume: mockConsume,
        }));

        // Set up basic config that rate limiter needs BEFORE module import
        mockGlobals.config.has.mockImplementation((path) => {
            // Provide the rate limit config that the module looks for at startup
            if (path === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') {
                return true;
            }
            return false;
        });
        mockGlobals.config.get.mockImplementation((path) => {
            if (path === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') {
                return 300; // 5 minutes in seconds
            }
            return undefined;
        });

        mockCompiledTemplate = jest.fn(() => '{"type": "message", "text": "Rendered message content"}');
        mockCompile = jest.fn(() => mockCompiledTemplate);

        mockHandlebars = {
            compile: mockCompile,
            registerHelper: jest.fn(),
        };

        mockGetQlikSenseCloudUserInfo = jest.fn(() =>
            Promise.resolve({
                id: 'user123',
                name: 'Test User',
                email: 'test@example.com',
            }),
        );

        mockGetQlikSenseCloudAppInfo = jest.fn(() =>
            Promise.resolve({
                id: 'app123',
                name: 'Test App',
            }),
        );

        mockGetQlikSenseCloudUrls = jest.fn(() => ({
            qlikSenseQMC: 'https://tenant.qlikcloud.com/qmc',
            qlikSenseHub: 'https://tenant.qlikcloud.com/hub',
        }));

        mockGetQlikSenseCloudAppReloadScriptLogHead = jest.fn(() => 'Script log head content');
        mockGetQlikSenseCloudAppReloadScriptLogTail = jest.fn(() => 'Script log tail content');

        // Setup module mocks
        await jest.unstable_mockModule('fs', () => ({ default: mockFs }));
        await jest.unstable_mockModule('ms-teams-wrapper', () => ({
            Webhook: jest.fn(() => mockWebhook),
            SimpleTextCard: jest.fn(),
        }));
        await jest.unstable_mockModule('handlebars', () => ({ default: mockHandlebars }));
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: mockRateLimiterMemory,
        }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../api/user.js', () => ({
            getQlikSenseCloudUserInfo: mockGetQlikSenseCloudUserInfo,
        }));
        await jest.unstable_mockModule('../api/app.js', () => ({
            getQlikSenseCloudAppInfo: mockGetQlikSenseCloudAppInfo,
        }));
        await jest.unstable_mockModule('../util.js', () => ({
            getQlikSenseCloudUrls: mockGetQlikSenseCloudUrls,
        }));
        await jest.unstable_mockModule('../api/appreloadinfo.js', () => ({
            getQlikSenseCloudAppReloadScriptLogHead: mockGetQlikSenseCloudAppReloadScriptLogHead,
            getQlikSenseCloudAppReloadScriptLogTail: mockGetQlikSenseCloudAppReloadScriptLogTail,
        }));

        // Import the module after mocking dependencies - FRESH IMPORT FOR EACH TEST
        jest.resetModules(); // Clear module cache
        const module = await import('../msteams_notification_qscloud.js');
        sendQlikSenseCloudAppReloadFailureNotificationTeams = module.sendQlikSenseCloudAppReloadFailureNotificationTeams;
    });

    const createMockReloadParams = () => ({
        reloadId: 'reload123',
        appId: 'app123',
        appName: 'Test App',
        ownerId: 'user123',
        tenantId: 'tenant123',
        tenantComment: 'Test tenant',
        tenantUrl: 'https://tenant.qlikcloud.com',
        userId: 'user123',
        appUrl: 'https://tenant.qlikcloud.com/sense/app/app123',

        // Add missing numeric fields that get .toLocaleString() called on them
        peakMemoryBytes: 1024000,
        rowLimit: 50000,
        duration: 120,
        sizeMemory: 5120000,
        statements: 25,
        status: 'Failed',
        endedWithMemoryConstraint: false,
        isDirectQueryMode: false,
        isPartialReload: false,
        isSessionApp: false,
        isSkipStore: false,
        reloadTrigger: 'Manual',
        source: 'QMC',
        eventType: 'reload.failed',
        eventTypeVersion: '1.0',

        appInfo: {
            attributes: {
                description: 'Test app description',
                hasSectionAccess: false,
                published: true,
                publishTime: '2023-01-01T00:00:00Z',
                thumbnail: 'thumbnail_data_here',
            },
        },

        appItems: {
            resourceSize: {
                appFile: 2048000,
            },
        },

        reloadInfo: {
            errorCode: 'E001',
            errorMessage: 'Test error message',
            log: 'Detailed reload log',
            executionDuration: 300,
            executionStartTime: '2023-01-01T10:00:00Z',
            executionStopTime: '2023-01-01T10:05:00Z',
            status: 'Failed',
        },

        scriptLog: {
            scriptLogFull: ['Starting reload', 'Loading data', 'Processing tables', 'Reload completed successfully'],
        },
    });

    describe('sendQlikSenseCloudAppReloadFailureNotificationTeams', () => {
        test('should not send notification when Teams notifications are disabled', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return false;
                return undefined;
            });

            const reloadParams = createMockReloadParams();

            const result = sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for promise chain to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Reload failure Teams notifications are disabled'),
            );
        });

        test('should not send notification with invalid message type', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType')
                    return 'invalid';
                return undefined;
            });

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for promise chain to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid Teams message type: invalid'));
        });

        test('should send basic Teams message successfully', async () => {
            // Mock all config calls to return appropriate values
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'App {{appName}} failed to reload';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for rate limiter and async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockConsume).toHaveBeenCalledWith('reload123', 1);
            expect(mockGetQlikSenseCloudUserInfo).toHaveBeenCalledWith('user123');
            expect(mockGetQlikSenseCloudUrls).toHaveBeenCalled();
            expect(mockHandlebars.compile).toHaveBeenCalledWith('App {{appName}} failed to reload');
            expect(mockWebhook.sendMessage).toHaveBeenCalled();
        });

        test('should send formatted Teams message with template file', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType')
                    return 'formatted';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template.hbs';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'Basic template';
                if (key === 'Butler.genericUrls') return [{ name: 'Generic URL', url: 'https://example.com' }];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);

            // Mock user info for template file test
            mockGetQlikSenseCloudUserInfo.mockResolvedValue({ name: 'Test User' });

            const reloadParams = createMockReloadParams();

            const result = sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for rate limiter and async operations - significant timeout for fire-and-forget async sendTeams call
            await new Promise((resolve) => setTimeout(resolve, 500));

            expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/template.hbs');
            expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/template.hbs', 'utf8');
            expect(mockHandlebars.compile).toHaveBeenCalledWith('Mock template content: {{appName}} failed');
            expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('eq', expect.any(Function));
            expect(mockWebhook.sendMessage).toHaveBeenCalled();
        });

        test('should handle missing template file gracefully', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType')
                    return 'formatted';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/missing/template.hbs';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'Basic template';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);
            mockFs.existsSync.mockReturnValue(false);

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for rate limiter and async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockFs.existsSync).toHaveBeenCalledWith('/missing/template.hbs');
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not open Teams template file'));
        });

        test('should handle rate limiting', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'App {{appName}} failed to reload';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);
            mockConsume.mockRejectedValue({ totalHits: 2, remainingPoints: 0 });

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for rate limiter
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting failed. Not sending reload notification Teams'),
            );
            expect(mockWebhook.sendMessage).not.toHaveBeenCalled();
        });

        test('should handle script log truncation for head content', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'App {{appName}} failed';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);

            // Mock very long script log head content
            const longContent = 'a'.repeat(3500);
            mockGetQlikSenseCloudAppReloadScriptLogHead.mockReturnValue(longContent);

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('TEAMS: Script log head field is too long'));
        });

        test('should handle script log truncation for tail content', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'App {{appName}} failed';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);

            // Mock very long script log tail content
            const longContent = 'b'.repeat(3500);
            mockGetQlikSenseCloudAppReloadScriptLogTail.mockReturnValue(longContent);

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('TEAMS: Script log head field is too long'));
        });

        test('should handle empty script log', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'App {{appName}} failed';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);

            const reloadParams = createMockReloadParams();
            reloadParams.scriptLog = {
                scriptLogFull: [], // Empty script log
            };

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            // For empty script logs, the script log functions should NOT be called (per code logic)
            expect(mockGetQlikSenseCloudAppReloadScriptLogHead).not.toHaveBeenCalled();
            expect(mockGetQlikSenseCloudAppReloadScriptLogTail).not.toHaveBeenCalled();
            // But the webhook should still be called for the basic message
            expect(mockWebhook.sendMessage).toHaveBeenCalled();
        });

        test('should handle false script log', async () => {
            mockGlobals.config.get
                .mockReturnValueOnce(true) // Teams enabled
                .mockReturnValueOnce('basic') // Message type
                .mockReturnValueOnce('https://webhook.url') // Webhook URL
                .mockReturnValueOnce('basic') // Message type (repeated)
                .mockReturnValueOnce('/path/to/template') // Template file
                .mockReturnValueOnce(10) // Head script log lines
                .mockReturnValueOnce(10) // Tail script log lines
                .mockReturnValueOnce(300) // Rate limit
                .mockReturnValueOnce('App {{appName}} failed') // Basic message template
                .mockReturnValueOnce([]) // Generic URLs
                .mockReturnValueOnce(10) // Head script log lines (repeated)
                .mockReturnValueOnce(10); // Tail script log lines (repeated)

            mockGlobals.config.has.mockReturnValue(true);

            const reloadParams = createMockReloadParams();
            reloadParams.scriptLog = false; // Script log unavailable

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Should not call script log functions when scriptLog is false
            expect(mockGetQlikSenseCloudAppReloadScriptLogHead).not.toHaveBeenCalled();
            expect(mockGetQlikSenseCloudAppReloadScriptLogTail).not.toHaveBeenCalled();
        });

        test('should handle undefined app owner', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'User: {{userName}}';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);
            mockGetQlikSenseCloudUserInfo.mockResolvedValue(undefined);

            const reloadParams = createMockReloadParams();

            const result = sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations - significant timeout for fire-and-forget async sendTeams call
            await new Promise((resolve) => setTimeout(resolve, 500));

            expect(mockCompiledTemplate).toHaveBeenCalledWith(
                expect.objectContaining({
                    userName: 'Unknown',
                }),
            );
        });

        test('should handle webhook sending error', async () => {
            // Setup specific config for this test
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') return true;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType') return 'basic';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL')
                    return 'https://webhook.url';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile')
                    return '/path/to/template';
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines')
                    return 10;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit') return 300;
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate')
                    return 'App {{appName}} failed';
                if (key === 'Butler.genericUrls') return [];
                return undefined;
            });

            mockGlobals.config.has.mockReturnValue(true);
            mockWebhook.sendMessage.mockRejectedValue(new Error('Webhook failed'));

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('TEAMS SEND: Webhook failed'));
        });

        test('should handle configuration error', async () => {
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Config error');
            });

            const reloadParams = createMockReloadParams();

            sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParams);

            // Wait for async operations
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('TEAMS ALERT - APP RELOAD FAILED: Config error'));
        });

        test('should use default rate limiter when config missing', async () => {
            // Reset the module to test rate limiter initialization
            jest.resetModules();

            // Mock config.has to return false for rate limit config
            const mockGlobalsNoRateLimit = {
                ...mockGlobals,
                config: {
                    get: jest.fn(),
                    has: jest.fn(() => false), // No rate limit config
                },
            };

            await jest.unstable_mockModule('../../../globals.js', () => ({
                default: mockGlobalsNoRateLimit,
            }));

            // Re-import module to trigger rate limiter initialization
            await import('../msteams_notification_qscloud.js');

            // Verify RateLimiterMemory was called with default duration
            expect(mockRateLimiterMemory).toHaveBeenCalledWith({
                points: 1,
                duration: 300, // Default duration
            });
        });
    });
});
