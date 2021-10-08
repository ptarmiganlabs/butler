const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');

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
 *       400:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
// eslint-disable-next-line consistent-return
function handler(request, reply) {
    try {
        logRESTCall(request);

        if (globals.mqttClient) {
            try {
                if (request.query.topic === undefined || request.query.message === undefined) {
                    // Required parameter is missing
                    reply.send(httpErrors(400, 'Required parameter missing'));
                } else {
                    // Use data in request to publish MQTT message
                    if (globals.mqttClient) {
                        globals.mqttClient.publish(request.query.topic, request.query.message);
                    }

                    return request.body;
                }
            } catch (err) {
                globals.logger.error(
                    `PUBLISHMQTT: Failed publishing MQTT message: ${JSON.stringify(
                        request.body,
                        null,
                        2
                    )}, error is: ${JSON.stringify(err, null, 2)}`
                );
                reply.send(httpErrors(500, 'Failed publishing MQTT message'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `PUBLISHMQTT: Failed publishing MQTT message: ${JSON.stringify(
                request.body,
                null,
                2
            )}, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed publishing MQTT message'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.mqttPublishMessage') &&
        globals.config.get('Butler.restServerEndpointsEnable.mqttPublishMessage')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/mqttpublishmessage');

        fastify.put('/v4/mqttpublishmessage', handler);
    }
};
