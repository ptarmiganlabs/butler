// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

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
module.exports.respondGET_activeUsers = function (req, res, next) {
    logRESTCall(req);

    try {
        // Build JSON of all active users
        var activeUsers = [];
        globals.currentUsers.forEach(function (value, key) {
            activeUsers.push(key);
        });

        req.query.response = JSON.stringify(activeUsers);

        res.send(200, req.query);
        next();
    } catch (err) {
        globals.logger.error('ACTIVEUSERCOUNT: Failed gettting active users.');
        res.send(new errors.InternalError({}, 'Failed gettting active users'));
        next();
    }
};
