var globals = require('../globals');

// Function for handling /senseQRSPing REST endpoint
module.exports.respondSenseQRSPing = function (req, res, next) {
    globals.logger.log('info', req.params);
    // console.info(req.params);

    // Ping Sense QRS
    globals.qrs.get( '/qrs/ping')
        .then( function ( data) {
            globals.logger.log('info', 'return value: ', data );
            console.info('return value: ', data );
        }, function ( err ) {
            globals.logger.log('error', 'An error occurred: ', err);
            // console.error( 'An error occurred: ', err);
        }
    );

    res.send(req.params);
    next();
};
