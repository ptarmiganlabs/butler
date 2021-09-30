/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

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
 *       500:
 *         description: Internal error.
 */
// module.exports.respondGET_butlerPing = function (req, res, next) {
async function respondGET_butlerPing(fastify, options) {
    logRESTCall(req);

    try {
        req.params.response = 'Butler reporting for duty';

        res.send(req.params);
        next();
    } catch (err) {
        globals.logger.error(`CREATEDIR: Failed creating directory: ${req.body.directory}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed creating directory'));
        next();
    }
};

module.exports = respondGET_butlerPing;
