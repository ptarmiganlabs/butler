// Load global variables and functions
var globals = require('../globals');

var mkdirp = require('mkdirp');

// Function for handling /createDir REST endpoint
module.exports.respondCreateDir = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    mkdirp(req.query.directory, function (err) {
        // path was created unless there was error
        if (err) {
            globals.logger.error(`Error while creating dir ${req.query.directory}: ${err}`);
        } else {
            globals.logger.verbose(`Created dir ${req.query.directory}`);
        }
    });

    res.send(req.query);
    next();
};
