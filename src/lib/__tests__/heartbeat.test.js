import { jest } from '@jest/globals';

describe('lib/heartbeat', () => {
    let setupHeartbeatTimer;
    const mockLater = { parse: { text: jest.fn(() => 'S') }, setInterval: jest.fn((fn) => fn()) };
    const mockAxios = { get: jest.fn(() => Promise.resolve({ status: 200 })) };

    const logger = { debug: jest.fn(), error: jest.fn() };
    const config = {
        get: jest.fn((k) => ({ 'Butler.heartbeat.remoteURL': 'http://x', 'Butler.heartbeat.frequency': 'every 1 s' })[k]),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('@breejs/later', () => ({ default: mockLater }));
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        ({ default: setupHeartbeatTimer } = await import('../heartbeat.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('does initial ping and sets interval', () => {
        setupHeartbeatTimer(config, logger);
        expect(mockAxios.get).toHaveBeenCalledWith('http://x');
        expect(mockLater.setInterval).toHaveBeenCalled();
    });

    test('logs error if config throws', () => {
        const bad = {
            get: () => {
                throw new Error('cfg');
            },
        };
        setupHeartbeatTimer(bad, logger);
        expect(logger.error).toHaveBeenCalled();
    });
});
