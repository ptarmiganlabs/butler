const apiPutStartTask = {
    schema: {
        summary: 'Start a Qlik Sense task.',
        description:
            "An optional array of zero or more objects can be passed in the message body. It is used to pass additional info related to the reload task being started.\n\nCurrently supported values in this array are:\n\n- A key-value pair that will be stored in Butler's KV store. If Butler's key-value store is not enabled, any key-value information passed in this parameter will simply be ignored.\nSetting `ttl=0` disables the TTL feature, i.e. the KV pair will not expire.\n- A task identified by its taskId that should be started.\n- Tasks identified by tags set on tasks in the QMC.\n- Tasks identified by custom properties set in the QMC.\n\nThis parameter uses a generic JSON/object format (type + payload).\nIt's thus possible to add new integrations in future Butler versions.",
        params: {
            type: 'object',
            properties: {
                taskId: {
                    type: 'string',
                    minLength: 1,
                    description:
                        'ID of Qlik Sense task.\nButler will ignore the "magic" task ID of "-" (=dash, hyphen). This ID will not be reported as invalid.',
                    examples: ['210832b5-6174-4572-bd19-3e61eda675ef'],
                },
            },
        },
        querystring: {
            type: 'object',
            properties: {
                allTaskIdsMustExist: {
                    type: 'boolean',
                    description:
                        'If set to `true`, all specified taskIds must exist. If one or more taskIds does not exist in the Sense server, *no* tasks will be started.\n\nIf set to `false`, all existing taskIds will be started. Missing/invalid taskIds will be ignored.\n\nIn either case, missing/invalid taskIds will be reported in the result set back to the client calling the API.\n\nNote: Tasks started by specifying tags and/or custom properties are not affected by this.',
                    examples: [true],
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
                        examples: ['keyvaluestore'],
                        enum: ['keyvaluestore', 'starttaskid', 'starttasktag', 'starttaskcustomproperty'],
                    },
                    payload: {
                        type: 'object',
                    },
                },
            },
            examples: [
                [
                    {
                        type: 'starttaskid',
                        payload: {
                            taskId: '7552d9fc-d1bb-4975-9a38-18357de531ea',
                        },
                    },
                    {
                        type: 'starttasktag',
                        payload: {
                            tag: 'startTask1',
                        },
                    },
                    {
                        type: 'starttaskcustomproperty',
                        payload: {
                            customPropertyName: 'taskGroup',
                            customPropertyValue: 'tasks2',
                        },
                    },
                    {
                        type: 'keyvaluestore',
                        payload: { namespace: 'MyFineNamespace', key: 'AnImportantKey', value: 'TheValue', ttl: 10000 },
                    },
                ],
            ],
        },
        response: {
            200: {
                description: 'Task successfully started.',
                type: 'object',
                examples: [
                    {
                        tasksId: {
                            started: [
                                {
                                    taskId: 'e3b27f50-b1c0-4879-88fc-c7cdd9c1cf3e',
                                    taskName: 'Reload task of App1',
                                },
                            ],
                            invalid: [
                                {
                                    taskId: 'abc',
                                },
                            ],
                            denied: [
                                {
                                    taskId: 'a1a11a11-b1c0-4879-88fc-c7cdd9c1cf3e',
                                },
                            ],
                        },
                        tasksTag: [
                            {
                                taskId: 'e3b27f50-b1c0-4879-88fc-c7cdd9c1cf3e',
                                taskName: 'Reload task of App1',
                            },
                        ],
                        tasksTagDenied: [
                            {
                                tag: 'startTask_invalid1',
                            },
                        ],
                        tasksCP: [
                            {
                                taskId: 'e3b27f50-b1c0-4879-88fc-c7cdd9c1cf3e',
                                taskName: 'Reload task of App1',
                            },
                        ],
                        tasksCPDenied: [
                            {
                                name: 'taskGroup',
                                value: 'cp_value_denied1',
                            },
                        ],
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

export default apiPutStartTask;
