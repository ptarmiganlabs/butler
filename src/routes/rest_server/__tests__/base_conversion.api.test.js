import { jest } from '@jest/globals';

// Minimal globals mock so the plugin registers endpoints
const mockGlobals = {
    config: {
        has: jest.fn((key) =>
            ['Butler.restServerEndpointsEnable.base62ToBase16', 'Butler.restServerEndpointsEnable.base16ToBase62'].includes(key),
        ),
        get: jest.fn((key) =>
            ['Butler.restServerEndpointsEnable.base62ToBase16', 'Butler.restServerEndpointsEnable.base16ToBase62'].includes(key)
                ? true
                : undefined,
        ),
    },
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};

let Fastify;
let baseConversionPlugin;

describe('REST: base conversion endpoints', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        baseConversionPlugin = (await import('../base_conversion.js')).default;

        app = Fastify({ logger: false });
        await app.register(baseConversionPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    describe('GET /v4/base62tobase16', () => {
        test('returns 200 with converted base16 for valid base62', async () => {
            const base62 = '6DMW88LpSok9Z7P7hUK0wv7bF';
            const res = await app.inject({ method: 'GET', url: `/v4/base62tobase16?base62=${base62}` });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body).toEqual({
                base62,
                base16: '3199af08bfeeaf5d420f27ed9c01e74370077',
            });
        });

        test('returns 400 when required query param is missing', async () => {
            const res = await app.inject({ method: 'GET', url: '/v4/base62tobase16' });
            expect(res.statusCode).toBe(400);
            const body = res.json();
            // Either Fastify schema validation kicks in, or our custom error
            expect(body.message).toMatch(/Required parameter missing|must have required property 'base62'/i);
        });

        test('returns 500 on invalid characters in base62 input', async () => {
            const res = await app.inject({ method: 'GET', url: '/v4/base62tobase16?base62=***INVALID***' });
            expect([500, 400]).toContain(res.statusCode);
            const body = res.json();
            if (res.statusCode === 500) {
                expect(body.message).toMatch(/Failed converting from base62 to base16/i);
            } else {
                expect(body.message).toBeTruthy();
            }
        });
    });

    describe('GET /v4/base16tobase62', () => {
        test('returns 200 with converted base62 for valid base16', async () => {
            const base16 = '3199af08bfeeaf5d420f27ed9c01e74370077';
            const res = await app.inject({ method: 'GET', url: `/v4/base16tobase62?base16=${base16}` });

            expect(res.statusCode).toBe(200);
            const body = res.json();
            expect(body).toEqual({
                base16,
                base62: '6DMW88LpSok9Z7P7hUK0wv7bF',
            });
        });

        test('returns 400 when required query param is missing', async () => {
            const res = await app.inject({ method: 'GET', url: '/v4/base16tobase62' });
            expect(res.statusCode).toBe(400);
            const body = res.json();
            expect(body.message).toMatch(/Required parameter missing|must have required property 'base16'/i);
        });

        test('returns 500 on invalid characters in base16 input', async () => {
            const res = await app.inject({ method: 'GET', url: '/v4/base16tobase62?base16=XYZ-not-hex' });
            expect([500, 400]).toContain(res.statusCode);
            const body = res.json();
            if (res.statusCode === 500) {
                expect(body.message).toMatch(/Failed converting from base16 to base62/i);
            } else {
                expect(body.message).toBeTruthy();
            }
        });
    });
});
