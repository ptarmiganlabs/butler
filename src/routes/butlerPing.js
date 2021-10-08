'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

/**
 * @swagger
 *
 * /v4/butlerping:
 *   get:
 *     description: Tests if Butler is alive and responding.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Butler is alive and well.
 *         schema:
 *           type: object
 *           properties:
 *             response:
 *               type: string
 *               description: Message from Butler
 *               example: "Butler reporting for duty"
 *             butlerVersion:
 *               type: string
 *               description: Butler version
 *               example: "5.5.0"
 *       500:
 *         description: Internal error.
 */
module.exports = async function (fastify, options) {
    if (globals.config.has('Butler.restServerEndpointsEnable.butlerping') && globals.config.get('Butler.restServerEndpointsEnable.butlerping')) {
        globals.logger.debug('Registering REST endpoint GET /v4/butlerping');

        const opts = {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            response: { type: 'string' },
                            butlerVersion: {type: 'string'}
                        }
                    }
                }
            }
        }

        fastify.get('/v4/butlerping', async function (request, reply) {
            try {
                logRESTCall(request);

                return { response: "Butler reporting for duty", butlerVersion: globals.appVersion };
            } catch (err) {
                globals.logger.error(`PING: Failing pinging Butler, error is: ${JSON.stringify(err, null, 2)}`);
                reply.send(httpErrors(500, 'Failing pinging Butler'));
            }
        })
    }
};
