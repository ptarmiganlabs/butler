import { jest } from '@jest/globals';

// Minimal globals mock so the plugin registers the endpoint
const mockGlobals = {
    config: {
        has: jest.fn((key) => ['Butler.restServerEndpointsEnable.butlerping'].includes(key)),
        get: jest.fn((key) => (key === 'Butler.restServerEndpointsEnable.butlerping' ? true : undefined)),
    },
    appVersion: '9.9.9',
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
};

let Fastify;
let pingPlugin;

describe('REST: butler ping endpoint', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        pingPlugin = (await import('../butler_ping.js')).default;

        app = Fastify({ logger: false });
        await app.register(pingPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('GET /v4/butlerping returns butler status and version', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/butlerping' });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toEqual({ response: 'Butler reporting for duty', butlerVersion: '9.9.9' });
    });
});
