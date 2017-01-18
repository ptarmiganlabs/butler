// Load code from sub modules
var globals = require('../globals');

// Function for handling /slackPostMessage REST endpoint
module.exports.respondGetGithubConfig = function (req, res, next) {
    globals.logger.log('info', req.params);
    // console.info(req.params);

    globals.github.users.getFollowingForUser({
        username: 'mountaindude'
    }, function(err, res) {
        globals.logger.log('info', JSON.stringify(res));
        // console.info(JSON.stringify(res));
    });

    res.send(req.params);
    next();
};
