import httpErrors from 'http-errors';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import apiPutMqttMessage from '../../api/mqtt_publish_message.js';

// eslint-disable-next-line consistent-return
function handlerPutMqttMessage(request, reply) {
    try {
        logRESTCall(request);

        if (globals.mqttClient) {
            try {
                if (request.body.topic === undefined || request.body.message === undefined) {
                    // Required parameter is missing
                    reply.send(httpErrors(400, 'Required parameter missing'));
                } else {
                    // Use data in request to publish MQTT message
                    if (globals.mqttClient) {
                        globals.mqttClient.publish(request.body.topic, request.body.message);
                    }
                    reply.type('application/json; charset=utf-8').code(201).send(JSON.stringify(request.body));
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
