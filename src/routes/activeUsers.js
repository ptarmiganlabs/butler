const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');

/**
 * @swagger
 *
 * /v4/activeusers:
 *   get:
 *     description: |
 *       Usernames of users with active sessions.
 * 
 *       This is determined by reading session start/end messages, which means this value needs some time until it stabilizes on a valid number.
 *       Also, the session start/stop messages are sent as MQTT messages to a MQTT broker, after which they are acted on by Buter.
 *       This means a working MQTT broker is needed to get any session related metrics via Butler.

 *       The __[Butler SOS tool](https://butler-sos.ptarmiganlabs.com)__ provides both more accurate session metrics, as well as a multitude of other SenseOps related metrics.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Success. Array of users with active sessions.
 *         schema:
 *           type: array
 *           items: {}
 *           example:
 *             - "joe"
 *             - "anna"
 *             - "bill"
 *       500:
 *         description: Internal error.
*/
// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.activeUsers') &&
        globals.config.get('Butler.restServerEndpointsEnable.activeUsers')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/activeusers');

        fastify.get('/v4/activeusers', async (request, reply) => {
            try {
                logRESTCall(request);

                // Build JSON of all active users
                const activeUsers = [];
                globals.currentUsers.forEach((value, key) => {
                    activeUsers.push(key);
                });

                return { response: JSON.stringify(activeUsers) };
            } catch (err) {
                globals.logger.error(
                    `ACTIVEUSERCOUNT: Failed gettting active users, error is: ${JSON.stringify(
                        err,
                        null,
                        2
                    )}`
                );
                reply.send(httpErrors(500, 'Failed gettting active users'));
                return null;
            }
        });
    }
};
