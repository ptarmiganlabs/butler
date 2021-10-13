// Load global variables and functions0
const httpErrors = require('http-errors');

const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { apiGetActiveUserCount } = require('../api/activeUsers');

async function handlerGetActiveUserCount(request, reply) {
    try {
        logRESTCall(request);

        return { response: globals.currentUsers.size };
    } catch (err) {
        globals.logger.error(
            `ACTIVEUSERCOUNT: Failed gettting active user count, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed gettting active user count'));
        return null;
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.activeUserCount') &&
        globals.config.get('Butler.restServerEndpointsEnable.activeUserCount')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/activeusercount');

        fastify.get('/v4/activeusercount', apiGetActiveUserCount, handlerGetActiveUserCount);
    }
};
