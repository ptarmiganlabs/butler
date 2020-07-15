// Load global variables and functions
var globals = require('../globals');
// const errors = require('restify-errors');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /senseStartTask REST endpoint
module.exports.respondSenseStartTask = function (req, res, next) {
    logRESTCall(req);

    // Use data in request to start Qlik Sense task
    globals.logger.verbose(`Starting task: ${req.query.taskId}`);

    globals.qrsUtil.senseStartTask.senseStartTask(req.query.taskId);
    res.send(req.query);
    next();
};
