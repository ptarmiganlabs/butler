var globals = require('../globals');

// Function for handling /senseQRSPing REST endpoint
module.exports.respondSenseQRSPing = function (req, res, next) {
    globals.logger.verbose(`Pinging Sense: ${req.query}`);

    // Ping Sense QRS
    globals.qrs.get('/qrs/ping')
        .then(function (data) {
            globals.logger.verbose(`return value: ${data}`);
        }, function (err) {
            globals.logger.error(`An error occurred: ${err}`);
        });

    res.send(req.query);
    next();
};
