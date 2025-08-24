import { jest } from '@jest/globals';

describe('lib/incident_mgmt/new_relic_service_monitor', () => {
    let newRelicServiceMonitor, mockSendNewRelicEvent, mockSendNewRelicLog;
    let mockGlobals;

    // Mock rate limiter success by default
    const mockRateLimiterMemory = jest.fn().mockImplementation(() => ({
        consume: jest.fn().mockResolvedValue({ remainingHits: 0, msBeforeNext: 0 }),
    }));

    beforeAll(async () => {
        // Mock the New Relic functions
        mockSendNewRelicEvent = jest.fn();
        mockSendNewRelicLog = jest.fn();

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
        };

        // Mock rate-limiter-flexible
        await jest.unstable_mockModule('rate-limiter-flexible', () => ({
            RateLimiterMemory: mockRateLimiterMemory,
        }));

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../new_relic.js', () => ({
            sendNewRelicEvent: mockSendNewRelicEvent,
            sendNewRelicLog: mockSendNewRelicLog,
        }));

        newRelicServiceMonitor = await import('../new_relic_service_monitor.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default config responses for service monitor
        mockGlobals.config.has.mockImplementation((key) => {
            const configKeys = [
                'Butler.incidentTool.newRelic.destinationAccount.event',
                'Butler.incidentTool.newRelic.url.event',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.enable',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState',
                'Butler.incidentTool.newRelic.destinationAccount.log',
                'Butler.incidentTool.newRelic.url.log',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.enable',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceHost',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceName',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceState',
                'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit',
            ];
            return configKeys.includes(key);
        });

        mockGlobals.config.get.mockImplementation((key) => {
            const configMap = {
                'Butler.incidentTool.newRelic.destinationAccount.event': ['test-account'],
                'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.enable': true,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount': ['test-account'],
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName': true,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState': true,
                'Butler.incidentTool.newRelic.destinationAccount.log': ['test-account'],
                'Butler.incidentTool.newRelic.url.log': 'https://log-api.newrelic.com/log/v1',
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.enable': true,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount': ['test-account'],
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceHost': true,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceName': true,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceState': true,
                'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.rateLimit': 300,
                'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header': null,
                'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static': null,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.static': null,
                'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.static': null,
            };
            return configMap[key];
        });
    });

    describe('sendServiceMonitorEvent', () => {
        test('should successfully send service monitor event to New Relic', async () => {
            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                    startType: 'Automatic',
                    exePath: 'C:\\Program Files\\Qlik\\Sense\\Engine\\Engine.exe',
                    dependencies: ['HTTP', 'RPC'],
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for service state event. Service name: "QlikSenseEngineService"'),
            );

            expect(mockSendNewRelicEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'qs_serviceStateEvent',
                    url: 'https://insights-collector.newrelic.com/v1/accounts/',
                    attributes: expect.objectContaining({
                        butler_serviceName: 'QlikSenseEngineService',
                        butler_serviceStatus: 'RUNNING',
                    }),
                }),
                expect.objectContaining({
                    serviceHost: 'test-server',
                    serviceName: 'QlikSenseEngineService',
                    serviceStatus: 'RUNNING',
                    serviceDisplayName: 'Qlik Sense Engine Service',
                    serviceStartType: 'Automatic',
                    serviceExePath: 'C:\\Program Files\\Qlik\\Sense\\Engine\\Engine.exe',
                    serviceDependencies: ['HTTP', 'RPC'],
                }),
                ['test-account'],
            );
        });

        test('should handle rate limiting setup for service monitor event', async () => {
            // Just test that the function runs
            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'STOPPED',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle missing configuration for service monitor event', async () => {
            // Mock missing config
            mockGlobals.config.has.mockReturnValue(false);

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Service state New Relic event config info missing in Butler config file'),
            );
        });

        test('should include optional dynamic attributes when enabled', async () => {
            // Enable all dynamic attributes
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.newRelic.destinationAccount.event': ['test-account'],
                    'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.enable': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount': ['test-account'],
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceHost': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceDisplayName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.static': null,
                };
                return configMap[key];
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            expect(mockSendNewRelicEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        butler_serviceHost: 'test-server',
                        butler_serviceName: 'QlikSenseEngineService',
                        butler_serviceDisplayName: 'Qlik Sense Engine Service',
                        butler_serviceStatus: 'RUNNING',
                    }),
                }),
                expect.any(Object),
                expect.any(Array),
            );
        });

        test('should handle custom headers and static attributes', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.newRelic.destinationAccount.event': ['test-account'],
                    'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.enable': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount': ['test-account'],
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header': [{ name: 'X-Environment', value: 'test' }],
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static': [{ name: 'environment', value: 'test' }],
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.static': [
                        { name: 'type', value: 'service-monitor' },
                    ],
                };
                return configMap[key];
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            expect(mockSendNewRelicEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Environment': 'test',
                    }),
                    attributes: expect.objectContaining({
                        environment: 'test',
                        type: 'service-monitor',
                    }),
                }),
                expect.any(Object),
                expect.any(Array),
            );
        });

        test('should handle errors in service monitor event configuration', async () => {
            // Make config.get throw an error
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Config error');
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('SERVICE MONITOR NEWRELIC EVENT: Error: Config error'),
            );
        });
    });

    describe('sendServiceMonitorLog', () => {
        test('should successfully send service monitor log to New Relic', async () => {
            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'STOPPED',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                    startType: 'Automatic',
                    exePath: 'C:\\Program Files\\Qlik\\Sense\\Engine\\Engine.exe',
                    dependencies: ['HTTP', 'RPC'],
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorLog(serviceStatusParams);

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Rate limiting check passed for service state log entry. Service name: "QlikSenseEngineService"'),
            );

            expect(mockSendNewRelicLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    logType: 'qs_serviceStateLog',
                    url: 'https://log-api.newrelic.com/log/v1',
                    attributes: expect.objectContaining({
                        butler_serviceHost: 'test-server',
                        butler_serviceName: 'QlikSenseEngineService',
                        butler_serviceStatus: 'STOPPED',
                    }),
                }),
                expect.objectContaining({
                    serviceHost: 'test-server',
                    serviceName: 'QlikSenseEngineService',
                    serviceStatus: 'STOPPED',
                    serviceDisplayName: 'Qlik Sense Engine Service',
                    serviceStartType: 'Automatic',
                    serviceExePath: 'C:\\Program Files\\Qlik\\Sense\\Engine\\Engine.exe',
                    serviceDependencies: ['HTTP', 'RPC'],
                }),
                ['test-account'],
            );
        });

        test('should handle rate limiting setup for service monitor log', async () => {
            // Just test that the function runs
            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'STOPPED',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorLog(serviceStatusParams);

            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle missing configuration for service monitor log', async () => {
            // Mock missing config
            mockGlobals.config.has.mockReturnValue(false);

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorLog(serviceStatusParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Service state New Relic log entry config info missing in Butler config file'),
            );
        });

        test('should include all dynamic attributes when enabled for logs', async () => {
            // Enable all dynamic attributes
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.newRelic.destinationAccount.log': ['test-account'],
                    'Butler.incidentTool.newRelic.url.log': 'https://log-api.newrelic.com/log/v1',
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.enable': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount': ['test-account'],
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceHost': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceDisplayName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceState': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.static': null,
                };
                return configMap[key];
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorLog(serviceStatusParams);

            expect(mockSendNewRelicLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        butler_serviceHost: 'test-server',
                        butler_serviceName: 'QlikSenseEngineService',
                        butler_serviceDisplayName: 'Qlik Sense Engine Service',
                        butler_serviceStatus: 'RUNNING',
                    }),
                }),
                expect.any(Object),
                expect.any(Array),
            );
        });

        test('should handle errors in service monitor log configuration', async () => {
            // Make config.get throw an error
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Log config error');
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorLog(serviceStatusParams);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('SERVICE MONITOR NEWRELIC EVENT: Error: Log config error'),
            );
        });
    });

    describe('rate limiter initialization', () => {
        test('should use default rate limit when config is missing', async () => {
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

            await import('../new_relic_service_monitor.js');

            // Should have been called with default duration of 300
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
                    has: jest.fn().mockReturnValue(true),
                    get: jest.fn().mockReturnValue(600),
                },
            };

            await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobalsWithRateLimit }));
            await jest.unstable_mockModule('rate-limiter-flexible', () => ({
                RateLimiterMemory: mockRateLimiterMemory,
            }));

            await import('../new_relic_service_monitor.js');

            // Should have been called with configured duration of 600
            expect(mockRateLimiterMemory).toHaveBeenCalledWith({
                points: 1,
                duration: 600,
            });
        });
    });

    describe('edge cases', () => {
        test('should handle empty send accounts array', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.newRelic.destinationAccount.event': ['test-account'],
                    'Butler.incidentTool.newRelic.url.event': 'https://insights-collector.newrelic.com/v1/accounts/',
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.enable': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.sendToAccount': [], // Empty array
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.dynamic.serviceState': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.event.attribute.static': null,
                };
                return configMap[key];
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorEvent(serviceStatusParams);

            // Should still call sendNewRelicEvent with empty accounts array
            expect(mockSendNewRelicEvent).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), []);
        });

        test('should handle null send accounts configuration', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.incidentTool.newRelic.destinationAccount.log': ['test-account'],
                    'Butler.incidentTool.newRelic.url.log': 'https://log-api.newrelic.com/log/v1',
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.enable': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.sendToAccount': null, // Null value
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceHost': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceName': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.dynamic.serviceState': true,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.header': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.sharedSettings.attribute.static': null,
                    'Butler.incidentTool.newRelic.serviceMonitor.destination.log.attribute.static': null,
                };
                return configMap[key];
            });

            const serviceStatusParams = {
                serviceHost: 'test-server',
                serviceName: 'QlikSenseEngineService',
                serviceStatus: 'RUNNING',
                serviceDetails: {
                    displayName: 'Qlik Sense Engine Service',
                },
            };

            await newRelicServiceMonitor.default.sendServiceMonitorLog(serviceStatusParams);

            // Should still call sendNewRelicLog with empty accounts array
            expect(mockSendNewRelicLog).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), []);
        });
    });
});
