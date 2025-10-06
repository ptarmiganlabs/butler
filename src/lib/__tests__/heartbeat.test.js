import { jest } from '@jest/globals';

describe('lib/heartbeat', () => {
    let setupHeartbeatTimer;
    const mockLater = { parse: { text: jest.fn(() => 'S') }, setInterval: jest.fn((fn) => fn()) };
    const mockAxios = { get: jest.fn(() => Promise.resolve({ status: 200 })) };
    const mockGlobals = {
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    const logger = { debug: jest.fn(), error: jest.fn() };
    const config = {
        get: jest.fn((k) => ({ 'Butler.heartbeat.remoteURL': 'http://x', 'Butler.heartbeat.frequency': 'every 1 s' })[k]),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('node:sea', () => ({
            isSea: jest.fn(() => false),
            getAsset: jest.fn(),
            getAssetAsBlob: jest.fn(),
        }));
        await jest.unstable_mockModule('@breejs/later', () => ({ default: mockLater }));
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
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
