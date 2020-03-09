// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('./logRESTCall');

// Function for handling /butlerPing REST endpoint
module.exports.respondButlerPing = function (req, res, next) {
    logRESTCall(req);
    // globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    // globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    // globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    req.params.response = 'Butler reporting for duty';

    res.send(req.params);
    next();
};
