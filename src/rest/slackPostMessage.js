// Load code from sub modules
var globals = require('../globals');

// Function for handling /slackPostMessage REST endpoint
//module.exports = function respondSlackPostMessage(req, res, next) {
module.exports.respondSlackPostMessage = function (req, res, next) {
    console.info(req.params);

    globals.slack.send({
        text: req.params.msg,
        channel: req.params.channel,
        username: req.params.from_user,
        icon_emoji: req.params.emoji
    });

    res.send(req.params);
    next();
};
