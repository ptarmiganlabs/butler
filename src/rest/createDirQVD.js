var globals = require('../globals');
var mkdirp = require('mkdirp');

// Function for handling /createDirQVD REST endpoint
module.exports.respondCreateDirQVD = function (req, res, next) {
    console.info(req.params);

    mkdirp(globals.qvdFolder + '/' + req.params.directory, function(err) {
        // path was created unless there was error
        console.info(err);
        console.info('created QVD dir ' + req.params.directory);
    });

    res.send(req.params);
    next();
};
