/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

// Function for handling /senseQRSPing REST endpoint
module.exports.respondSenseQRSPing = function (req, res, next) {
    logRESTCall(req);
    // TODO: Better handling of missing or incorrect parameters

    try {
        // Ping Sense QRS
        globals.qrs.get('/qrs/ping').then(
            function (data) {
                globals.logger.verbose(`QRSPING: Return value: ${data}`);
            },
            function (err) {
                globals.logger.error(`QRSPING: An error occurred: ${err}`);
            },
        );

        res.send(req.query);
        next();
    } catch (err) {
        globals.logger.error(`QRSPING: Error: ${err}`);
        res.send(new errors.InternalError({}, 'Failed dumping app'));
        next();
    }
};
