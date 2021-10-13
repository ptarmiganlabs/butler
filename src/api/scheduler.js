const apiGETSchedules = {
    schema: {
        summary: 'Get all information available for existing schedule(s).',
        description:
            'If a schedule ID is specified using a query parameter (and there exists a schedule with that ID), information about that schedule will be returned.\nIf no schedule ID is specified, all schedules will be returned.',
        querystring: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Scheduld ID',
                    example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                },
            },
        },
        response: {
            200: {
                description: 'Schedule successfully retrieved.',
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Schedule ID',
                            example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                        },
                        created: {
                            type: 'string',
                            description: 'Timestamp when schedule was created',
                            example: '2020-09-29T14:29:12.283Z',
                        },
                        name: {
                            type: 'string',
                            description: 'Schedule name.',
                            example: 'Reload sales metrics',
                        },
                        cronSchedule: {
                            type: 'string',
                            description:
                                '5 or 6 position cron schedule.\n\nIf 6 positions used, the leftmost position represent seconds.\nIf 5 positions used, leftmost position is minutes.\n\nThe example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.',
                            example: '0,30 6 * * 1-5',
                        },
                        timezone: {
                            type: 'string',
                            description:
                                'Time zone the schedule should use. Ex "Europe/Stockholm".',
                            example: 'Europe/Stockholm',
                        },
                        qlikSenseTaskId: {
                            type: 'string',
                            description:
                                'ID of Qlik Sense task that should be started when schedule triggers.',
                            example: '210832b5-6174-4572-bd19-3e61eda675ef',
                        },
                        startupState: {
                            type: 'string',
                            enum: ['start', 'started', 'stop', 'stopped'],
                            description:
                                'If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.',
                            example: 'started',
                        },
                        tags: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Can be used to categorise schedules.',
                            example: '["tag 1", "tag 2"]',
                        },
                        lastKnownState: {
                            type: 'string',
                            description: 'Last known state (started/stopped) for the schedule.',
                            enum: ['started', 'stopped'],
                            example: 'started',
                        },
                    },
                },
            },
            400: {
                description: 'Schedule not found.',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiPOSTSchedules = {
    schema: {
        summary: 'Create a new schedule.',
        description: '',
        body: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'Descriptive name for the schedule.',
                    example: 'Reload sales metrics',
                },
                cronSchedule: {
                    type: 'string',
                    description:
                        '5 or 6 position cron schedule.\n\nIf 6 positions used, the leftmost position represent seconds.\nIf 5 positions used, leftmost position is minutes.\n\nThe example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.',
                    example: '0,30 6 * * 1-5',
                },
                timezone: {
                    type: 'string',
                    description: 'Time zone the schedule should use. Ex "Europe/Stockholm".',
                    example: 'Europe/Stockholm',
                },
                qlikSenseTaskId: {
                    type: 'string',
                    description:
                        'ID of Qlik Sense task that should be started when schedule triggers.',
                    example: '210832b5-6174-4572-bd19-3e61eda675ef',
                },
                startupState: {
                    type: 'string',
                    enum: ['start', 'started', 'stop', 'stopped'],
                    description:
                        'If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.',
                    example: 'started',
                },
                tags: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: 'Can be used to categorise schedules.',
                    example: '["tag 1", "tag 2"]',
                },
            },
            required: ['name', 'cronSchedule', 'timezone', 'qlikSenseTaskId', 'startupState'],
        },
        response: {
            201: {
                description: 'Schedule successfully retrieved.',
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Schedule ID',
                            example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                        },
                        created: {
                            type: 'string',
                            description: 'Timestamp when schedule was created',
                            example: '2020-09-29T14:29:12.283Z',
                        },
                        name: {
                            type: 'string',
                            description: 'Schedule name.',
                            example: 'Reload sales metrics',
                        },
                        cronSchedule: {
                            type: 'string',
                            description:
                                '5 or 6 position cron schedule.\n\nIf 6 positions used, the leftmost position represent seconds.\nIf 5 positions used, leftmost position is minutes.\n\nThe example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.',
                            example: '0,30 6 * * 1-5',
                        },
                        timezone: {
                            type: 'string',
                            description:
                                'Time zone the schedule should use. Ex "Europe/Stockholm".',
                            example: 'Europe/Stockholm',
                        },
                        qlikSenseTaskId: {
                            type: 'string',
                            description:
                                'ID of Qlik Sense task that should be started when schedule triggers.',
                            example: '210832b5-6174-4572-bd19-3e61eda675ef',
                        },
                        startupState: {
                            type: 'string',
                            enum: ['start', 'started', 'stop', 'stopped'],
                            description:
                                'If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.',
                            example: 'started',
                        },
                        tags: {
                            type: 'array',
                            items: {
                                type: 'string',
                            },
                            description: 'Can be used to categorise schedules.',
                            example: '["tag 1", "tag 2"]',
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

const apiDELETESchedules = {
    schema: {
        summary: 'Delete a schedule.',
        description: '',
        params: {
            type: 'object',
            properties: {
                scheduleId: {
                    type: 'string',
                    description: 'Schedule ID.',
                    example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                },
            },
        },
        response: {
            204: {
                description: 'Schedule successfully deleted.',
                type: 'object',
            },
            400: {
                description: 'Schedule not found.',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiPUTSchedulesStart = {
    schema: {
        summary: 'Start a schedule.',
        description:
            "Start a schedule, i.e. have the scheduler run the associated reload task according to the schedule's cron settings.",
        params: {
            type: 'object',
            properties: {
                scheduleId: {
                    type: 'string',
                    description: 'Schedule ID.',
                    example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                },
            },
        },
        response: {
            200: {
                description:
                    'Schedule successfully started.\n\nAn object with all inforomation about the started schedule is returned.',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Schedule ID',
                        example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                    },
                    created: {
                        type: 'string',
                        description: 'Timestamp when schedule was created',
                        example: '2020-09-29T14:29:12.283Z',
                    },
                    name: {
                        type: 'string',
                        description: 'Schedule name.',
                        example: 'Reload sales metrics',
                    },
                    cronSchedule: {
                        type: 'string',
                        description:
                            '5 or 6 position cron schedule.\n\nIf 6 positions used, the leftmost position represent seconds.\nIf 5 positions used, leftmost position is minutes.\n\nThe example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.',
                        example: '0,30 6 * * 1-5',
                    },
                    timezone: {
                        type: 'string',
                        description: 'Time zone the schedule should use. Ex "Europe/Stockholm".',
                        example: 'Europe/Stockholm',
                    },
                    qlikSenseTaskId: {
                        type: 'string',
                        description:
                            'ID of Qlik Sense task that should be started when schedule triggers.',
                        example: '210832b5-6174-4572-bd19-3e61eda675ef',
                    },
                    startupState: {
                        type: 'string',
                        enum: ['start', 'started', 'stop', 'stopped'],
                        description:
                            'If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.',
                        example: 'started',
                    },
                    tags: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: 'Can be used to categorise schedules.',
                        example: '["tag 1", "tag 2"]',
                    },
                },
            },
            400: {
                description: 'Schedule not found.',
                type: 'object',
            },
            500: {
                description: 'Internal error.',
                type: 'object',
            },
        },
    },
};

const apiPUTSchedulesStop = {
    schema: {
        summary: 'Stop a schedule.',
        description:
            'Stop a schedule, i.e. tell the scheduler to no longer execute the schedule according to its cron settings.',
        params: {
            type: 'object',
            properties: {
                scheduleId: {
                    type: 'string',
                    description: 'Schedule ID.',
                    example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                },
            },
        },
        response: {
            200: {
                description:
                    'Schedule successfully stopped.\n\nAn object with all inforomation about the stopped schedule is returned.',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Schedule ID',
                        example: 'e4b1c455-aa15-4a51-a9cf-c5e4cfc91339',
                    },
                    created: {
                        type: 'string',
                        description: 'Timestamp when schedule was created',
                        example: '2020-09-29T14:29:12.283Z',
                    },
                    name: {
                        type: 'string',
                        description: 'Schedule name.',
                        example: 'Reload sales metrics',
                    },
                    cronSchedule: {
                        type: 'string',
                        description:
                            '5 or 6 position cron schedule.\n\nIf 6 positions used, the leftmost position represent seconds.\nIf 5 positions used, leftmost position is minutes.\n\nThe example schedule will trigger at 00 and 30 minutes past 6:00 on Mon-Fri.',
                        example: '0,30 6 * * 1-5',
                    },
                    timezone: {
                        type: 'string',
                        description: 'Time zone the schedule should use. Ex "Europe/Stockholm".',
                        example: 'Europe/Stockholm',
                    },
                    qlikSenseTaskId: {
                        type: 'string',
                        description:
                            'ID of Qlik Sense task that should be started when schedule triggers.',
                        example: '210832b5-6174-4572-bd19-3e61eda675ef',
                    },
                    startupState: {
                        type: 'string',
                        enum: ['start', 'started', 'stop', 'stopped'],
                        description:
                            'If set to "start" or "started", the schedule will be started upon creation. Otherwise it will remain in stopped state.',
                        example: 'started',
                    },
                    tags: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: 'Can be used to categorise schedules.',
                        example: '["tag 1", "tag 2"]',
                    },
                },
            },
            400: {
                description: 'Schedule not found.',
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
    apiGETSchedules,
    apiPOSTSchedules,
    apiDELETESchedules,
    apiPUTSchedulesStart,
    apiPUTSchedulesStop,
};
