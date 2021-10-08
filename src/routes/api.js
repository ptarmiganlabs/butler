'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

/**
 * @swagger
 *
 * /v4/configfile/endpointsenabled:
 *   get:
 *     description: |
 *       Get an array of all enabled API endpoints, using the key names from the Butler config file.
 *
 *       Note: Endpoints are enabled/disabled in the Butler main configuration file.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Enabled enpooints returned.
 *         schema:
 *           type: array
 *           items: {}
 *           example:
 *             - "activeUserCount"
 *             - "activeUsers"
 *             - "apiListEnbledEndpoints"
 *       500:
 *         description: Internal error.
 *
 */
module.exports = async function (fastify, options) {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.apiListEnbledEndpoints') &&
        globals.config.get('Butler.restServerEndpointsEnable.apiListEnbledEndpoints')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/configfile/endpointsenabled');

        // const opts = {
        //     schema: {
        //         response: {
        //             200: {
        //                 type: 'array',
        //                 properties: {
        //                     response: { type: 'array', items: { type: 'string' } }
        //                 }
        //             }
        //         }
        //     }
        // }

        fastify.get('/v4/configfile/endpointsenabled', async function (request, reply) {
            try {
                logRESTCall(request);

                return globals.endpointsEnabled;
            } catch (err) {
                globals.logger.error(`API: Failed retrieving list of enabled API endpoints, error is: ${JSON.stringify(err, null, 2)}`);
                reply.send(httpErrors(500, 'Failed retrieving list of enabled API endpoints'));
            }
        });
    }
};