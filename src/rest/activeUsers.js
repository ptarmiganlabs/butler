// Load global variables and functions
var globals = require('../globals');

// Function for handling /activeUsers REST endpoint
module.exports.respondActiveUsers = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    // Build JSON of all active users
    var activeUsers = [];
    globals.currentUsers.forEach(function (value, key) {
        activeUsers.push(key);
    });

    req.query.response = JSON.stringify(activeUsers);

    res.send(req.query);
    next();
};
