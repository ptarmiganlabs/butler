const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/log_rest_call');
const { apiGetButlerPing } = require('../api/butler_ping');

async function handlerGetButlerPing(request, reply) {
    try {
        logRESTCall(request);

        return {
            response: 'Butler reporting for duty',
            butlerVersion: globals.appVersion,
        };
    } catch (err) {
        globals.logger.error(`PING: Failing pinging Butler, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failing pinging Butler'));
        return null;
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.butlerping') &&
        globals.config.get('Butler.restServerEndpointsEnable.butlerping')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/butlerping');

        fastify.get('/v4/butlerping', apiGetButlerPing, handlerGetButlerPing);
    }
};
