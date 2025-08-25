/* eslint-disable import/no-dynamic-require */
import { jest } from '@jest/globals';

describe('telemetry', () => {
    let telemetry;
    let mockGlobals;
    let mockPostHog;
    let mockPostHogInstance;

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
        // Mock PostHog instance
        mockPostHogInstance = {
            capture: jest.fn(),
        };

        // Mock PostHog constructor
        mockPostHog = jest.fn().mockImplementation(() => mockPostHogInstance);

        // Mock globals
        mockGlobals = {
            config: mockConfig,
            logger: mockLogger,
            appVersion: '13.1.2',
            hostInfo: {
                id: 'test-host-id',
                isRunningInDocker: false,
                si: {
                    os: {
                        arch: 'x64',
                        platform: 'linux',
                        release: '5.4.0',
                        distro: 'Ubuntu',
                        codename: 'focal'
                    },
                    system: {
                        virtual: false
                    }
                },
                node: {
                    nodeVersion: 'v20.19.4'
                }
            }
        };

        // Mock dependencies
        await jest.unstable_mockModule('../../globals.js', () => ({
            default: mockGlobals,
        }));

        await jest.unstable_mockModule('posthog-node', () => ({
            PostHog: mockPostHog,
        }));

        // Mock setInterval to prevent actual timer execution
        global.setInterval = jest.fn((callback, interval) => {
            // Store the callback for manual execution in tests
            global.setInterval.mockCallback = callback;
            global.setInterval.mockInterval = interval;
            return 'mock-timer-id';
        });

        // Import the module under test
        telemetry = await import('../telemetry.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset default config responses
        mockConfig.has.mockReturnValue(false);
        mockConfig.get.mockReturnValue(false);
    });

    describe('setupAnonUsageReportTimer', () => {
        test('should setup PostHog client and timer correctly', () => {
            telemetry.default(mockLogger, mockGlobals.hostInfo);

            expect(mockPostHog).toHaveBeenCalledWith(
                'phc_5cmKiX9OubQjsSfOZuaolWaxo2z7WXqd295eB0uOtTb',
                {
                    host: 'https://eu.posthog.com',
                    flushAt: 1,
                    flushInterval: 60 * 1000,
                    requestTimeout: 30 * 1000,
                    disableGeoip: false,
                }
            );

            expect(global.setInterval).toHaveBeenCalledWith(
                expect.any(Function),
                1000 * 60 * 60 * 12 // 12 hours
            );

            // Initial telemetry should be sent
            expect(mockPostHogInstance.capture).toHaveBeenCalled();
        });

        test('should handle errors during setup', () => {
            mockPostHog.mockImplementation(() => {
                throw new Error('PostHog setup error');
            });

            telemetry.default(mockLogger, mockGlobals.hostInfo);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'TELEMETRY: Error: PostHog setup error'
            );
        });
    });

    describe('callRemoteURL telemetry data collection', () => {
        beforeEach(() => {
            // Setup telemetry system
            telemetry.default(mockLogger, mockGlobals.hostInfo);
            jest.clearAllMocks();
        });

        test('should collect basic system information', () => {
            // Execute the timer callback to trigger telemetry
            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    distinctId: 'test-host-id',
                    event: 'telemetry sent',
                    properties: expect.objectContaining({
                        service: 'butler',
                        serviceVersion: '13.1.2',
                        system_id: 'test-host-id',
                        system_arch: 'x64',
                        system_platform: 'linux',
                        system_release: '5.4.0',
                        system_distro: 'Ubuntu',
                        system_codename: 'focal',
                        system_virtual: false,
                        system_isRunningInDocker: false,
                        system_nodeVersion: 'v20.19.4'
                    })
                })
            );
        });

        test('should collect heartbeat feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.heartbeat.enable';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.heartbeat.enable') return true;
                return false;
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_heartbeat: true
                    })
                })
            );
        });

        test('should collect docker health check feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.dockerHealthCheck.enable';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.dockerHealthCheck.enable') return true;
                return false;
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_dockerHealthCheck: true
                    })
                })
            );
        });

        test('should collect uptime monitor feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.uptimeMonitor.enable' || 
                       key === 'Butler.uptimeMonitor.storeInInfluxdb.enable' ||
                       key === 'Butler.uptimeMonitor.storeNewRelic.enable';
            });
            mockConfig.get.mockImplementation((key) => {
                switch (key) {
                    case 'Butler.uptimeMonitor.enable':
                        return true;
                    case 'Butler.uptimeMonitor.storeInInfluxdb.enable':
                        return true;
                    case 'Butler.uptimeMonitor.storeNewRelic.enable':
                        return true;
                    default:
                        return false;
                }
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_uptimeMonitor: true,
                        feature_uptimeMonitoStoreInInfluxdb: true,
                        feature_uptimeMonitoStoreInNewRelic: true
                    })
                })
            );
        });

        test('should collect API endpoint feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key.startsWith('Butler.restServerEndpointsEnable.');
            });
            mockConfig.get.mockImplementation((key) => {
                if (key.startsWith('Butler.restServerEndpointsEnable.')) return true;
                return false;
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_apiListEnabledEndpoints: true,
                        feature_apiBase62ToBase16: true,
                        feature_apiBase16ToBase62: true,
                        feature_apiButlerPing: true,
                        feature_apiCreateDir: true,
                        feature_apiCreateDirQvd: true,
                        feature_apiFileDelete: true,
                        feature_apiFileMove: true,
                        feature_apiFileCopy: true,
                        feature_apiKeyValueStore: true,
                        feature_apiMqttPublishMessage: true,
                        feature_apiNewRelicPostMetric: true,
                        feature_apiNewRelicPostEvent: true
                    })
                })
            );
        });

        test('should collect scheduler API feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key.startsWith('Butler.restServerEndpointsEnable.scheduler.');
            });
            mockConfig.get.mockImplementation((key) => {
                if (key.startsWith('Butler.restServerEndpointsEnable.scheduler.')) return true;
                return false;
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_apiSchedulerCreateNew: true,
                        feature_apiSchedulerGet: true,
                        feature_apiSchedulerGetStatusAll: true,
                        feature_apiSchedulerUpdate: true,
                        feature_apiSchedulerDelete: true,
                        feature_apiSchedulerStart: true,
                        feature_apiSchedulerStop: true
                    })
                })
            );
        });

        test('should collect sense app API feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.restServerEndpointsEnable.senseAppReload' ||
                       key === 'Butler.restServerEndpointsEnable.senseAppDump' ||
                       key === 'Butler.restServerEndpointsEnable.senseListApps' ||
                       key === 'Butler.restServerEndpointsEnable.senseStartTask' ||
                       key === 'Butler.restServerEndpointsEnable.slackPostMessage';
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_apiSenseAppReload: true,
                        feature_apiSenseAppDump: true,
                        feature_apiSenseListApps: true,
                        feature_apiSenseStartTask: true,
                        feature_apiSlackPostMessage: true
                    })
                })
            );
        });

        test('should collect InfluxDB feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.influxDb.reloadTaskFailure.enable' ||
                       key === 'Butler.influxDb.reloadTaskSuccess.enable';
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_influxDbReloadTaskFailure: true,
                        feature_influxDbReloadTaskSuccess: true
                    })
                })
            );
        });

        test('should collect script log feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.enable' ||
                       key === 'Butler.scriptLog.storeOnDisk.qsCloud.appReloadFailure.enable';
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_scriptLogQseowReloadTaskFailure: true,
                        feature_scriptLogQsCloudAppReloadFailure: true
                    })
                })
            );
        });

        test('should collect notification feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key.includes('Notification.') && key.includes('.enable');
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_teamsNotificationReloadTaskFailure: true,
                        feature_teamsNotificationReloadTaskAborted: true,
                        feature_slackNotificationReloadTaskFailure: true,
                        feature_slackNotificationReloadTaskAborted: true,
                        feature_emailNotificationReloadTaskFailure: true,
                        feature_emailNotificationReloadTaskAborted: true
                    })
                })
            );
        });

        test('should collect webhook notification feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.webhookNotification.enable';
            });
            mockConfig.get.mockImplementation((key) => {
                switch (key) {
                    case 'Butler.webhookNotification.enable':
                        return true;
                    case 'Butler.webhookNotification.reloadTaskFailure.webhooks':
                        return [{ url: 'https://example.com/webhook1' }];
                    case 'Butler.webhookNotification.reloadTaskAborted.webhooks':
                        return [{ url: 'https://example.com/webhook2' }];
                    case 'Butler.webhookNotification.serviceMonitor.webhooks':
                        return [{ url: 'https://example.com/webhook3' }];
                    default:
                        return false;
                }
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_webhookNotification: true,
                        feature_webhookNotificationReloadTaskFailure: true,
                        feature_webhookNotificationReloadTaskAborted: true,
                        feature_webhookNotificationServiceMonitor: true
                    })
                })
            );
        });

        test('should handle disabled webhook notifications', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.webhookNotification.enable';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.webhookNotification.enable') return false;
                return false;
            });

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_webhookNotification: false,
                        feature_webhookNotificationReloadTaskFailure: false,
                        feature_webhookNotificationReloadTaskAborted: false,
                        feature_webhookNotificationServiceMonitor: false
                    })
                })
            );
        });

        test('should collect SIGNL4 notification feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.incidentTool.signl4.reloadTaskFailure.enable' ||
                       key === 'Butler.incidentTool.signl4.reloadTaskAborted.enable';
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_signl4NotificationReloadTaskFailure: true,
                        feature_signl4NotificationReloadTaskAborted: true
                    })
                })
            );
        });

        test('should collect New Relic incident tool feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key.includes('Butler.incidentTool.newRelic.') && key.includes('.enable');
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_newRelicNotificationReloadTaskFailure: true,
                        feature_newRelicNotificationReloadTaskAborted: true
                    })
                })
            );
        });

        test('should collect core feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return ['Butler.scheduler.enable', 'Butler.mqttConfig.enable', 
                        'Butler.serviceMonitor.enable', 'Butler.keyValueStore.enable',
                        'Butler.udpServerConfig.enable', 'Butler.restServerConfig.enable'].includes(key);
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_scheduler: true,
                        feature_mqtt: true,
                        feature_serviceMonitor: true,
                        feature_keyValueStore: true,
                        feature_udpServer: true,
                        feature_restServer: true
                    })
                })
            );
        });

        test('should collect Qlik Sense Cloud feature status', () => {
            mockConfig.has.mockImplementation((key) => {
                return key.includes('Butler.qlikSenseCloud.');
            });
            mockConfig.get.mockReturnValue(true);

            global.setInterval.mockCallback();

            expect(mockPostHogInstance.capture).toHaveBeenCalledWith(
                expect.objectContaining({
                    properties: expect.objectContaining({
                        feature_qliksensecloud: true,
                        feature_qliksensecloudReloadAppFailureTeamsNotification: true,
                        feature_qliksensecloudReloadAppFailureSlackNotification: true,
                        feature_qliksensecloudReloadAppFailureEmailNotification: true
                    })
                })
            );
        });

        test('should include comprehensive telemetry JSON object', () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.restServerEndpointsEnable';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.restServerEndpointsEnable') {
                    return {
                        butlerping: true,
                        keyValueStore: true
                    };
                }
                return false;
            });

            global.setInterval.mockCallback();

            const captureCall = mockPostHogInstance.capture.mock.calls[0][0];
            expect(captureCall.properties.telemetry_json).toEqual({
                system: {
                    id: 'test-host-id',
                    arch: 'x64',
                    platform: 'linux',
                    release: '5.4.0',
                    distro: 'Ubuntu',
                    codename: 'focal',
                    virtual: false,
                    isRunningInDocker: false,
                    nodeVersion: 'v20.19.4'
                },
                enabledFeatures: {
                    feature: expect.objectContaining({
                        heartbeat: 'null',
                        dockerHealthCheck: 'null',
                        apiEnabledEndpoints: {
                            butlerping: true,
                            keyValueStore: true
                        }
                    })
                }
            });
        });

        test('should handle telemetry capture errors with response object', () => {
            const errorWithResponse = new Error('Network error');
            errorWithResponse.response = {
                status: 500,
                statusText: 'Internal Server Error'
            };

            mockPostHogInstance.capture.mockImplementation(() => {
                throw errorWithResponse;
            });

            global.setInterval.mockCallback();

            expect(mockLogger.error).toHaveBeenCalledWith('TELEMETRY: Could not send anonymous telemetry.');
            expect(mockLogger.error).toHaveBeenCalledWith('     Error: 500 (Internal Server Error).');
            expect(mockLogger.error).toHaveBeenCalledWith('❤️  Thank you for supporting Butler by allowing telemetry! ❤️');
        });

        test('should handle telemetry capture errors without response object', () => {
            const simpleError = new Error('Simple error');

            mockPostHogInstance.capture.mockImplementation(() => {
                throw simpleError;
            });

            global.setInterval.mockCallback();

            expect(mockLogger.error).toHaveBeenCalledWith('TELEMETRY: Could not send anonymous telemetry.');
            expect(mockLogger.error).toHaveBeenCalledWith('     Error: Error: Simple error');
            expect(mockLogger.error).toHaveBeenCalledWith('❤️  Thank you for supporting Butler by allowing telemetry! ❤️');
        });

        test('should log successful telemetry transmission', () => {
            global.setInterval.mockCallback();

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'TELEMETRY: Sent anonymous telemetry. Thanks for contributing to making Butler better!'
            );
        });
    });
});