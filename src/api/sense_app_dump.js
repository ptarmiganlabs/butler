/**
 * REST API Schemas for Qlik Sense App Dump/Restore.
 *
 * Defines Fastify schemas for serializing Qlik Sense apps to JSON:
 * - apiGetSenseAppDump: Export app to JSON (includes all sheets, stories, etc.)
 * - apiPostSenseAppRestore: Restore app from JSON dump
 *
 * Used for backup/restore and migration scenarios.
 */

export const apiGetSenseAppDump = {
    schema: {
        summary: 'Dump a Sense app to JSON.',
        description: 'Does the same thing as `/v4/app/:appId/dump`',
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
        response: {
            200: {
                description: 'App dump successful. App metadata returned as JSON.',
                type: 'object',
                properties: {
                    lineage: {
                        type: 'object',
                        description: 'App lineage information returned from Qlik Sense Engine.',
                        properties: {
                            qLineage: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                },
                            },
                        },
                    },
                },
                examples: [
                    {
                        properties: {},
                        loadScript: '',
                        lineage: {
                            qLineage: [],
                        },
                        sheets: [],
                        stories: [],
                        masterobjects: [],
                        appprops: [],
                        dataconnections: [],
                        dimensions: [],
                        bookmarks: [],
                        embeddedmedia: [],
                        snapshots: [],
                        fields: [],
                        variables: [],
                        measures: [],
                    },
                ],
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
            422: {
                description: 'App not found in  Qlik Sense.',
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

export const apiGetAppDump = {
    schema: {
        summary: 'Dump a Sense app to JSON.',
        description: 'Does the same thing as `/v4/senseappdump/:appId`',
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
        response: {
            200: {
                description: 'App dump successful. App metadata returned as JSON.',
                type: 'object',
                properties: {
                    lineage: {
                        type: 'object',
                        description: 'App lineage information returned from Qlik Sense Engine.',
                        properties: {
                            qLineage: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                },
                            },
                        },
                    },
                },
                examples: [
                    {
                        properties: {},
                        loadScript: '',
                        lineage: {
                            qLineage: [],
                        },
                        sheets: [],
                        stories: [],
                        masterobjects: [],
                        appprops: [],
                        dataconnections: [],
                        dimensions: [],
                        bookmarks: [],
                        embeddedmedia: [],
                        snapshots: [],
                        fields: [],
                        variables: [],
                        measures: [],
                    },
                ],
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
            422: {
                description: 'App not found in  Qlik Sense.',
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
