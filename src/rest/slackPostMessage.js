// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('./logRESTCall');

// Function for handling /slackPostMessage REST endpoint
module.exports.respondSlackPostMessage = function (req, res, next) {
    logRESTCall(req);
    // globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    // globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    // globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    globals.slackObj.send({
        text: req.query.msg,
        channel: req.query.channel,
        username: req.query.from_user,
        icon_emoji: req.query.emoji,
    });

    res.send(req.query);
    next();
};
