var globals = require('../globals');

// Function for handling /mqttPublishMessage REST endpoint
module.exports.respondMQTTPublishMessage = function (req, res, next) {
    // Use data in request to publish MQTT message
    globals.logger.log('info', req.query);
    // console.info(req.query);

    globals.mqttClient.publish(req.query.topic, req.query.message);

    res.send(req.query);
    next();
};
