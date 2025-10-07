import { jest } from '@jest/globals';

describe('lib/service_uptime', () => {
    let serviceUptimeStart;

    const mockLater = {
        parse: { text: jest.fn(() => 'SCHED') },
        schedule: jest.fn(() => ({
            next: jest.fn(() => {
                const base = new Date(2000, 0, 1, 0, 0, 0, 0);
                return [0, 1, 2, 3].map((i) => new Date(base.getTime() + i * 1000));
            }),
        })),
        setInterval: jest.fn((fn) => {
            // call immediately
            fn();
        }),
    };

    const mockMoment = Object.assign(
        jest.fn(() => ({ duration: jest.fn() })),
        {
            duration: jest.fn(),
            preciseDiff: jest.fn(() => '0 seconds'),
        },
    );

    const mockGlobals = {
        config: { get: jest.fn() },
        logger: { log: jest.fn(), debug: jest.fn() },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    const mockInflux = { postButlerMemoryUsageToInfluxdb: jest.fn() };
    const mockNewRelic = { postButlerUptimeToNewRelic: jest.fn() };

    beforeAll(async () => {
        await jest.unstable_mockModule('@breejs/later', () => ({ default: mockLater }));
        await jest.unstable_mockModule('moment', () => ({ default: mockMoment }));
        await jest.unstable_mockModule('../post_to_influxdb.js', () => ({
            postButlerMemoryUsageToInfluxdb: mockInflux.postButlerMemoryUsageToInfluxdb,
        }));
        await jest.unstable_mockModule('../post_to_new_relic.js', () => ({
            postButlerUptimeToNewRelic: mockNewRelic.postButlerUptimeToNewRelic,
        }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        ({ default: serviceUptimeStart } = await import('../service_uptime.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobals.config.get.mockImplementation((k) => {
            const map = {
                'Butler.uptimeMonitor.logLevel': 'info',
                'Butler.uptimeMonitor.frequency': 'every 1 second',
                'Butler.influxDb.enable': true,
                'Butler.uptimeMonitor.storeInInfluxdb.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.enable': true,
            };
            return map[k];
        });
    });

    test('posts to InfluxDB and New Relic when enabled', () => {
        serviceUptimeStart();
        expect(mockLater.setInterval).toHaveBeenCalled();
        expect(mockInflux.postButlerMemoryUsageToInfluxdb).toHaveBeenCalledTimes(1);
        expect(mockNewRelic.postButlerUptimeToNewRelic).toHaveBeenCalledTimes(1);
        const payload = mockNewRelic.postButlerUptimeToNewRelic.mock.calls[0][0];
        expect(payload.intervalMillisec).toBe(1000);
    });

    test('does not post when disabled', () => {
        mockGlobals.config.get.mockImplementation((k) => {
            const map = {
                'Butler.uptimeMonitor.logLevel': 'info',
                'Butler.uptimeMonitor.frequency': 'every 1 second',
                'Butler.influxDb.enable': false,
                'Butler.uptimeMonitor.storeInInfluxdb.enable': false,
                'Butler.uptimeMonitor.storeNewRelic.enable': false,
            };
            return map[k];
        });
        serviceUptimeStart();
        expect(mockInflux.postButlerMemoryUsageToInfluxdb).not.toHaveBeenCalled();
        expect(mockNewRelic.postButlerUptimeToNewRelic).not.toHaveBeenCalled();
    });
});
