// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

// Function for handling /mqttPublishMessage REST endpoint
module.exports.respondMQTTPublishMessage = function (req, res, next) {
    logRESTCall(req);

    // Use data in request to publish MQTT message
    globals.mqttClient.publish(req.query.topic, req.query.message);

    res.send(req.query);
    next();
};
