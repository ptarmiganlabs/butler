/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');

// Function for logging info about REST call
module.exports.logRESTCall = function (req) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
};
