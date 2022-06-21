const fp = require('fastify-plugin');

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
module.exports = fp(async (fastify, opts) => {
    // eslint-disable-next-line global-require
    await fastify.register(require('@fastify/sensible'), {
        errorHandler: false,
    });
});
