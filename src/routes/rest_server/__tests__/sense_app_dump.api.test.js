import { jest } from '@jest/globals';

let Fastify;
let routePlugin;

describe('REST: sense_app_dump routes', () => {
    let app;
    let mockSerialize;
    let mockSession;

    beforeAll(async () => {
        // Mocks must be defined before importing the route
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('fs', () => ({ readFileSync: jest.fn(() => '{}') }));

        mockSerialize = jest.fn(async () => ({ dumped: true, via: 'serializeapp' }));
        await jest.unstable_mockModule('serializeapp', () => ({ default: mockSerialize }));

        mockSession = {
            open: jest.fn(async () => ({
                openDoc: jest.fn(async () => ({
                    /* app object placeholder */
                })),
            })),
            close: jest.fn(async () => true),
        };
        const mockEnigma = { create: jest.fn(() => mockSession) };
        await jest.unstable_mockModule('enigma.js', () => ({ default: mockEnigma }));

        const mockGlobals = {
            config: {
                has: jest.fn((k) => k === 'Butler.restServerEndpointsEnable.senseAppDump'),
                get: jest.fn((k) => {
                    if (k === 'Butler.restServerEndpointsEnable.senseAppDump') return true;
                    if (k === 'Butler.configEngine.rejectUnauthorized') return false;
                    return undefined;
                }),
            },
            configEngine: {
                engineVersion: '12.999.0',
                host: 'example.local',
                port: 4747,
                key: 'k',
                cert: 'c',
            },
            getEngineHttpHeaders: jest.fn(() => ({ 'X-Header': 'v' })),
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn(), silly: jest.fn() },
        };
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        Fastify = (await import('fastify')).default;
        routePlugin = (await import('../sense_app_dump.js')).default;

        app = Fastify({ logger: false });
        await app.register(routePlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('GET /v4/senseappdump/:appId returns serialized app', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/senseappdump/abc123' });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.json()).toEqual({ dumped: true, via: 'serializeapp' });
        expect(mockSerialize).toHaveBeenCalled();
        expect(mockSession.open).toHaveBeenCalled();
        expect(mockSession.close).toHaveBeenCalled();
    });

    test('GET /v4/app/:appId/dump returns serialized app', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/app/xyz789/dump' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ dumped: true, via: 'serializeapp' });
    });
});
