const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { apiGetAPIEndpointsEnabled } = require('../api/api');

async function handlerGetAPIEndpointsEnabled(request, reply) {
    try {
        logRESTCall(request);

        return globals.endpointsEnabled;
    } catch (err) {
        globals.logger.error(
            `API: Failed retrieving list of enabled API endpoints, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed retrieving list of enabled API endpoints'));
        return null;
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.apiListEnbledEndpoints') &&
        globals.config.get('Butler.restServerEndpointsEnable.apiListEnbledEndpoints')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/configfile/endpointsenabled');

        fastify.get(
            '/v4/configfile/endpointsenabled',
            apiGetAPIEndpointsEnabled,
            handlerGetAPIEndpointsEnabled
        );
    }
};
