import httpErrors from 'http-errors';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import apiPutMqttMessage from '../../api/mqtt_publish_message.js';

/**
 * Handles the PUT request to publish an MQTT message.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
// eslint-disable-next-line consistent-return
function handlerPutMqttMessage(request, reply) {
    try {
        logRESTCall(request);

        if (globals.mqttClient) {
            try {
                // Fastify schema validation ensures topic and message are present and non-empty
                // Use data in request to publish MQTT message
                if (globals.mqttClient) {
                    globals.mqttClient.publish(request.body.topic, request.body.message);
                }
                reply.type('application/json; charset=utf-8').code(201).send(JSON.stringify(request.body));
            } catch (err) {
                globals.logger.error(
                    `PUBLISHMQTT: Failed publishing MQTT message: ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(
                        err,
                        null,
                        2,
                    )}`,
                );
                reply.send(httpErrors(500, 'Failed publishing MQTT message'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `PUBLISHMQTT: Failed publishing MQTT message: ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
        reply.send(httpErrors(500, 'Failed publishing MQTT message'));
    }
}

/**
 * Registers the REST endpoint for publishing MQTT messages.
 * @param {Object} fastify - The Fastify instance.
 * @param {Object} options - The options object.
 */
// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.mqttPublishMessage') &&
        globals.config.get('Butler.restServerEndpointsEnable.mqttPublishMessage')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/mqttpublishmessage');
        fastify.put('/v4/mqttpublishmessage', apiPutMqttMessage, handlerPutMqttMessage);
    }
};
