var globals = require('../globals');

// Function for handling /mqttPublishMessage REST endpoint
module.exports.respondMQTTPublishMessage = function (req, res, next) {
    // Use data in request to publish MQTT message
    console.info(req.params);

    globals.mqttClient.publish(req.params.topic, req.params.message);

    res.send(req.params);
    next();
};
