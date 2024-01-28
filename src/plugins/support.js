import fp from 'fastify-plugin';

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope

// eslint-disable-next-line no-unused-vars
export default fp(async (fastify, _opts) => {
    // eslint-disable-next-line arrow-body-style
    fastify.decorate('someSupport', () => {
        return 'hugs';
    });
});
