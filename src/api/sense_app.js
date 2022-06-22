const apiPutAppReload = {
    schema: {
        summary: 'Do a stand-alone reload of a Qlik Sense app, without using a task.',
        description: '',
        params: {
            type: 'object',
            properties: {
                appId: {
                    type: 'string',
                    description: 'ID of Qlik Sense app.',
                    examples: ['210832b5-6174-4572-bd19-3e61eda675ef'],
                },
            },
        },
        body: {
            type: 'object',
            properties: {
                reloadMode: {
                    type: 'integer',
                    description: 'Reload mode that will be used. 0, 1 or 2. If not specified 0 will be used',
                },
                partialReload: {
                    type: 'boolean',
                    description: 'Should a full (=false) or partial (=true) reload be done? If not specified a full reload will be done.',
                    examples: [true],
                },
                startQSEoWTaskOnSuccess: {
                    type: 'array',
                    description: 'Array of task IDs that should be started when the app has successfully reloaded.',
                    items: {
                        type: 'string',
                    },
                    examples: [['09b3c78f-04dd-45e3-a4bf-1b074d6572fa', 'eaf1da4f-fd44-4cea-b2de-7b67a6496ee3']],
                },
                startQSEoWTaskOnFailure: {
                    type: 'array',
                    description: 'Array of task IDs that should be started if the app fails reloading.',
                    items: {
                        type: 'string',
                    },
                    examples: [['09b3c78f-04dd-45e3-a4bf-1b074d6572fa', 'eaf1da4f-fd44-4cea-b2de-7b67a6496ee3']],
                },
            },
        },
        response: {
            201: {
                description: 'App successfully reloaded.',
                type: 'object',
                properties: {
                    appId: {
                        type: 'string',
                        description: 'ID of reloaded app',
                        examples: ['210832b5-6174-4572-bd19-3e61eda675ef'],
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
    apiPutAppReload,
};
