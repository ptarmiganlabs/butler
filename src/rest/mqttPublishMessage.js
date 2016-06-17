// Function for handling /mqttPublishMessage REST endpoint
// function respondMQTTPublishMessage(req, res, next) {
module.exports.respondMQTTPublishMessage = function (req, res, next) {
  // Use data in request to publish MQTT message
  console.info(req.params);

  mqttClient.publish(req.params.topic, req.params.message);

  res.send(req.params);
  next();
};
