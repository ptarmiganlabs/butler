import { jest } from '@jest/globals';

let Fastify;
let nrEventPlugin;

const mockAxios = { request: jest.fn(async () => ({ status: 202, statusText: 'Accepted' })) };

const mockGlobals = {
    config: {
        has: jest.fn((key) =>
            [
                'Butler.restServerEndpointsEnable.newRelic.postNewRelicEvent',
                'Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.attribute.static',
            ].includes(key),
        ),
        get: jest.fn((key) => {
            switch (key) {
                case 'Butler.restServerEndpointsEnable.newRelic.postNewRelicEvent':
                    return true;
                case 'Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.attribute.static':
                    return [{ name: 'app', value: 'butler' }];
                case 'Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.url':
                    return 'https://insights-collector.newrelic.com';
                case 'Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.header':
                    return [{ name: 'X-Custom', value: 'yes' }];
                default:
                    return undefined;
            }
        }),
        Butler: {
            thirdPartyToolsCredentials: {
                newRelic: [
                    { accountName: 'acc1', insertApiKey: 'nrk1', accountId: 111 },
                    { accountName: 'acc2', insertApiKey: 'nrk2', accountId: 222 },
                ],
            },
            restServerEndpointsConfig: {
                newRelic: {
                    postNewRelicEvent: {
                        destinationAccount: ['acc1', 'acc2'],
                    },
                },
            },
        },
    },
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};

describe('REST: New Relic Event', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios, __esModule: true }));
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        nrEventPlugin = (await import('../newrelic_event.js')).default;

        app = Fastify({ logger: false });
        await app.register(nrEventPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('POST /v4/newrelic/event returns 202 and calls axios for all destination accounts', async () => {
        const payload = { eventType: 'TestEvent', attributes: [{ name: 'X', value: 1 }], timestamp: 123 };
        const res = await app.inject({ method: 'POST', url: '/v4/newrelic/event', payload });
        expect(res.statusCode).toBe(202);
        // Should be called twice for acc1 and acc2
        expect(mockAxios.request.mock.calls.length).toBeGreaterThanOrEqual(2);
        // Verify last call still has method post
        const lastCall = mockAxios.request.mock.calls.at(-1)[0];
        expect(lastCall.method).toBe('post');
    });

    test('POST /v4/newrelic/event missing eventType returns 400 (schema)', async () => {
        const res = await app.inject({ method: 'POST', url: '/v4/newrelic/event', payload: { attributes: [] } });
        expect(res.statusCode).toBe(400);
    });

    test('POST /v4/newrelic/event non-202/200 becomes error', async () => {
        const original = mockAxios.request;
        mockAxios.request = jest.fn(async () => ({ status: 418, statusText: 'I am a teapot' }));
        const res = await app.inject({ method: 'POST', url: '/v4/newrelic/event', payload: { eventType: 'X' } });
        expect(res.statusCode).toBe(418);
        mockAxios.request = original;
    });
});
