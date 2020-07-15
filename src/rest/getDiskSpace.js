// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

var disk = require('diskusage');

// Function for handling /getDiskSpace REST endpoint
module.exports.respondGetDiskSpace = function (req, res, next) {
    logRESTCall(req);

    // Windows: get disk usage. Takes path as first parameter
    disk.check(req.query.path, function (err, info) {
        globals.logger.info(`Get disk space: ${info}`);

        req.query.available = info.available;
        req.query.free = info.free;
        req.query.total = info.total;
    });

    res.send(req.query);
    next();
};

/*
   OSX/Linux: get disk usage. Takes mount point as first parameter
  disk.check(req.query.path, function(err, info) {
    req.query.available = info.available;
    req.query.free = info.free;
    req.query.total = info.total;
  });
*/
