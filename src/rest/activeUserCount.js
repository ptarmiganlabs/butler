// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

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
