export const apiGetBase62ToBase16 = {
    schema: {
        description: 'Converts strings from base62 to base16.',
        summary: 'Converts strings from base62 to base16.',
        querystring: {
            type: 'object',
            properties: {
                base62: {
                    type: 'string',
                    description: 'The base62 encoded string that should be converted to base16',
                    examples: ['6DMW88LpSok9Z7P7hUK0wv7bF'],
                },
            },
            required: ['base62'],
        },
        response: {
            200: {
                description: 'Base conversion successful.',
                type: 'object',
                properties: {
                    base62: {
                        type: 'string',
                        description: 'The base62 encoded string that should be converted to base16',
                    },
                    base16: {
                        type: 'string',
                        description: 'Resulting base16 encoded string.',
                    },
                },
                examples: [{ base62: '6DMW88LpSok9Z7P7hUK0wv7bF', base16: '3199af08bfeeaf5d420f27ed9c01e74370077' }],
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

export const apiGetBase16ToBase62 = {
    schema: {
        description: 'Converts strings from base16 to base62.',
        summary: 'Converts strings from base16 to base62.',
        querystring: {
            type: 'object',
            properties: {
                base16: {
                    type: 'string',
                    description: 'The base16 encoded string that should be converted to base62',
                    examples: ['3199af08bfeeaf5d420f27ed9c01e74370077'],
                },
            },
            required: ['base16'],
        },
        response: {
            200: {
                description: 'Base conversion successful.',
                type: 'object',
                properties: {
                    base62: {
                        type: 'string',
                        description: 'The base62 encoded string that should be converted to base16',
                    },
                    base16: {
                        type: 'string',
                        description: 'Resulting base62 encoded string.',
                    },
                },
                examples: [
                    {
                        base16: '3199af08bfeeaf5d420f27ed9c01e74370077',
                        base62: '6DMW88LpSok9Z7P7hUK0wv7bF',
                    },
                ],
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
