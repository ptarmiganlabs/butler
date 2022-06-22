const apiPostNewRelicEvent = {
    schema: {
        summary: 'Post events to New Relic.',
        description: 'This endpoint posts events to the New Relic event API.',
        body: {
            type: 'object',
            properties: {
                eventType: {
                    type: 'string',
                    description: 'Event type. Can be a combination of alphanumeric characters, _ underscores, and : colons.',
                    examples: ['relead-failed'],
                    maxLength: 254,
                },
                timestamp: {
                    type: 'number',
                    description:
                        "The event's start time in Unix time. Uses UTC time zone. This field also support seconds, microseconds, and nanoseconds. However, the data will be converted to milliseconds for storage and query. Events reported with a timestamp older than 48 hours ago or newer than 24 hours from the time they are reported are dropped by New Relic. If left empty Butler will use the current time as timestamp.",
                    examples: [1642164296053],
                },
                attributes: {
                    type: 'array',
                    description: 'Dimensions/attributs that will be associated with the event.',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                examples: ['host.name'],
                                maxLength: 254,
                            },
                            value: {
                                type: 'string',
                                examples: ['dev.server.com'],
                                maxLength: 4096,
                            },
                        },
                    },
                },
            },
            required: ['eventType'],
        },
        response: {
            202: {
                description: 'Data accepted and sent to New Relic.',
                type: 'object',
                properties: {
                    newRelicResultCode: { type: 'number', examples: ['202'] },
                    newRelicResultText: { type: 'string', examples: ['Data accepted.'] },
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
    apiPostNewRelicEvent,
};
