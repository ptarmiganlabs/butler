const apiPutSlackPostMessage = {
    schema: {
        summary: 'Send message to Slack.',
        description: 'Sends a basic message to Slack.',
        body: {
            type: 'object',
            properties: {
                channel: {
                    type: 'string',
                    minLength: 1,
                    description: 'Slack channel to post message into. Prefix channel name with #.',
                    examples: ['#reload-notification'],
                },
                from_user: {
                    type: 'string',
                    minLength: 1,
                    description: 'Name of sending user, as shown in the Slack message',
                    examples: ['Butler the Bot'],
                },
                msg: {
                    type: 'string',
                    minLength: 1,
                    description: 'Text going into the Slack message',
                    examples: ['This is a message from Qlik Sense'],
                },
                emoji: {
                    type: 'string',
                    description: 'Emoji to shown next to Slack message',
                    examples: ['thumbsup'],
                },
            },
            required: ['channel', 'from_user', 'msg'],
        },
        response: {
            201: {
                description: 'Message successfully sent to Slack.',
                type: 'object',

                properties: {
                    channel: {
                        type: 'string',
                        description: 'Slack channel to post message into. Prefix channel name with #.',
                        examples: ['#reload-notification'],
                    },
                    from_user: {
                        type: 'string',
                        description: 'Name of sending user, as shown in the Slack message',
                        examples: ['Butler the Bot'],
                    },
                    msg: {
                        type: 'string',
                        description: 'Text going into the Slack message',
                        examples: ['This is a message from Qlik Sense'],
                    },
                    emoji: {
                        type: 'string',
                        description: 'Emoji to shown next to Slack message',
                        examples: ['thumbsup'],
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

export default apiPutSlackPostMessage;
