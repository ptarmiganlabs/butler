const apiGetButlerPing = {
    schema: {
        description: 'Tests if Butler is alive and responding',
        summary: 'Tests if Butler is alive and responding',
        response: {
            200: {
                description: 'Butler is alive and well.',
                type: 'object',
                properties: {
                    response: { type: 'string', example: 'Butler reporting for duty' },
                    butlerVersion: { type: 'string', example: '5.5.0' },
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
    apiGetButlerPing,
};
