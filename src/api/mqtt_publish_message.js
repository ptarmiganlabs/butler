const apiPutMqttMessage = {
    schema: {
        summary: 'Publish a message to a MQTT topic.',
        description: '',
        body: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Topic to which message should be published.',
                    example: 'qliksense/new_data_notification/sales',
                },
                message: {
                    type: 'string',
                    description:
                        'The message is a generic text string and can thus contain anything that can be represented in a string, including JSON, key-value pairs, plain text etc.',
                    example: 'dt=20201028',
                },
            },
            required: ['topic', 'message'],
        },
        response: {
            201: {
                description: 'MQTT message successfully published.',
                type: 'object',
                properties: {
                    topic: { type: 'string', example: 'qliksense/new_data_notification/sales' },
                    message: { type: 'string', example: 'dt=20201028' },
                },
            },
            400: {
                description: 'Required parameter missing.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
                properties: {
                    statusCode: { type: 'number' },
                    code: { type: 'string' },
                    error: { type: 'string' },
                    message: { type: 'string' },
                    time: { type: 'string' },
                },
            },
        },
    },
};

module.exports = {
    apiPutMqttMessage,
};
