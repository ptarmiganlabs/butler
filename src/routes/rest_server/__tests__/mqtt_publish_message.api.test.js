import { jest } from '@jest/globals';

let Fastify;
let mqttPlugin;

const mockMqttClient = { publish: jest.fn() };

const mockGlobals = {
    config: {
        has: jest.fn((key) => key === 'Butler.restServerEndpointsEnable.mqttPublishMessage'),
        get: jest.fn((key) => (key === 'Butler.restServerEndpointsEnable.mqttPublishMessage' ? true : undefined)),
    },
    mqttClient: mockMqttClient,
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};

describe('REST: MQTT publish message', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        mqttPlugin = (await import('../mqtt_publish_message.js')).default;

        app = Fastify({ logger: false });
        await app.register(mqttPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('PUT /v4/mqttpublishmessage publishes and returns 201', async () => {
        const payload = { topic: 't/1', message: 'hello' };
        const res = await app.inject({ method: 'PUT', url: '/v4/mqttpublishmessage', payload });
        expect(res.statusCode).toBe(201);
        expect(mockMqttClient.publish).toHaveBeenCalledWith('t/1', 'hello');
    });

    test('Missing params return 400', async () => {
        const res1 = await app.inject({ method: 'PUT', url: '/v4/mqttpublishmessage', payload: { topic: 't/1' } });
        expect(res1.statusCode).toBe(400);
        const res2 = await app.inject({ method: 'PUT', url: '/v4/mqttpublishmessage', payload: { message: 'hello' } });
        expect(res2.statusCode).toBe(400);
    });

    test('Publish error yields 500', async () => {
        // Make publish throw
        mockMqttClient.publish.mockImplementationOnce(() => {
            throw new Error('boom');
        });
        const res = await app.inject({ method: 'PUT', url: '/v4/mqttpublishmessage', payload: { topic: 't/1', message: 'x' } });
        expect(res.statusCode).toBe(500);
    });
});
