'use strict';

// Load global variables and functions
var globals = require('../globals');

// Function for logging info about REST call
module.exports.logRESTCall = function (req) {
    globals.logger.info(`${req.url} called from ${req.ip}`);
    globals.logger.debug(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.debug(`Body: ${JSON.stringify(req.body, null, 2)}`);
    globals.logger.debug(`Params: ${JSON.stringify(req.params, null, 2)}`);
    globals.logger.debug(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
};
