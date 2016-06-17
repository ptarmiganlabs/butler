// Function for handling /senseQRSPing REST endpoint
// function respondSenseQRSPing(req, res, next) {
module.exports.respondSenseQRSPing = function (req, res, next) {
  console.info(req.params);

  // Ping Sense QRS
  qrs.get( '/qrs/ping')
    .then( function ( data) {
      console.info('return value: ', data );

    }, function ( err ) {
      console.error( 'An error occurred: ', err);

    }
  )

  res.send(req.params);
  next();
};
