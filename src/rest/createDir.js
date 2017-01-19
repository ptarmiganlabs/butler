var globals = require('../globals');
var mkdirp = require('mkdirp');

// Function for handling /createDir REST endpoint
module.exports.respondCreateDir = function (req, res, next) {
    globals.logger.log('info', 'Creating dir: %s', req.params);

    mkdirp(req.params.directory, function(err) {
        // path was created unless there was error
        globals.logger.log('error', 'created dir ' + req.params.directory);
        globals.logger.log('error', err);
    });

    res.send(req.params);
    next();
};
