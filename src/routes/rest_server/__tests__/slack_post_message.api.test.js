import { jest } from '@jest/globals';

let Fastify;
let routePlugin;

describe('REST: slack_post_message route', () => {
    let app;
    let sent;

    beforeAll(async () => {
        sent = [];
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../lib/slack_api.js', () => ({ default: jest.fn(async (cfg) => sent.push(cfg)) }));

        const mockGlobals = {
            config: {
                has: jest.fn((k) => k === 'Butler.restServerEndpointsEnable.slackPostMessage'),
                get: jest.fn((k) => {
                    if (k === 'Butler.restServerEndpointsEnable.slackPostMessage') return true;
                    if (k === 'Butler.slackNotification.restMessage.webhookURL') return 'https://hooks.slack.test';
                    return undefined;
                }),
            },
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn(), silly: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        };
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        Fastify = (await import('fastify')).default;
        routePlugin = (await import('../slack_post_message.js')).default;

        app = Fastify({ logger: false });
        await app.register(routePlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('PUT /v4/slackpostmessage posts message and returns 201', async () => {
        const payload = { channel: '#general', from_user: 'Butler', msg: 'Hello', emoji: ':wave:' };
        const res = await app.inject({ method: 'PUT', url: '/v4/slackpostmessage', payload });
        expect(res.statusCode).toBe(201);
        expect(sent.length).toBe(1);
        expect(sent[0].channel).toBe('#general');
        expect(res.json()).toEqual(payload);
    });

    test('PUT /v4/slackpostmessage missing params returns 400', async () => {
        const res = await app.inject({ method: 'PUT', url: '/v4/slackpostmessage', payload: { channel: '#general' } });
        expect(res.statusCode).toBe(400);
    });
});
