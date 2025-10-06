import { jest } from '@jest/globals';

// Mocked list of enabled endpoints
const enabled = ['butlerping', 'apiListEnabledEndpoints', 'fileCopy'];

const mockGlobals = {
    config: {
        has: jest.fn((key) => key === 'Butler.restServerEndpointsEnable.apiListEnabledEndpoints'),
        get: jest.fn((key) => (key === 'Butler.restServerEndpointsEnable.apiListEnabledEndpoints' ? true : undefined)),
    },
    endpointsEnabled: enabled,
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};

let Fastify;
let apiPlugin;

describe('REST: API endpoints list', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        apiPlugin = (await import('../api.js')).default;

        app = Fastify({ logger: false });
        await app.register(apiPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('GET /v4/configfile/endpointsenabled returns array of enabled endpoints', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/configfile/endpointsenabled' });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body).toEqual(enabled);
    });
});
