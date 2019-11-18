// Load global variables and functions
var globals = require('../globals');

// Function for handling /senseQRSPing REST endpoint
module.exports.respondSenseQRSPing = function(req, res, next) {
  globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
  globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
  globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

  // Ping Sense QRS
  globals.qrs.get('/qrs/ping').then(
    function(data) {
      globals.logger.verbose(`return value: ${data}`);
    },
    function(err) {
      globals.logger.error(`An error occurred: ${err}`);
    },
  );

  res.send(req.query);
  next();
};
