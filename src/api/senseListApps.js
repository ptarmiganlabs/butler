const apiGetSenseListApps = {
    schema: {
        summary: 'Get a list of all apps in Sense environment.',
        description: 'Does the same thing as `/v4/apps/list`',
        response: {
            200: {
                description: 'App list successfully retrieved.',
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'App ID',
                            example: '5d7ae888-61cd-4539-97b2-6cf5baaa6f9d',
                        },
                        name: {
                            type: 'string',
                            description: 'App name',
                            example: '2021 sales targets',
                        },
                    },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiGetAppsList = {
    schema: {
        summary: 'Get a list of all apps in Sense environment.',
        description: 'Does the same thing as `/v4/senselistapps`',
        response: {
            200: {
                description: 'App list successfully retrieved.',
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'App ID',
                            example: '5d7ae888-61cd-4539-97b2-6cf5baaa6f9d',
                        },
                        name: {
                            type: 'string',
                            description: 'App name',
                            example: '2021 sales targets',
                        },
                    },
                },
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

module.exports = {
    apiGetSenseListApps,
    apiGetAppsList,
};
