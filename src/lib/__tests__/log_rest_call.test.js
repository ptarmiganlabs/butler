import { jest } from '@jest/globals';

describe('lib/log_rest_call', () => {
    let logRESTCall;
    const mockGlobals = {
        logger: {
            info: jest.fn(),
            debug: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        ({ default: logRESTCall } = await import('../log_rest_call.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('logs all parts of request', () => {
        const req = {
            url: '/x',
            headers: { remoteip: '1.2.3.4', a: 1 },
            query: { q: 'y' },
            body: { b: true },
            params: { id: '42' },
        };
        logRESTCall(req);
        expect(mockGlobals.logger.info).toHaveBeenCalled();
        expect(mockGlobals.logger.debug).toHaveBeenCalledTimes(4);
    });
});
