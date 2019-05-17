// Load global variables and functions
var globals = require('../globals');

// Function for handling /activeUserCount REST endpoint
module.exports.respondActiveUserCount = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    req.query.response = globals.currentUsers.size;

    res.send(req.query);
    next();
};
