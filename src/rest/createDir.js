var globals = require('../globals');
var mkdirp = require('mkdirp');


// Function for handling /createDir REST endpoint
module.exports.respondCreateDir = function (req, res, next) {
    console.info(req.params);

    mkdirp(req.params.directory, function(err) {
        // path was created unless there was error
        console.info(err);
        console.info('created dir ' + req.params.directory);
    });

    res.send(req.params);
    next();
};
