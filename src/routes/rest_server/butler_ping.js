import httpErrors from 'http-errors';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import apiGetButlerPing from '../../api/butler_ping.js';

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
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.butlerping') &&
        globals.config.get('Butler.restServerEndpointsEnable.butlerping')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/butlerping');

        fastify.get('/v4/butlerping', apiGetButlerPing, handlerGetButlerPing);
    }
};
