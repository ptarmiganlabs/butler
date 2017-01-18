var globals = require('../globals');
var mkdirp = require('mkdirp');

// Function for handling /createDirQVD REST endpoint
module.exports.respondCreateDirQVD = function (req, res, next) {
    globals.logger.log('info', 'Creating dir: %s', req.params);
    // console.info(req.params);

    mkdirp(globals.qvdFolder + '/' + req.params.directory, function(err) {
        // path was created unless there was error
        globals.logger.log('error', 'created dir ' + req.params.directory);
        globals.logger.log('error', err);
        // console.info(err);
        // console.info('created QVD dir ' + req.params.directory);
    });

    res.send(req.params);
    next();
};
