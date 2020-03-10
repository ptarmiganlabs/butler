// Load global variables and functions
var globals = require('../globals');
var mkdirp = require('mkdirp');
const errors = require('restify-errors');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /createDir REST endpoint
module.exports.respondCreateDir = function (req, res, next) {
    logRESTCall(req);

    mkdirp(req.query.directory)
        .then(made =>
            globals.logger.verbose(`Created dir ${made}`))

        .catch(function (error) {
            globals.logger.error(`CREATE_DIR: ${JSON.stringify(error, null, 2)}`);
            return next(new errors.InternalServerError('Failed to create directory.'));
        });

    res.send(req.query);
    next();
};
