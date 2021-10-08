'use strict';

// Load global variables and functions0
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

/**
 * @swagger
 *
 * /v4/activeusercount:
 *   get:
 *     description: |
 *       Number of users with active sessions.
 * 
 *       This is determined by reading session start/end messages, which means this value needs some time until it stabilizes on a valid number.
 *       Also, the session start/stop messages are sent as MQTT messages to a MQTT broker, after which they are acted on by Buter.
 *       This means a working MQTT broker is needed to get any session related metrics via Butler.
 * 
 *       The __[Butler SOS tool](https://butler-sos.ptarmiganlabs.com)__ provides both more accurate session metrics, as well as a multitude of other SenseOps related metrics.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Active user count returned.
 *         schema:
 *           type: object
 *           properties:
 *             userCount:
 *               type: string
 *               description: Number of users with active sessions
 *               example: "subfolder/file1.qvd"
 */
module.exports = async function (fastify, options) {
    if (globals.config.has('Butler.restServerEndpointsEnable.activeUserCount') && globals.config.get('Butler.restServerEndpointsEnable.activeUserCount')) {
        globals.logger.debug('Registering REST endpoint GET /v4/activeusercount');

        const opts = {
            schema: {
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            response: { type: 'number', minimum: 0 }
                        }
                    }
                }
            }
        }

        fastify.get('/v4/activeusercount', async function (request, reply) {
            logRESTCall(request);

            try {
                return { response: globals.currentUsers.size };
            } catch (err) {
                globals.logger.error(`ACTIVEUSERCOUNT: Failed gettting active user count, error is: ${JSON.stringify(err, null, 2)}`);
                reply.send(httpErrors(500, 'Failed gettting active user count'));
            }
        })
    }
};
