// Load code from sub modules
var globals = require('../globals');

// Function for handling /slackPostMessage REST endpoint
module.exports.respondSlackPostMessage = function (req, res, next) {
    globals.logger.log('info', req.query);
    console.info(req.query);

    globals.slack.send({
        text: req.query.msg,
        channel: req.query.channel,
        username: req.query.from_user,
        icon_emoji: req.query.emoji
    });

    res.send(req.query);
    next();
};
