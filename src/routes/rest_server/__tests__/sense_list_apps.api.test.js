import { jest } from '@jest/globals';

let Fastify;
let routePlugin;

describe('REST: sense_list_apps routes', () => {
    let app;
    let mockSession;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('fs', () => ({ readFileSync: jest.fn(() => '{}') }));

        mockSession = {
            open: jest.fn(async () => ({
                getDocList: jest.fn(async () => [
                    { qDocId: 'id-1', qDocName: 'App 1' },
                    { qDocId: 'id-2', qDocName: 'App 2' },
                ]),
            })),
            close: jest.fn(async () => true),
        };
        const mockEnigma = { create: jest.fn(() => mockSession) };
        await jest.unstable_mockModule('enigma.js', () => ({ default: mockEnigma }));

        const mockGlobals = {
            config: {
                has: jest.fn((k) => k === 'Butler.restServerEndpointsEnable.senseListApps'),
                get: jest.fn((k) => {
                    if (k === 'Butler.restServerEndpointsEnable.senseListApps') return true;
                    if (k === 'Butler.configEngine.rejectUnauthorized') return false;
                    return undefined;
                }),
            },
            configEngine: { engineVersion: '12.999.0', host: 'example.local', port: 4747, key: 'k', cert: 'c' },
            getEngineHttpHeaders: jest.fn(() => ({ 'X-Header': 'v' })),
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn(), silly: jest.fn() },
            getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        };
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        Fastify = (await import('fastify')).default;
        routePlugin = (await import('../sense_list_apps.js')).default;

        app = Fastify({ logger: false });
        await app.register(routePlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('GET /v4/senselistapps returns simplified app list', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/senselistapps' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([
            { id: 'id-1', name: 'App 1' },
            { id: 'id-2', name: 'App 2' },
        ]);
    });

    test('GET /v4/apps/list returns same list', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/apps/list' });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBe(2);
    });
});
