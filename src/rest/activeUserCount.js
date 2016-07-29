var globals = require('../globals');

// Function for handling /activeUserCount REST endpoint
module.exports.respondActiveUserCount = function (req, res, next) {
    req.params.response = globals.currentUsers.size;

    res.send(req.params);
    next();
};
