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
    });
});