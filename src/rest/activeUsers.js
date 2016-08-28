var globals = require('../globals');

// Function for handling /activeUsers REST endpoint
module.exports.respondActiveUsers = function (req, res, next) {
    // Build JSON of all active users
    var activeUsers = [];
    globals.currentUsers.forEach(function (value, key) {
        activeUsers.push(key);
    });

    req.params.response = JSON.stringify(activeUsers);

    res.send(req.params);
    next();
};
