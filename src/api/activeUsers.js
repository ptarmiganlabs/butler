const apiGetActiveUserCount = {
    schema: {
        description:
            'This is determined by reading session start/end messages, which means this value needs some time until it stabilizes on a valid number.\nAlso, the session start/stop messages are sent as MQTT messages to a MQTT broker, after which they are acted on by Buter.\nThis means a working MQTT broker is needed to get any session related metrics via Butler.\n\nThe __[Butler SOS tool](https://butler-sos.ptarmiganlabs.com)__ provides both more accurate session metrics, as well as a multitude of other SenseOps related metrics.',
        summary: 'Number of users with active sessions.',
        response: {
            200: {
                description: 'Active user count returned.',
                type: 'object',
                properties: {
                    response: { type: 'number', example: 15 },
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

const apiGetActiveUsers = {
    schema: {
        description:
            'This is determined by reading session start/end messages, which means this value needs some time until it stabilizes on a valid number.\nAlso, the session start/stop messages are sent as MQTT messages to a MQTT broker, after which they are acted on by Buter.\nThis means a working MQTT broker is needed to get any session related metrics via Butler.\n\nThe __[Butler SOS tool](https://butler-sos.ptarmiganlabs.com)__ provides both more accurate session metrics, as well as a multitude of other SenseOps related metrics.',
        summary: 'Usernames of users with active sessions.',
        response: {
            200: {
                description: 'Array of users with active sessions.',
                type: 'array',
                items: {
                    type: 'string',
                },
                example: ['maria', 'anna', 'joe'],
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
    apiGetActiveUserCount,
    apiGetActiveUsers,
};
