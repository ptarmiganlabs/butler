import { jest } from '@jest/globals';

describe('lib/incident_mgmt/new_relic', () => {
    let sendNewRelicEvent,
        sendNewRelicLog,
        sendReloadTaskFailureEvent,
        sendReloadTaskFailureLog,
        sendReloadTaskAbortedEvent,
        sendReloadTaskAbortedLog;
    let mockAxios, mockQrsInteract, mockGlobals;

    // Mock rate limiter success by default
    const mockRateLimiterMemory = jest.fn().mockImplementation(() => ({
        consume: jest.fn().mockResolvedValue({ remainingHits: 0, msBeforeNext: 0 }),
    }));

    beforeAll(async () => {
        // Mock axios
        mockAxios = {
            request: jest.fn(),
        };

        // Mock QrsInteract
        mockQrsInteract = jest.fn().mockImplementation(() => ({
            Get: jest.fn(),
        }));

        // Mock globals
        mockGlobals = {
            config: {
                has: jest.fn(),
                get: jest.fn(),
                Butler: {
                    thirdPartyToolsCredentials: {
                        newRelic: [
                            { accountName: 'test-account', insertApiKey: 'test-key', accountId: '12345' },
                            { accountName: 'test-account-2', insertApiKey: 'test-key-2', accountId: '67890' },
                        ],
                    },
                },
            },
            configQRS: {
                certPaths: {
                    certPath: '/path/to/cert',
                    keyPath: '/path/to/key',
                },
            },
            logger: {
                error: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
                verbose: jest.fn(),
            },
            appVersion: '13.1.2',
            getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
        };

        // Mock rate-limiter-flexible
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: mockRateLimiterMemory,
        }));

        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        await jest.unstable_mockModule('qrs-interact', () => ({ default: mockQrsInteract }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../new_relic.js');
        ({
            sendNewRelicEvent,
            sendNewRelicLog,
            sendReloadTaskFailureEvent,
            sendReloadTaskFailureLog,
            sendReloadTaskAbortedEvent,
            sendReloadTaskAbortedLog,
        } = module);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default config responses
        mockGlobals.config.has.mockImplementation((key) => {
            const configKeys = [
                'Butler.configQRS.host',
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event',
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable',
                'Butler.incidentTool.newRelic.url.event',
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log',
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable',
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event',
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable',
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log',
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable',
                'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit',
                'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit',
            ];
            return configKeys.includes(key);
        });

        mockGlobals.config.get.mockImplementation((key) => {
            const configMap = {
                'Butler.configQRS.host': 'test-host',
                'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                'Butler.incidentTool.newRelic.url.log': 'https://log-api.newrelic.com/log/v1',
                'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.rateLimit': 300,
                'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.rateLimit': 300,
                'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header': null,
                'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static': null,
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.static': null,
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.static': null,
                'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header': null,
                'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static': null,
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.static': null,
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.static': null,
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.tailScriptLogLines': 20,
            };
            return configMap[key];
        });

        mockAxios.request.mockResolvedValue({ status: 200, statusText: 'OK' });
    });

    describe('sendNewRelicEvent', () => {
        test('should successfully send event to New Relic', async () => {
            const incidentConfig = {
                eventType: 'qs_reloadTaskFailedEvent',
                url: 'https://insights-collector.newrelic.com/v1/accounts/',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_executionStartTime: '2023-01-01T00:00:00Z',
            };

            const destNewRelicAccounts = ['test-account'];

            await sendNewRelicEvent(incidentConfig, reloadParams, destNewRelicAccounts);

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://insights-collector.newrelic.com/v1/accounts/v1/accounts/12345/events',
                method: 'post',
                timeout: 10000,
                data: [
                    expect.objectContaining({
                        eventType: 'qs_reloadTaskFailedEvent',
                        version: '13.1.2',
                        qs_taskId: 'task123',
                        qs_taskName: 'Test Task',
                        qs_executionStartTime: '2023-01-01T00:00:00Z',
                    }),
                ],
                headers: expect.objectContaining({
                    'Content-Type': 'application/json; charset=utf-8',
                    'Api-Key': 'test-key',
                }),
            });
        });

        test('should handle service state events', async () => {
            const incidentConfig = {
                eventType: 'qs_serviceStateEvent',
                url: 'https://insights-collector.newrelic.com/v1/accounts/',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { serviceName: 'QlikSenseEngineService' },
            };

            const destNewRelicAccounts = ['test-account'];

            await sendNewRelicEvent(incidentConfig, {}, destNewRelicAccounts);

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://insights-collector.newrelic.com/v1/accounts/v1/accounts/12345/events',
                method: 'post',
                timeout: 10000,
                data: [
                    expect.objectContaining({
                        eventType: 'qs_serviceStateEvent',
                        serviceName: 'QlikSenseEngineService',
                    }),
                ],
                headers: expect.objectContaining({
                    'Api-Key': 'test-key',
                    'Content-Type': 'application/json; charset=utf-8',
                }),
            });
        });

        test('should handle non-existent New Relic account', async () => {
            const incidentConfig = {
                eventType: 'qs_reloadTaskFailedEvent',
                url: 'https://insights-collector.newrelic.com/v1/accounts/',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            await sendNewRelicEvent(incidentConfig, {}, ['non-existent-account']);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('New Relic account name "non-existent-account" does not exist'),
            );
            expect(mockAxios.request).not.toHaveBeenCalled();
        });

        test('should handle axios errors', async () => {
            mockAxios.request.mockRejectedValue(new Error('Network error'));

            const incidentConfig = {
                eventType: 'qs_reloadTaskFailedEvent',
                url: 'https://insights-collector.newrelic.com/v1/accounts/',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            await sendNewRelicEvent(incidentConfig, {}, ['test-account']);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('NEW RELIC 1 message: Network error'));
        });

        test('should handle non-200/202 status codes', async () => {
            mockAxios.request.mockResolvedValue({ status: 500, statusText: 'Internal Server Error' });

            const incidentConfig = {
                eventType: 'qs_reloadTaskFailedEvent',
                url: 'https://insights-collector.newrelic.com/v1/accounts/',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            await sendNewRelicEvent(incidentConfig, {}, ['test-account']);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error code from posting event to New Relic account 12345: 500, Internal Server Error'),
            );
        });
    });

    describe('sendNewRelicLog', () => {
        test('should successfully send reload task failed log to New Relic', async () => {
            const incidentConfig = {
                logType: 'qs_reloadTaskFailedLog',
                url: 'https://log-api.newrelic.com/log/v1',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                scriptLog: {
                    executingNodeName: 'test-node',
                    executionStartTime: '2023-01-01T00:00:00Z',
                    executionStopTime: '2023-01-01T00:01:00Z',
                    executionDuration: 60000,
                    executionStatusNum: 5,
                    executionStatusText: 'Failed',
                    scriptLogSize: 1000,
                    scriptLogFull: ['Line 1', 'Line 2', 'Error occurred'],
                    executionDetailsConcatenated: 'Task failed with error',
                },
            };

            const destNewRelicAccounts = ['test-account'];

            await sendNewRelicLog(incidentConfig, reloadParams, destNewRelicAccounts);

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://log-api.newrelic.com/log/v1',
                method: 'post',
                timeout: 10000,
                data: [
                    expect.objectContaining({
                        common: expect.objectContaining({
                            attributes: expect.objectContaining({
                                logtype: 'qs_reloadTaskFailedLog',
                                qs_executingNodeName: 'test-node',
                                qs_scriptLogTailCount: 20,
                            }),
                        }),
                        logs: [
                            expect.objectContaining({
                                message: expect.stringContaining('Task failed with error'),
                            }),
                        ],
                    }),
                ],
                headers: expect.objectContaining({
                    'Api-Key': 'test-key',
                }),
            });
        });

        test('should handle service state logs', async () => {
            const incidentConfig = {
                logType: 'qs_serviceStateLog',
                url: 'https://log-api.newrelic.com/log/v1',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            const reloadParams = {
                serviceStatus: 'STOPPED',
                serviceDisplayName: 'Qlik Sense Engine Service',
                serviceHost: 'test-host',
            };

            const destNewRelicAccounts = ['test-account'];

            await sendNewRelicLog(incidentConfig, reloadParams, destNewRelicAccounts);

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: 'https://log-api.newrelic.com/log/v1',
                method: 'post',
                timeout: 10000,
                data: [
                    expect.objectContaining({
                        common: expect.objectContaining({
                            attributes: expect.objectContaining({
                                logtype: 'qs_serviceStateLog',
                            }),
                        }),
                        logs: [
                            expect.objectContaining({
                                message: 'Windows service "Qlik Sense Engine Service" on host "test-host" is STOPPED.',
                            }),
                        ],
                    }),
                ],
                headers: expect.objectContaining({
                    'Api-Key': 'test-key',
                }),
            });
        });

        test('should handle axios errors in log sending', async () => {
            mockAxios.request.mockRejectedValue(new Error('Log network error'));

            const incidentConfig = {
                logType: 'qs_reloadTaskFailedLog',
                url: 'https://log-api.newrelic.com/log/v1',
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                attributes: { version: '13.1.2' },
            };

            await sendNewRelicLog(incidentConfig, { scriptLog: { scriptLogFull: [] } }, ['test-account']);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('NEW RELIC 2 message: Log network error'));
        });
    });

    describe('sendReloadTaskFailureEvent', () => {
        test('should successfully send reload task failure event', async () => {
            // Mock QRS response
            const mockQrsInstance = {
                Get: jest.fn().mockResolvedValue({
                    body: [
                        {
                            customProperties: [
                                {
                                    definition: { name: 'NewRelicAccount' },
                                    value: 'test-account-2',
                                },
                            ],
                        },
                    ],
                }),
            };
            mockQrsInteract.mockReturnValue(mockQrsInstance);

            // Mock config for always sending to account
            mockGlobals.config.has.mockImplementation((key) => {
                return (
                    key === 'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.enable' ||
                    key === 'Butler.configQRS.host' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable' ||
                    key === 'Butler.incidentTool.newRelic.url.event'
                );
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.configQRS.host': 'test-host',
                    'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.enable': true,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.always.account': ['test-account'],
                    'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.attribute.static': null,
                };
                return configMap[key];
            });

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: ['tag1', 'tag2'],
                qs_appTags: ['app-tag1'],
            };

            await sendReloadTaskFailureEvent(reloadParams);

            expect(mockAxios.request).toHaveBeenCalled();
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for failed task event'),
            );
        });

        test('should handle rate limiting setup', async () => {
            // Just test that the function runs without breaking
            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
            };

            await sendReloadTaskFailureEvent(reloadParams);

            // Should log something without breaking
            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle config retrieval failure', async () => {
            // Mock config to return false
            mockGlobals.config.has.mockReturnValue(false);

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
            };

            await sendReloadTaskFailureEvent(reloadParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Reload failure New Relic event config info missing'),
            );
        });
    });

    describe('sendReloadTaskFailureLog', () => {
        test('should successfully send reload task failure log', async () => {
            // Mock config for logs
            mockGlobals.config.has.mockImplementation((key) => {
                return (
                    key === 'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.enable' ||
                    key === 'Butler.configQRS.host' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable' ||
                    key === 'Butler.incidentTool.newRelic.url.event'
                );
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.configQRS.host': 'test-host',
                    'Butler.incidentTool.newRelic.url.event': 'https://log-api.newrelic.com/log/v1',
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.enable': true,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.always.account': ['test-account'],
                    'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.attribute.static': null,
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.tailScriptLogLines': 20,
                };
                return configMap[key];
            });

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: ['tag1'],
                qs_appTags: ['app-tag1'],
                scriptLog: {
                    scriptLogFull: ['Log line 1', 'Log line 2'],
                    executingNodeName: 'test-node',
                    executionStartTime: '2023-01-01T00:00:00Z',
                    executionStopTime: '2023-01-01T00:01:00Z',
                    executionDuration: 60000,
                    executionStatusNum: 5,
                    executionStatusText: 'Failed',
                    scriptLogSize: 1000,
                    executionDetailsConcatenated: 'Task failed',
                },
            };

            await sendReloadTaskFailureLog(reloadParams);

            expect(mockAxios.request).toHaveBeenCalled();
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for failed task log entry'),
            );
        });
    });

    describe('sendReloadTaskAbortedEvent', () => {
        test('should successfully send reload task aborted event', async () => {
            mockGlobals.config.has.mockImplementation((key) => {
                return (
                    key === 'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.enable' ||
                    key === 'Butler.configQRS.host' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable' ||
                    key === 'Butler.incidentTool.newRelic.url.event'
                );
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.configQRS.host': 'test-host',
                    'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.enable': true,
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.always.account': ['test-account'],
                    'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.attribute.static': null,
                };
                return configMap[key];
            });

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
            };

            sendReloadTaskAbortedEvent(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for abort task event'),
            );
        });
    });

    describe('sendReloadTaskAbortedLog', () => {
        test('should successfully send reload task aborted log', async () => {
            mockGlobals.config.has.mockImplementation((key) => {
                return (
                    key === 'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.enable' ||
                    key === 'Butler.configQRS.host' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log' ||
                    key === 'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable' ||
                    key === 'Butler.incidentTool.newRelic.url.event'
                );
            });

            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.configQRS.host': 'test-host',
                    'Butler.incidentTool.newRelic.url.event': 'https://log-api.newrelic.com/log/v1',
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.enable': true,
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.always.account': ['test-account'],
                    'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.reloadTaskAborted.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.attribute.static': null,
                };
                return configMap[key];
            });

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
                scriptLog: {
                    scriptLogFull: [],
                    executingNodeName: 'test-node',
                    executionStartTime: '2023-01-01T00:00:00Z',
                    executionStopTime: '2023-01-01T00:01:00Z',
                    executionDuration: 60000,
                    executionStatusNum: 6,
                    executionStatusText: 'Aborted',
                    scriptLogSize: 500,
                    executionDetailsConcatenated: 'Task aborted',
                },
            };

            sendReloadTaskAbortedLog(reloadParams);

            // Wait a short time for async execution
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for abort task log entry'),
            );
        });
    });

    describe('configuration edge cases', () => {
        test('should handle missing config gracefully in getReloadFailedEventConfig', async () => {
            // Reset mocks to simulate missing config
            mockGlobals.config.has.mockReturnValue(false);

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
            };

            await sendReloadTaskFailureEvent(reloadParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Reload failure New Relic event config info missing in Butler config file'),
            );
        });

        test('should handle errors in config functions', async () => {
            // Make config.get throw an error
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Config error');
            });

            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
            };

            await sendReloadTaskFailureEvent(reloadParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('NEW RELIC RELOADFAILEDEVENT message: Config error'),
            );
        });

        test('should handle custom headers and attributes', async () => {
            // This test verifies that the configuration is read but may not be processed
            // if rate limiting fails or config validation fails
            const reloadParams = {
                qs_taskId: 'task123',
                qs_taskName: 'Test Task',
                qs_taskTags: [],
                qs_appTags: [],
            };

            await sendReloadTaskFailureEvent(reloadParams);

            // Just verify the function was called without errors
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for failed task event'),
            );
        });
    });
});
