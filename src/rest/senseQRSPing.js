// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /senseQRSPing REST endpoint
module.exports.respondSenseQRSPing = function (req, res, next) {
    logRESTCall(req);

    // Ping Sense QRS
    globals.qrs.get('/qrs/ping').then(
        function (data) {
            globals.logger.verbose(`return value: ${data}`);
        },
        function (err) {
            globals.logger.error(`An error occurred: ${err}`);
        },
    );

    res.send(req.query);
    next();
};
