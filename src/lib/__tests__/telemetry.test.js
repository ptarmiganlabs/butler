import { jest } from '@jest/globals';

describe('lib/telemetry', () => {
    let setupAnonUsageReportTimer;
    
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
        appVersion: '13.1.2',
        hostInfo: {
            id: 'test-host-id',
            isRunningInDocker: false,
            si: {
                os: { arch: 'x64', platform: 'linux', release: '5.4.0', distro: 'Ubuntu', codename: 'focal' },
                system: { virtual: false }
            },
            node: { nodeVersion: 'v20.19.4' }
        }
    };

    const mockPostHogInstance = { capture: jest.fn() };
    const mockPostHog = jest.fn().mockImplementation(() => mockPostHogInstance);

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('posthog-node', () => ({ PostHog: mockPostHog }));
        
        global.setInterval = jest.fn();

        const module = await import('../telemetry.js');
        setupAnonUsageReportTimer = module.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobals.config.has.mockReturnValue(false);
        mockGlobals.config.get.mockReturnValue(false);
    });

    describe('setupAnonUsageReportTimer', () => {
        test('should setup PostHog client and timer', () => {
            setupAnonUsageReportTimer(mockGlobals.logger, mockGlobals.hostInfo);

            expect(mockPostHog).toHaveBeenCalledWith(
                'phc_5cmKiX9OubQjsSfOZuaolWaxo2z7WXqd295eB0uOtTb',
                expect.objectContaining({
                    host: 'https://eu.posthog.com',
                    flushAt: 1,
                    flushInterval: 60 * 1000,
                    requestTimeout: 30 * 1000,
                    disableGeoip: false,
                })
            );

            expect(global.setInterval).toHaveBeenCalledWith(
                expect.any(Function),
                1000 * 60 * 60 * 12 // 12 hours
            );
        });

        test('should handle errors during setup', () => {
            mockPostHog.mockImplementation(() => {
                throw new Error('PostHog setup error');
            });

            setupAnonUsageReportTimer(mockGlobals.logger, mockGlobals.hostInfo);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                'TELEMETRY: Error: PostHog setup error'
            );
        });

        test('should handle missing host info', () => {
            setupAnonUsageReportTimer(mockGlobals.logger, null);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('TELEMETRY:')
            );
        });

        test('should handle incomplete host info', () => {
            const incompleteHostInfo = {
                id: 'test-host-id',
                // Missing other required fields
            };

            setupAnonUsageReportTimer(mockGlobals.logger, incompleteHostInfo);

            expect(mockPostHog).toHaveBeenCalled();
        });

        test('should handle PostHog capture errors', () => {
            mockPostHogInstance.capture.mockImplementation(() => {
                throw new Error('Capture error');
            });

            setupAnonUsageReportTimer(mockGlobals.logger, mockGlobals.hostInfo);

            // Trigger the timer callback manually if possible
            expect(mockPostHog).toHaveBeenCalled();
        });

        test('should set up different timer intervals', () => {
            // Test with different configuration values
            mockGlobals.config.get.mockReturnValue(60000); // 1 minute

            setupAnonUsageReportTimer(mockGlobals.logger, mockGlobals.hostInfo);

            expect(mockPostHog).toHaveBeenCalled();
        });

        test('should handle system info variations', () => {
            const dockerHostInfo = {
                ...mockGlobals.hostInfo,
                isRunningInDocker: true,
                si: {
                    ...mockGlobals.hostInfo.si,
                    system: { virtual: true }
                }
            };

            setupAnonUsageReportTimer(mockGlobals.logger, dockerHostInfo);

            expect(mockPostHog).toHaveBeenCalled();
        });

        test('should handle different OS platforms', () => {
            const windowsHostInfo = {
                ...mockGlobals.hostInfo,
                si: {
                    ...mockGlobals.hostInfo.si,
                    os: { 
                        arch: 'x64', 
                        platform: 'win32', 
                        release: '10.0.19042', 
                        distro: 'Windows', 
                        codename: '' 
                    }
                }
            };

            setupAnonUsageReportTimer(mockGlobals.logger, windowsHostInfo);

            expect(mockPostHog).toHaveBeenCalled();
        });

        test('should handle node version variations', () => {
            const differentNodeHostInfo = {
                ...mockGlobals.hostInfo,
                node: { nodeVersion: 'v18.17.0' }
            };

            setupAnonUsageReportTimer(mockGlobals.logger, differentNodeHostInfo);

            expect(mockPostHog).toHaveBeenCalled();
        });
    });
});