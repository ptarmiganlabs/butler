// Load code from sub modules
var globals = require('../globals');

// Function for handling /slackPostMessage REST endpoint
module.exports.respondGetGithubConfig = function (req, res, next) {
    console.info(req.params);

    globals.github.users.getFollowingForUser({
        username: 'mountaindude'
    }, function(err, res) {
        console.info(JSON.stringify(res));
    });

    res.send(req.params);
    next();
};
