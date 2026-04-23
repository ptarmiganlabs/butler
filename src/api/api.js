/**
 * REST API Schema for API Endpoint Listing.
 *
 * Defines the Fastify schema for Butler's API endpoint listing endpoint.
 * Returns an array of all enabled REST API endpoint keys from the Butler config file.
 */

const apiGetAPIEndpointsEnabled = {
    schema: {
        description:
            'Get an array of all enabled API endpoints, using the key names from the Butler config file.\n\nNote: Endpoints are enabled/disabled in the Butler main configuration file.',
        summary: 'Get an array of all enabled API endpoints.',
        response: {
            200: {
                description: 'Enabled API enpooints.',
                type: 'array',
                items: {
                    type: 'string',
                },
                examples: [['activeUserCount', 'activeUsers', 'apiListEnabledEndpoints']],
            },
        },
    },
};

export default apiGetAPIEndpointsEnabled;
