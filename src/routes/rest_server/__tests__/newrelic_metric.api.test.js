import { jest } from '@jest/globals';

let Fastify;
let nrMetricPlugin;

const mockAxios = { post: jest.fn(async () => ({ status: 202, statusText: 'Accepted' })) };

const mockGlobals = {
    config: {
        has: jest.fn((key) => key === 'Butler.restServerEndpointsEnable.newRelic.postNewRelicMetric'),
        get: jest.fn((key) => {
            switch (key) {
                case 'Butler.restServerEndpointsEnable.newRelic.postNewRelicMetric':
                    return true;
                case 'Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.attribute.static':
                    return [{ name: 'app', value: 'butler' }];
                case 'Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.url':
                    return 'https://metric-api.newrelic.com/metric/v1';
                case 'Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.header':
                    return [{ name: 'X-Custom', value: 'yes' }];
                default:
                    return undefined;
            }
        }),
        Butler: {
            thirdPartyToolsCredentials: {
                newRelic: [{ accountName: 'acc1', insertApiKey: 'nrk1', accountId: 111 }],
            },
            restServerEndpointsConfig: {
                newRelic: {
                    postNewRelicMetric: {
                        destinationAccount: ['acc1'],
                    },
                },
            },
        },
    },
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
};

describe('REST: New Relic Metric', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios, __esModule: true }));
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        nrMetricPlugin = (await import('../newrelic_metric.js')).default;

        app = Fastify({ logger: false });
        await app.register(nrMetricPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('POST /v4/newrelic/metric returns 202 and calls axios.post', async () => {
        const payload = {
            name: 'cpu',
            type: 'gauge',
            value: 1.23,
            timestamp: 123,
            attributes: [{ name: 'host', value: 'local' }],
        };
        const res = await app.inject({ method: 'POST', url: '/v4/newrelic/metric', payload });
        expect(res.statusCode).toBe(202);
        expect(mockAxios.post).toHaveBeenCalled();
        const lastCall = mockAxios.post.mock.calls.at(-1);
        expect(lastCall[0]).toBe('https://metric-api.newrelic.com/metric/v1');
        expect(lastCall[2].headers['Api-Key']).toBe('nrk1');
    });

    test('POST /v4/newrelic/metric non-202 yields error (schema only allows gauge)', async () => {
        // Schema enum only allows 'gauge'; verify non-202 path
        const payload1 = { name: 'requests', type: 'gauge', value: 10, timestamp: 456, interval: 1000, attributes: [] };
        const original = mockAxios.post;
        mockAxios.post = jest.fn(async () => ({ status: 418, statusText: 'I am a teapot' }));
        const res = await app.inject({ method: 'POST', url: '/v4/newrelic/metric', payload: payload1 });
        expect(res.statusCode).toBe(418);
        mockAxios.post = original;
    });
});
