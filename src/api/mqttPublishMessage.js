const apiPutMqttMessage = {
    schema: {
        summary: 'Retrieve a list of all keys present in the specified namespace.',
        description: '',
        body: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Name of namespace whose keys should be returned.',
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
