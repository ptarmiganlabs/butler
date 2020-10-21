// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

const errors = require('restify-errors');
var anyBase = require('any-base'),
    base62_to_Hex = anyBase('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789abcdef'),
    hex_to_base62 = anyBase('0123456789abcdef', '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

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
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondGET_base62ToBase16 = function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.query.base62 == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            var base16 = base62_to_Hex(req.query.base62);

            res.send({base62: req.query.base62, base16: base16});
        }

        next();
    } catch (err) {
        globals.logger.error(`BASECONVERT: Failed converting from base62 to base16: ${req.query.base62}`);
        res.send(new errors.InternalError({}, 'Failed converting from base62 to base16'));
        next();
    }
};

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
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 */
module.exports.respondGET_base16ToBase62 = function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.query.base16 == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            var base62 = hex_to_base62(req.query.base16);

            res.send({base16: req.query.base16, base62: base62});
        }

        next();
    } catch (err) {
        globals.logger.error(`BASECONVERT: Failed converting from base16 to base62: ${req.query.base62}`);
        res.send(new errors.InternalError({}, 'Failed converting from base16 to base62'));
        next();
    }
};
