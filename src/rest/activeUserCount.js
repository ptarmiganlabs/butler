// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /activeUserCount REST endpoint
module.exports.respondActiveUserCount = function (req, res, next) {
    logRESTCall(req);

    req.query.response = globals.currentUsers.size;

    res.send(req.query);
    next();
};
