const apiPostNewRelicMetric = {
    schema: {
        summary: 'Post metrics to New Relic.',
        description: 'This endpoint posts metrics to the New Relic metrics API.',
        body: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Metric name.',
                    example: 'memory.heap',
                    maxLength: 254,
                },
                type: {
                    type: 'string',
                    description: 'Metric type.',
                    example: 'gauge',
                    enum: ['gauge'],
                },
                value: {
                    type: 'number',
                    description: 'Value of the metric.',
                    example: 2.3,
                },
                timestamp: {
                    type: 'number',
                    description:
                        "The metric's start time in Unix time. Uses UTC time zone. This field also support seconds, microseconds, and nanoseconds. However, the data will be converted to milliseconds for storage and query. Metrics reported with a timestamp older than 48 hours ago or newer than 24 hours from the time they are reported are dropped by New Relic. If left empty Butler will use the current time as timestamp.",
                    example: 1642164296053,
                },
                interval: {
                    type: 'number',
                    description: 'The length of the time window (millisec). Required for count and summary metric types.',
                },
                attributes: {
                    type: 'array',
                    description: 'Dimensions that will be associated with the metric.',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                example: 'host.name',
                                maxLength: 254,
                            },
                            value: {
                                type: 'string',
                                example: 'dev.server.com',
                            },
                        },
                    },
                },
            },
            required: ['name', 'type', 'value'],
        },
        response: {
            202: {
                description: 'Data accepted and sent to New Relic.',
                type: 'object',
                properties: {
                    newRelicResultCode: { type: 'number', example: '202' },
                    newRelicResultText: { type: 'string', example: 'Data accepted.' },
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
    apiPostNewRelicMetric,
};
