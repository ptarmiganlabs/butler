const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');

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
// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.butlerping') &&
        globals.config.get('Butler.restServerEndpointsEnable.butlerping')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/butlerping');

        fastify.get('/v4/butlerping', async (request, reply) => {
            try {
                logRESTCall(request);

                return { response: 'Butler reporting for duty', butlerVersion: globals.appVersion };
            } catch (err) {
                globals.logger.error(
                    `PING: Failing pinging Butler, error is: ${JSON.stringify(err, null, 2)}`
                );
                reply.send(httpErrors(500, 'Failing pinging Butler'));
                return null;
            }
        });
    }
};
