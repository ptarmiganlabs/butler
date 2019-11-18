// Load global variables and functions
var globals = require('../globals');

var disk = require('diskusage');

// Function for handling /getDiskSpace REST endpoint
module.exports.respondGetDiskSpace = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

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
