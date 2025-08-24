import Fastify from 'fastify';

describe('plugins', () => {
    test('sensible plugin registers', async () => {
        const fastify = Fastify({ logger: false });
        const sensible = (await import('../sensible.js')).default;
        await fastify.register(sensible);
        // A method provided by @fastify/sensible should exist (e.g., httpErrors)
        expect(fastify.httpErrors).toBeDefined();
        await fastify.close();
    });

    test('support plugin decorates instance', async () => {
        const fastify = Fastify({ logger: false });
        const support = (await import('../support.js')).default;
        await fastify.register(support);
        expect(fastify.someSupport()).toBe('hugs');
        await fastify.close();
    });
});
