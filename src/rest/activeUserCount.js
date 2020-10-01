// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

/**
 * @swagger
 *
 * /v4/activeusercount:
 *   get:
 *     description: Number of users with active sessions.<br>
 *       This is determined by counting session start/end messages, which means this value needs some time until it stabilizes on a valid number.<br>
 *       The Butler SOS tool (https://butler-sos.ptarmiganlabs.com) provides more accurate session metrics.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Active user count returned.
 */
module.exports.respondGET_activeUserCount = function (req, res, next) {
    logRESTCall(req);

    try {
        req.query.response = globals.currentUsers.size;

        res.send(req.query);
        next();
    } catch (err) {
        globals.logger.error('ACTIVEUSERCOUNT: Failed gettting active user count.');
        res.send(new errors.InternalError({}, 'Failed gettting active user count'));
        next();
    }
};
