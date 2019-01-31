// Load code from sub modules
var globals = require('../globals');

var mkdirp = require('mkdirp');

// Function for handling /createDir REST endpoint
module.exports.respondCreateDir = function (req, res, next) {
    globals.logger.verbose(`Creating dir: ${req.query}`);

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
