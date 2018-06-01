var globals = require('../globals');

// Function for handling /activeUserCount REST endpoint
module.exports.respondActiveUserCount = function (req, res, next) {
    req.query.response = globals.currentUsers.size;

    res.send(req.query);
    next();
};
