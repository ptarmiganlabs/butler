// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /slackPostMessage REST endpoint
module.exports.respondSlackPostMessage = function (req, res, next) {
    logRESTCall(req);

    globals.slackObj.send({
        text: req.query.msg,
        channel: req.query.channel,
        username: req.query.from_user,
        icon_emoji: req.query.emoji,
    });

    res.send(req.query);
    next();
};
