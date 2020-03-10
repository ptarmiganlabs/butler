// Load global variables and functions
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /butlerPing REST endpoint
module.exports.respondButlerPing = function (req, res, next) {
    logRESTCall(req);

    req.params.response = 'Butler reporting for duty';

    res.send(req.params);
    next();
};
