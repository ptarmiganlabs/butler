// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

/**
 * @swagger
 *
 * /v4/activeusers:
 *   get:
 *     description: Usernames of users with active sessions.<br>
 *       This is determined by reading session start/end messages, which means this value needs some time until it stabilizes on a valid number.<br>
 *       The Butler SOS tool (https://butler-sos.ptarmiganlabs.com) provides more accurate session metrics.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: List of users with active sessions returned.
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

        res.send(req.query);
        next();
    } catch (err) {
        globals.logger.error('ACTIVEUSERCOUNT: Failed gettting active users.');
        res.send(new errors.InternalError({}, 'Failed gettting active users'));
        next();
    }
};
