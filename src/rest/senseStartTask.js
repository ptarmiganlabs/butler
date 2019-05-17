// Load global variables and functions
var globals = require('../globals');

// Function for handling /senseStartTask REST endpoint
module.exports.respondSenseStartTask = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    // Use data in request to start Qlik Sense task
    globals.logger.verbose(`Starting task: ${req.query.taskId}`);

    globals.qrsUtil.senseStartTask.senseStartTask(req.query.taskId);

    res.send(req.query);
    next();
};
