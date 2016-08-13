var globals = require('../globals');

// Function for handling /activeUsers REST endpoint
module.exports.respondActiveUsers = function (req, res, next) {
    // Build JSON of all active users
    var activeUsers = [];
    globals.currentUsers.forEach(function (value, key) {
        activeUsers.push(key);
        console.log('-----');
        console.log(key);
        console.log(value);
//        activeUsers.userName = key;
    });

    req.params.response = JSON.stringify(activeUsers);

    console.log(activeUsers);
    console.log(JSON.stringify(activeUsers));
    console.log(JSON.stringify(activeUsers));

    res.send(req.params);
    next();
};
