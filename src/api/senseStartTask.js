const apiPutStartTask = {
    schema: {
        summary: 'Start a Qlik Sense task.',
        description:
            "An optional object can be passed in the message body. It is used to pass additional info related to the reload task being started.\nCurrently it's possible to pass in a key-value pair that will be stored in Butler's KV store.\nIf Butler's key-value store is not enabled, any key-value information passed in this parameter will simply be ignored.\nUse type=keyvaluestore to send one or more KV pairs to the KV store.\nSetting TTL=0 disables the TTL feature, i.e. the KV pair will not expire.\n\nThis parameter uses a generic JSON/object format (type + payload).\nIt's thus possible to add new integrations in future Butler versions.",
        params: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    description: 'ID of Qlik Sense task.',
                    example: '210832b5-6174-4572-bd19-3e61eda675ef',
                },
            },
        },
        body: {
            type: 'array',
            description: 'Optional object with extra info.',
            items: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        example: 'keyvaluestore',
                        enum: ['keyvaluestore'],
                    },
                    payload: {
                        type: 'object',
                        example: {
                            namespace: 'MyFineNamespace',
                            key: 'AnImportantKey',
                            value: 'TheValue',
                            ttl: 1000,
                        },
                    },
                },
            },
        },
        response: {
            201: {
                description: 'Task successfully started.',
                type: 'object',
                properties: {
                    taskId: {
                        type: 'string',
                        example: '210832b5-6174-4572-bd19-3e61eda675ef',
                    },
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
    apiPutStartTask,
};
