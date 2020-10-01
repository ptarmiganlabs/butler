// Load global variables and functions
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

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
 *         description: 
 */
module.exports.respondGET_butlerPing = function (req, res, next) {
    logRESTCall(req);

    req.params.response = 'Butler reporting for duty';

    res.send(req.params);
    next();
};
