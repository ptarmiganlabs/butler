/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

/**
 * @swagger
 *
 * /v4/mqttpublishmessage:
 *   put:
 *     description: |
 *       Publish a MQTT message.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: message
 *         description: Message pubslihed to MQTT
 *         in: body
 *         schema:
 *           type: object
 *           required:
 *             - topic
 *             - message
 *           properties:
 *             topic:
 *               type: string
 *               example: qliksense/new_data_notification/sales
 *             message:
 *               type: string
 *               description: The message is a generic text string and can thus contain anything that can be represented in a string, including JSON, key-value pairs, plain text etc.
 *               example: dt=20201028
 *     responses:
 *       201:
 *         description: MQTT message successfully published.
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_mqttPublishMessage = function (req, res, next) {
    logRESTCall(req);
    if (globals.mqttClient) {
        try {
            if (req.body.topic == undefined || req.body.message == undefined) {
                // Required parameter is missing
                res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
            } else {
                // Use data in request to publish MQTT message
                if (globals.mqttClient) {
                    globals.mqttClient.publish(req.body.topic, req.body.message);
                }

                res.send(req.body);
            }

            next();
        } catch (err) {
            globals.logger.error(
                `PUBLISHMQTT: Failed publishing MQTT message: ${JSON.stringify(req.body, null, 2)}, error is: ${JSON.stringify(err, null, 2)}`,
            );
            res.send(new errors.InternalError({}, 'Failed publishing MQTT message'));
            next();
        }
    }
};
