import fp from 'fastify-plugin';

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
// eslint-disable-next-line no-unused-vars
export default fp(async (fastify, _opts) => {
    // eslint-disable-next-line global-require
    await fastify.register(import('@fastify/sensible'), {
        errorHandler: false,
    });
});
