// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

const errors = require('restify-errors');

/**
 * @swagger
 *
 * /v4/configfile/endpointsenabled:
 *   get:
 *     description: |
 *       Get a list of all enabled API endpoints, using the key names from the Butler config file.
 *
 *       Note: Endpoints are enabled/disabled in the Butler main configuration file.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Enabled enpooints returned.
 *       500:
 *         description: Internal error, or file overwrite was not allowed.
 *
 */
module.exports.respondGET_configFileListEnbledEndpoints = async function (req, res, next) {
    logRESTCall(req);

    try {
        res.send(201, globals.endpointsEnabled);
        next();
    } catch (err) {
        globals.logger.error(`FILEMOVE: Failed moving file ${req.body.fromFile} to ${req.body.toFile}`);
        res.send(new errors.InternalError({}, 'Failed moving file'));
        next();
    }
};
