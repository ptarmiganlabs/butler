/**
 * REST API Schema for Butler Health Check.
 *
 * Defines the Fastify schema for Butler's health check endpoint.
 * Returns a simple response indicating Butler is operational along with its version.
 */

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

export default apiGetButlerPing;
