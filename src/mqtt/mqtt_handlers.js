// Load global variables and functions
var globals = require('../globals');

module.exports.mqttInitHandlers = function () {
    // Handler for MQTT connect messages. Called when connection to MQTT broker has been established
    globals.mqttClient.on('connect', function () {
        console.info('Connected to MQTT broker');

        // Let the world know that Butler is connected to MQTT
        globals.mqttClient.publish('qliksense/butler/mqtt/status', 'Connected to MQTT broker');

        // Have Butler listen to all messages in the qliksense/ subtree
        globals.mqttClient.subscribe('qliksense/#');
    });


    // Handler for MQTT messages matching the previously set up subscription
    globals.mqttClient.on('message', function (topic, message) {
        console.info('MQTT message received');
        console.info(topic.toString());
        console.info(message.toString());

        // **MQTT message dispatch**
        // Start Sense task
        if (topic == 'qliksense/start_task') {
            globals.qrsUtil.senseStartTask.senseStartTask(message.toString());
        }
    });


    // Handler for MQTT errors
    globals.mqttClient.on('error', function (topic, message) {
        // Error occured
        console.error('MQTT error: ' + message);
    });
};
