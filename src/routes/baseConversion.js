/* eslint-disable camelcase */
const httpErrors = require('http-errors');
const anyBase = require('any-base');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');

const base62_to_Hex = anyBase(
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    '0123456789abcdef'
);
const hex_to_base62 = anyBase(
    '0123456789abcdef',
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
);

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.base62ToBase16') &&
        globals.config.get('Butler.restServerEndpointsEnable.base62ToBase16')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/base62tobase16');

        /**
         * @swagger
         *
         * /v4/base62tobase16:
         *   get:
         *     description: Converts strings from base62 to base16
         *     produces:
         *       - application/json
         *     parameters:
         *       - name: base62
         *         description: The base62 encoded string that should be converted to base16
         *         in: query
         *         required: true
         *         type: string
         *         example: "6DMW88LpSok9Z7P7hUK0wv7bF"
         *     responses:
         *       200:
         *         description: Base conversion successful.
         *         schema:
         *           type: object
         *           properties:
         *             base62:
         *               type: string
         *               description: Original base62 parameter.
         *               example: "6DMW88LpSok9Z7P7hUK0wv7bF"
         *             base16:
         *               type: string
         *               description: Resulting base16 encoded string.
         *               example: "3199af08bfeeaf5d420f27ed9c01e74370077"
         *       400:
         *         description: Required parameter missing.
         *       500:
         *         description: Internal error.
         *
         */
        fastify.get('/v4/base62tobase16', async (request, reply) => {
            try {
                logRESTCall(request);

                if (request.query.base62 === undefined) {
                    // Required parameter is missing
                    reply.send(httpErrors(400, 'Required parameter missing'));
                } else {
                    const base16 = base62_to_Hex(request.query.base62);
                    return { base62: request.query.base62, base16 };
                }

                return { response: 'Butler reporting for duty', butlerVersion: globals.appVersion };
            } catch (err) {
                globals.logger.error(
                    `BASECONVERT: Failed converting from base62 to base16: ${
                        request.query.base62
                    }, error is: ${JSON.stringify(err, null, 2)}`
                );
                reply.send(httpErrors(500, 'Failed converting from base62 to base16'));
                return null;
            }
        });
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.base16ToBase62') &&
        globals.config.get('Butler.restServerEndpointsEnable.base16ToBase62')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/base16tobase62');

        /**
         * @swagger
         *
         * /v4/base16tobase62:
         *   get:
         *     description: Converts strings from base16 to base62
         *     produces:
         *       - application/json
         *     parameters:
         *       - name: base16
         *         description: The base16 encoded string that should be converted to base62
         *         in: query
         *         required: true
         *         type: string
         *         example: ""
         *     responses:
         *       200:
         *         description: Base conversion successful.
         *         schema:
         *           type: object
         *           properties:
         *             base16:
         *               type: string
         *               description: Original base16 parameter.
         *               example: "3199af08bfeeaf5d420f27ed9c01e74370077"
         *             base62:
         *               type: string
         *               description: Resulting base62 encoded string.
         *               example: "6DMW88LpSok9Z7P7hUK0wv7bF"
         *       400:
         *         description: Required parameter missing.
         *       500:
         *         description: Internal error.
         */
        fastify.get('/v4/base16tobase62', async (request, reply) => {
            try {
                logRESTCall(request);

                if (request.query.base16 === undefined) {
                    // Required parameter is missing
                    reply.send(httpErrors(400, 'Required parameter missing'));
                } else {
                    const base62 = hex_to_base62(request.query.base16);
                    return { base16: request.query.base16, base62 };
                }
                return null;
            } catch (err) {
                globals.logger.error(
                    `BASECONVERT: Failed converting from base16 to base62: ${
                        request.query.base16
                    }, error is: ${JSON.stringify(err, null, 2)}`
                );
                reply.send(httpErrors(500, 'Failed converting from base16 to base62'));
                return null;
            }
        });
    }
};
