// Load code from sub modules
var globals = require('../globals');

// Function for handling /slackPostMessage REST endpoint
module.exports.respondSlackPostMessage = function (req, res, next) {
    globals.logger.log('info', req.params);

    globals.slack.send({
        text: req.params.msg,
        channel: req.params.channel,
        username: req.params.from_user,
        icon_emoji: req.params.emoji
    });

    res.send(req.params);
    next();
};
