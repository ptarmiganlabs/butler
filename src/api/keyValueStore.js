const apiGetAllNamespaces = {
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
                example: ['Weekly sales app', 'Sales ETL step 1', 'Sales ETL step 2'],
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiGetKVPair = {
    schema: {
        description: '',
        summary: 'Get the value associated with a key, in a specific namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: '',
                    example: 'Sales ETL step 2',
                },
            },
        },
        querystring: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: '',
                    example: 'Last extract timestamp',
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
                        example: 'Sales ETL step 2',
                    },
                    key: {
                        type: 'string',
                        description: 'Key name.',
                        example: 'Last extract timestamp',
                    },
                    value: {
                        type: 'string',
                        description: 'Value stored in the key-value pair.',
                        example: '2020-09-29 17:14:56',
                    },
                    ttl: {
                        type: 'number',
                        description:
                            'Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.',
                        example: 60000,
                    },
                },
            },
            400: {
                description: '"Namespace or key not found" or "Required parameter missing".',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiGetKVExists = {
    schema: {
        description: 'Returns true if the specified key exists, otherwise false.',
        summary: 'Checks if a key exists in a namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: '',
                    example: 'Sales ETL step 2',
                },
            },
        },
        querystring: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: '',
                    example: 'Last extract timestamp',
                },
            },
            required: ['key'],
        },
        response: {
            200: {
                description:
                    'Key exist/no-exist returned, together with the data if the does exist.',
                type: 'object',
                properties: {
                    keyExists: {
                        type: 'boolean',
                        description:
                            'true/false flag indicating whether the specified key exists in the given namespace.',
                    },
                    keyValue: {
                        type: 'object',
                        properties: {
                            namespace: {
                                type: 'string',
                                description: 'Namespace name.',
                                example: 'Sales ETL step 2',
                            },
                            key: {
                                type: 'string',
                                description: 'Key name.',
                                example: 'Last extract timestamp',
                            },
                            value: {
                                type: 'string',
                                description: 'Value stored in the key-value pair.',
                                example: '2020-09-29 17:14:56',
                            },
                            ttl: {
                                type: 'number',
                                description:
                                    'Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.',
                                example: 60000,
                            },
                        },
                    },
                },
            },
            400: {
                description: '"Namespace or key not found" or "Required parameter missing".',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiPostKVPair = {
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
                    example: 'Sales ETL step 2',
                },
            },
        },
        body: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'Key to use',
                    example: 'ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1',
                },
                value: {
                    type: 'string',
                    description: 'Value to set',
                    example: '12345.789',
                },
                ttl: {
                    type: 'number',
                    description:
                        'Time to live = how long (milliseconds) the key-value pair should exist before being automatically deleted',
                    example: 10000,
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
                        example: 'Sales ETL step 2',
                    },
                    key: {
                        type: 'string',
                        description: 'Key name.',
                        example: 'Last extract timestamp',
                    },
                    value: {
                        type: 'string',
                        description: 'Value stored in the key-value pair.',
                        example: '2020-09-29 17:14:56',
                    },
                    ttl: {
                        type: 'number',
                        description:
                            'Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.',
                        example: 60000,
                    },
                },
            },
            400: {
                description: '"Namespace or key not found" or "Required parameter missing".',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiDeleteKVPair = {
    schema: {
        description: '',
        summary: 'Delete a key-value pair in a specific namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace.',
                    example: 'Sales ETL step 2',
                },
                key: {
                    type: 'string',
                    description: 'Key to use',
                    example: 'ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1',
                },
            },
        },
        response: {
            204: {
                description: 'Key-value pair successfully deleted.',
                type: 'object',
            },
            400: {
                description: '"Namespace or key not found" or "Required parameter missing".',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiDeleteNamespace = {
    schema: {
        description: '',
        summary: 'Delete a namespace and all key-value pairs in it.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace.',
                    example: 'Sales ETL step 2',
                },
            },
        },
        response: {
            204: {
                description: 'Namespace successfully deleted.',
                type: 'object',
            },
            400: {
                description: '"Namespace not found" or "Required parameter missing".',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiGetKeysInNamespace = {
    schema: {
        description: '',
        summary: 'Retrieve a list of all keys present in the specified namespace.',
        params: {
            type: 'object',
            properties: {
                namespace: {
                    type: 'string',
                    description: 'Name of namespace whose keys should be returned.',
                    example: 'Sales ETL step 2',
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
                        example: 'Sales ETL step 2',
                    },
                    keys: {
                        type: 'array',
                        items: {
                            type: 'object',
                            key: {
                                type: 'string',
                            },
                        },
                        example: [
                            { key: 'ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1' },
                            { key: 'ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_2' },
                        ],
                    },
                },
            },
            400: {
                description: '"Namespace not found" or "Required parameter missing".',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

module.exports = {
    apiGetAllNamespaces,
    apiGetKVPair,
    apiGetKVExists,
    apiPostKVPair,
    apiDeleteKVPair,
    apiDeleteNamespace,
    apiGetKeysInNamespace,
};
