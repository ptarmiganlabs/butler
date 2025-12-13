/**
 * UDP Queue Status Route
 *
 * Route handler for UDP message queue status endpoint
 */

import httpErrors from 'http-errors';
import globals from '../../globals.js';
import udpQueueStatus from '../../api/udp_queue_status.js';

const udpQueueStatusRoute = async (fastify, options, next) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.udpQueueStatus') &&
        globals.config.get('Butler.restServerEndpointsEnable.udpQueueStatus')
    ) {
        globals.logger.debug('[QSEOW] UDP QUEUE STATUS: Registering REST endpoint GET /v4/udpqueue/status');

        fastify.get('/v4/udpqueue/status', async (request, reply) => {
            try {
                await udpQueueStatus(request, reply);
            } catch (err) {
                globals.logger.error(`[QSEOW] UDP QUEUE STATUS: ${globals.getErrorMessage(err)}`);
                reply.send(httpErrors(500, 'Failed to get UDP queue status'));
            }
        });
    }
    next();
};

export default udpQueueStatusRoute;
