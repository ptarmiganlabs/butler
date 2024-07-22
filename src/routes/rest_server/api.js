import httpErrors from 'http-errors';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import apiGetAPIEndpointsEnabled from '../../api/api.js';

async function handlerGetAPIEndpointsEnabled(request, reply) {
    try {
        logRESTCall(request);

        return globals.endpointsEnabled;
    } catch (err) {
        globals.logger.error(`API: Failed retrieving list of enabled API endpoints, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed retrieving list of enabled API endpoints'));
        return null;
    }
}

// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.apiListEnbledEndpoints') &&
        globals.config.get('Butler.restServerEndpointsEnable.apiListEnbledEndpoints')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/configfile/endpointsenabled');

        fastify.get('/v4/configfile/endpointsenabled', apiGetAPIEndpointsEnabled, handlerGetAPIEndpointsEnabled);
    }
};
