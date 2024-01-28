export const apiGetAllNamespaces = {
    schema: {
        description: '',
        summary: 'List all currently defined namespaces.',
        response: {
            200: {
                description: 'Array of all namespaces.',
                type: 'array',
                items: {
                    type: 'string',
                },
                examples: [['Weekly sales app', 'Sales ETL step 1', 'Sales ETL step 2']],
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

export const apiGetKVPair = {
    schema: {
        description: '',
        summary: 'Get the value associated with a key, in a specific namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: '',
                    examples: ['Sales ETL step 2'],
                },
            },
        },
        querystring: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: '',
                    examples: ['Last extract timestamp'],
                },
            },
            required: ['key'],
        },
        response: {
            200: {
                description: "Key and it's associated value and metadata returned.",
                type: 'object',
                properties: {
                    namespace: {
                        type: 'string',
                        description: 'Namespace name.',
                        examples: ['Sales ETL step 2'],
                    },
                    key: {
                        type: 'string',
                        description: 'Key name.',
                        examples: ['Last extract timestamp'],
                    },
                    value: {
                        type: 'string',
                        description: 'Value stored in the key-value pair.',
                        examples: ['2020-09-29 17:14:56'],
                    },
                },
            },
            400: {
                description: '"Namespace or key not found" or "Required parameter missing".',
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

export const apiGetKVExists = {
    schema: {
        description: 'Returns true if the specified key exists, otherwise false.',
        summary: 'Checks if a key exists in a namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: '',
                    examples: ['Sales ETL step 2'],
                },
            },
        },
        querystring: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: '',
                    examples: ['Last extract timestamp'],
                },
            },
            required: ['key'],
        },
        response: {
            200: {
                description: 'Key exist/no-exist returned, together with the data if the does exist.',
                type: 'object',
                properties: {
                    keyExists: {
                        type: 'boolean',
                        description: 'true/false flag indicating whether the specified key exists in the given namespace.',
                    },
                    keyValue: {
                        type: 'object',
                        properties: {
                            namespace: {
                                type: 'string',
                                description: 'Namespace name.',
                                examples: ['Sales ETL step 2'],
                            },
                            key: {
                                type: 'string',
                                description: 'Key name.',
                                examples: ['Last extract timestamp'],
                            },
                            value: {
                                type: 'string',
                                description: 'Value stored in the key-value pair.',
                                examples: ['2020-09-29 17:14:56'],
                            },
                        },
                    },
                },
            },
            400: {
                description: '"Namespace not found" or "Required parameter missing".',
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

export const apiPostKVPair = {
    schema: {
        description:
            'If the specified key already exists it will be overwritten.\n\nIf the posted data has a TTL, it will start counting when the post occur.\nI.e. if a previouly posted key also had a TTL, it will be replace with the most recent TTL.',
        summary: 'Create a new key-value pair in the specified namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace.',
                    examples: ['Sales ETL step 2'],
                },
            },
        },
        body: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Key to use',
                    examples: ['ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1'],
                },
                value: {
                    type: 'string',
                    description: 'Value to set',
                    examples: ['12345.789'],
                },
                ttl: {
                    type: 'number',
                    description:
                        'Time to live = how long (milliseconds) the key-value pair should exist before being automatically deleted',
                    examples: [10000],
                },
            },
        },
        response: {
            201: {
                description: 'Key successfully set.',
                type: 'object',
                properties: {
                    namespace: {
                        type: 'string',
                        description: 'Name of namespace.',
                        examples: ['Sales ETL step 2'],
                    },
                    key: {
                        type: 'string',
                        description: 'Key name.',
                        examples: ['Last extract timestamp'],
                    },
                    value: {
                        type: 'string',
                        description: 'Value stored in the key-value pair.',
                        examples: ['2020-09-29 17:14:56'],
                    },
                    ttl: {
                        type: 'number',
                        description: 'Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.',
                        examples: [60000],
                    },
                },
            },
            400: {
                description: '"Namespace not found" or "Required parameter missing".',
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

export const apiDeleteKVPair = {
    schema: {
        description: '',
        summary: 'Delete a key-value pair in a specific namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace.',
                    examples: ['Sales ETL step 2'],
                },
                key: {
                    type: 'string',
                    description: 'Key to use',
                    examples: ['ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1'],
                },
            },
            required: ['namespace', 'key'],
        },
        response: {
            204: {
                description: 'Key-value pair successfully deleted.',
                type: 'string',
                examples: [''],
            },
            400: {
                description: '"Namespace or key not found" or "Required parameter missing".',
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

export const apiDeleteNamespace = {
    schema: {
        description: '',
        summary: 'Delete a namespace and all key-value pairs in it.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace.',
                    examples: ['Sales ETL step 2'],
                },
            },
        },
        response: {
            204: {
                description: 'Namespace successfully deleted.',
                type: 'string',
                examples: [''],
            },
            400: {
                description: '"Namespace not found" or "Required parameter missing".',
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

export const apiGetKeysInNamespace = {
    schema: {
        description: '',
        summary: 'Retrieve a list of all keys present in the specified namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace whose keys should be returned.',
                    examples: ['Sales ETL step 2'],
                },
            },
        },
        response: {
            200: {
                description: 'Object containing namespace name + list of allkeys in the namespace.',
                type: 'object',
                properties: {
                    namespace: {
                        type: 'string',
                        description: '',
                        examples: ['Sales ETL step 2'],
                    },
                    keys: {
                        type: 'array',
                        items: {
                            type: 'object',
                            key: {
                                type: 'string',
                            },
                        },
                        examples: [
                            [
                                {
                                    key: 'ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1',
                                },
                                {
                                    key: 'ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_2',
                                },
                            ],
                        ],
                    },
                },
            },
            400: {
                description: '"Namespace not found" or "Required parameter missing".',
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
