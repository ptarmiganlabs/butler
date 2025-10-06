import { jest } from '@jest/globals';

describe('lib/incident_mgmt/signl4', () => {
    let sendReloadTaskFailureNotification, sendReloadTaskAbortedNotification;
    let mockAxios, mockGlobals;

    // Mock rate limiter success by default
    const mockRateLimiterMemory = jest.fn().mockImplementation(() => ({
        consume: jest.fn().mockResolvedValue({ remainingHits: 0, msBeforeNext: 0 }),
    }));

    beforeAll(async () => {
        // Mock axios
        mockAxios = {
            request: jest.fn(),
        };

        // Mock globals
        mockGlobals = {
            config: {
                has: jest.fn(),
                get: jest.fn(),
            },
            logger: {
                error: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
                verbose: jest.fn(),
            },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        };

        // Mock rate-limiter-flexible
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: mockRateLimiterMemory,
        }));

        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../signl4.js');
        ({ sendReloadTaskFailureNotification, sendReloadTaskAbortedNotification } = module);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default config responses
        mockGlobals.config.has.mockImplementation((key) => {
            const configKeys = [
                'Butler.incidentTool.signl4.reloadTaskFailure',
                'Butler.incidentTool.signl4.reloadTaskFailure.enable',
                'Butler.incidentTool.signl4.url',
                'Butler.incidentTool.signl4.reloadTaskAborted',
                'Butler.incidentTool.signl4.reloadTaskAborted.enable',
                'Butler.incidentTool.signl4.reloadTaskFailure.rateLimit',
                'Butler.incidentTool.signl4.reloadTaskAborted.rateLimit',
                'Butler.incidentTool.signl4.reloadTaskFailure.severity',
                'Butler.incidentTool.signl4.reloadTaskFailure.serviceName',
                'Butler.incidentTool.signl4.reloadTaskAborted.severity',
                'Butler.incidentTool.signl4.reloadTaskAborted.serviceName',
            ];
            return configKeys.includes(key);
        });

        mockGlobals.config.get.mockImplementation((key) => {
            const configMap = {
                'Butler.incidentTool.signl4.reloadTaskFailure': {},
                'Butler.incidentTool.signl4.reloadTaskFailure.enable': true,
                'Butler.incidentTool.signl4.url': 'https://connect.signl4.com/webhook/test-team-secret',
                'Butler.incidentTool.signl4.reloadTaskAborted': {},
                'Butler.incidentTool.signl4.reloadTaskAborted.enable': true,
                'Butler.incidentTool.signl4.reloadTaskFailure.rateLimit': 300,
                'Butler.incidentTool.signl4.reloadTaskAborted.rateLimit': 300,
                'Butler.incidentTool.signl4.reloadTaskFailure.severity': 1,
                'Butler.incidentTool.signl4.reloadTaskFailure.serviceName': 'Butler Qlik Sense Reload Monitoring',
                'Butler.incidentTool.signl4.reloadTaskAborted.severity': 2,
                'Butler.incidentTool.signl4.reloadTaskAborted.serviceName': 'Butler Qlik Sense Task Monitoring',
            };
            return configMap[key];
        });

        mockAxios.request.mockResolvedValue({ status: 200, statusText: 'OK' });
    });

    describe('sendReloadTaskFailureNotification', () => {
        test('should successfully send reload task failure notification to SIGNL4', async () => {
            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for failed task notification. Task name: "Test Task"'),
            );

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://connect.signl4.com/webhook/test-team-secret',
                method: 'post',
                timeout: 10000,
                data: {
                    Title: 'Qlik Sense reload task failed',
                    Message: 'Task: Test Task',
                    Severity: 1,
                    'X-S4-Service': 'Butler Qlik Sense Reload Monitoring',
                    'X-S4-ExternalID': 'task123',
                    'X-S4-Status': 'new',
                },
                headers: { 'Content-Type': 'application/json' },
            });
        });

        test('should handle rate limiting setup for reload task failure', async () => {
            // Just test that the function runs
            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle missing configuration for reload task failure', async () => {
            // Mock missing config
            mockGlobals.config.has.mockReturnValue(false);

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Reload failure SIGNL4 config info missing in Butler config file'),
            );
        });

        test('should use default values when optional config is missing', async () => {
            // Mock partial config
            mockGlobals.config.has.mockImplementation((key) => {
                return [
                    'Butler.incidentTool.signl4.reloadTaskFailure',
                    'Butler.incidentTool.signl4.reloadTaskFailure.enable',
                    'Butler.incidentTool.signl4.url',
                ].includes(key);
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.signl4.reloadTaskFailure': {},
                    'Butler.incidentTool.signl4.reloadTaskFailure.enable': true,
                    'Butler.incidentTool.signl4.url': 'https://connect.signl4.com/webhook/test-team-secret',
                };
                return configMap[key];
            });

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://connect.signl4.com/webhook/test-team-secret',
                method: 'post',
                timeout: 10000,
                data: {
                    Title: 'Qlik Sense reload task failed',
                    Message: 'Task: Test Task',
                    Severity: 99, // Default severity
                    'X-S4-Service': 'Default service name', // Default service name
                    'X-S4-ExternalID': 'task123',
                    'X-S4-Status': 'new',
                },
                headers: { 'Content-Type': 'application/json' },
            });
        });

        test('should handle axios errors in reload task failure notification', async () => {
            mockAxios.request.mockRejectedValue(new Error('Network error'));

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('SIGNL4'));
        });

        test('should handle errors in config retrieval for reload task failure', async () => {
            // Make config.get throw an error
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Config error');
            });

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('SIGNL4:'));
        });
    });

    describe('sendReloadTaskAbortedNotification', () => {
        test('should successfully send reload task aborted notification to SIGNL4', async () => {
            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for aborted task notification. Task name: "Aborted Task"'),
            );

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://connect.signl4.com/webhook/test-team-secret',
                method: 'post',
                timeout: 10000,
                data: {
                    Title: 'Qlik Sense task aborted',
                    Message: 'Task: Aborted Task',
                    Severity: 2,
                    'X-S4-Service': 'Butler Qlik Sense Task Monitoring',
                    'X-S4-ExternalID': 'task456',
                    'X-S4-Status': 'new',
                },
                headers: { 'Content-Type': 'application/json' },
            });
        });

        test('should handle rate limiting setup for reload task aborted', async () => {
            // Just test that the function runs
            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle missing configuration for reload task aborted', async () => {
            // Mock missing config
            mockGlobals.config.has.mockReturnValue(false);

            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Reload aborted SIGNL4 config info missing in Butler config file'),
            );
        });

        test('should use default values when optional config is missing for aborted task', async () => {
            // Mock partial config
            mockGlobals.config.has.mockImplementation((key) => {
                return [
                    'Butler.incidentTool.signl4.reloadTaskAborted',
                    'Butler.incidentTool.signl4.reloadTaskAborted.enable',
                    'Butler.incidentTool.signl4.url',
                ].includes(key);
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.signl4.reloadTaskAborted': {},
                    'Butler.incidentTool.signl4.reloadTaskAborted.enable': true,
                    'Butler.incidentTool.signl4.url': 'https://connect.signl4.com/webhook/test-team-secret',
                };
                return configMap[key];
            });

            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://connect.signl4.com/webhook/test-team-secret',
                method: 'post',
                timeout: 10000,
                data: {
                    Title: 'Qlik Sense task aborted',
                    Message: 'Task: Aborted Task',
                    Severity: 99, // Default severity
                    'X-S4-Service': 'Default service name', // Default service name
                    'X-S4-ExternalID': 'task456',
                    'X-S4-Status': 'new',
                },
                headers: { 'Content-Type': 'application/json' },
            });
        });

        test('should handle axios errors in reload task aborted notification', async () => {
            mockAxios.request.mockRejectedValue(new Error('SIGNL4 network error'));

            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('SIGNL4'));
        });

        test('should handle errors in config retrieval for reload task aborted', async () => {
            // Make config.get throw an error
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Aborted config error');
            });

            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('SIGNL4:'));
        });
    });

    describe('rate limiter initialization', () => {
        test('should use default rate limit when config is missing for failure notifications', async () => {
            // Reset module to test initialization
            jest.resetModules();

            const mockGlobalsNoRateLimit = {
                ...mockGlobals,
                config: {
                    has: jest.fn().mockReturnValue(false),
                    get: jest.fn(),
                },
            };

            await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobalsNoRateLimit }));
            await jest.unstable_mockModule('rate-limiter-flexible', () => ({
                RateLimiterMemory: mockRateLimiterMemory,
            }));

            await import('../signl4.js');

            // Should have been called with default duration of 300 for both rate limiters
            expect(mockRateLimiterMemory).toHaveBeenCalledWith({
                points: 1,
                duration: 300,
            });
        });

        test('should use configured rate limit when available', async () => {
            // Reset module to test initialization
            jest.resetModules();

            const mockGlobalsWithRateLimit = {
                ...mockGlobals,
                config: {
                    has: jest.fn().mockImplementation((key) => {
                        return (
                            key === 'Butler.incidentTool.signl4.reloadTaskFailure.rateLimit' ||
                            key === 'Butler.incidentTool.signl4.reloadTaskAborted.rateLimit'
                        );
                    }),
                    get: jest.fn().mockImplementation((key) => {
                        if (key === 'Butler.incidentTool.signl4.reloadTaskFailure.rateLimit') return 600;
                        if (key === 'Butler.incidentTool.signl4.reloadTaskAborted.rateLimit') return 900;
                        return undefined;
                    }),
                },
            };

            await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobalsWithRateLimit }));
            await jest.unstable_mockModule('rate-limiter-flexible', () => ({
                RateLimiterMemory: mockRateLimiterMemory,
            }));

            await import('../signl4.js');

            // Should have been called with configured durations
            expect(mockRateLimiterMemory).toHaveBeenCalledWith({
                points: 1,
                duration: 600,
            });
            expect(mockRateLimiterMemory).toHaveBeenCalledWith({
                points: 1,
                duration: 900,
            });
        });
    });

    describe('sendSignl4 helper function edge cases', () => {
        test('should handle SIGNL4 response logging', async () => {
            const mockResponse = { status: 200, data: { success: true } };
            mockAxios.request.mockResolvedValue(mockResponse);

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(expect.stringContaining('SIGNL4: Webhook response'));
        });

        test('should handle different types of axios errors', async () => {
            // Test with error that has no message or stack
            const customError = { code: 'ECONNREFUSED', errno: -61 };
            mockAxios.request.mockRejectedValue(customError);

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('SIGNL4'));
        });
    });

    describe('configuration validation edge cases', () => {
        test('should handle enabled flag set to false for failure notifications', async () => {
            mockGlobals.config.has.mockImplementation((key) => {
                return [
                    'Butler.incidentTool.signl4.reloadTaskFailure',
                    'Butler.incidentTool.signl4.reloadTaskFailure.enable',
                    'Butler.incidentTool.signl4.url',
                ].includes(key);
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.signl4.reloadTaskFailure': {},
                    'Butler.incidentTool.signl4.reloadTaskFailure.enable': false, // Disabled
                    'Butler.incidentTool.signl4.url': 'https://connect.signl4.com/webhook/test-team-secret',
                };
                return configMap[key];
            });

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Should still process the notification since the config check only verifies presence
            expect(mockAxios.request).toHaveBeenCalled();
        });

        test('should handle missing URL configuration', async () => {
            mockGlobals.config.has.mockImplementation((key) => {
                return ['Butler.incidentTool.signl4.reloadTaskAborted', 'Butler.incidentTool.signl4.reloadTaskAborted.enable'].includes(
                    key,
                );
            });

            const reloadParams = {
                taskId: 'task456',
                taskName: 'Aborted Task',
            };

            sendReloadTaskAbortedNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Reload aborted SIGNL4 config info missing in Butler config file'),
            );
        });

        test('should handle null configuration values', async () => {
            mockGlobals.config.has.mockImplementation((key) => {
                return [
                    'Butler.incidentTool.signl4.reloadTaskFailure',
                    'Butler.incidentTool.signl4.reloadTaskFailure.enable',
                    'Butler.incidentTool.signl4.url',
                ].includes(key);
            });
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.signl4.reloadTaskFailure': {},
                    'Butler.incidentTool.signl4.reloadTaskFailure.enable': true,
                    'Butler.incidentTool.signl4.url': 'https://connect.signl4.com/webhook/test-team-secret',
                    'Butler.incidentTool.signl4.reloadTaskFailure.severity': null,
                    'Butler.incidentTool.signl4.reloadTaskFailure.serviceName': null,
                };
                return configMap[key];
            });

            const reloadParams = {
                taskId: 'task123',
                taskName: 'Test Task',
            };

            sendReloadTaskFailureNotification(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            // When has() returns false for optional config, defaults are used
            // but since 'severity' and 'serviceName' have 'has()' return true, they get the direct value
            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://connect.signl4.com/webhook/test-team-secret',
                method: 'post',
                timeout: 10000,
                data: {
                    Title: 'Qlik Sense reload task failed',
                    Message: 'Task: Test Task',
                    Severity: 99, // Default because has() returns false for this key
                    'X-S4-Service': 'Default service name', // Default because has() returns false for this key
                    'X-S4-ExternalID': 'task123',
                    'X-S4-Status': 'new',
                },
                headers: { 'Content-Type': 'application/json' },
            });
        });
    });
});
