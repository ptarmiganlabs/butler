// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /activeUsers REST endpoint
module.exports.respondActiveUsers = function (req, res, next) {
    logRESTCall(req);

    // Build JSON of all active users
    var activeUsers = [];
    globals.currentUsers.forEach(function (value, key) {
        activeUsers.push(key);
    });

    req.query.response = JSON.stringify(activeUsers);

    res.send(req.query);
    next();
};
