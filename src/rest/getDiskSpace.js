var globals = require('../globals');
var disk = require('diskusage');

// Function for handling /getDiskSpace REST endpoint
module.exports.respondGetDiskSpace = function (req, res, next) {
    globals.logger.log('info', 'Get disk space: %s', req.query);
    // console.info(req.query);

    // Windows: get disk usage. Takes path as first parameter
    disk.check(req.query.path, function (err, info) {
        globals.logger.log('info', 'Get disk space: %s', info);
        // console.info(info);
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
