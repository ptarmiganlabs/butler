// Load global variables and functions
var globals = require('../globals');

// Function for handling /mqttPublishMessage REST endpoint
module.exports.respondMQTTPublishMessage = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    // Use data in request to publish MQTT message
    globals.mqttClient.publish(req.query.topic, req.query.message);

    res.send(req.query);
    next();
};
