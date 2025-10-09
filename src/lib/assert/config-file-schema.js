import { type } from 'os';

export const confifgFileSchema = {
    type: 'object',
    properties: {
        Butler: {
            type: 'object',
            properties: {
                logLevel: {
                    type: 'string',
                    enum: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
                    transform: ['trim', 'toLowerCase'],
                },
                fileLogging: { type: 'boolean' },
                logDirectory: { type: 'string' },
                anonTelemetry: { type: 'boolean' },
                systemInfo: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                    },
                    required: ['enable'],
                    additionalProperties: false,
                },
                configVisualisation: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        host: {
                            type: 'string',
                            format: 'hostname',
                        },
                        port: { type: 'number' },
                        obfuscate: { type: 'boolean' },
                    },
                    required: ['enable'],
                    additionalProperties: false,
                },
                heartbeat: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        remoteURL: {
                            type: 'string',
                            format: 'uri',
                        },
                        frequency: { type: 'string' },
                    },
                    required: ['enable'],
                    additionalProperties: false,
                },
                dockerHealthCheck: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        port: { type: 'number' },
                    },
                    required: ['enable'],
                    additionalProperties: false,
                },
                uptimeMonitor: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        frequency: { type: 'string' },
                        logLevel: {
                            type: 'string',
                            enum: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
                            transform: ['trim', 'toLowerCase'],
                        },
                        storeInInfluxdb: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                            },
                            required: ['enable'],
                            additionalProperties: false,
                        },
                        storeNewRelic: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                destinationAccount: {
                                    type: ['array', 'null'],
                                    minItems: 0,
                                    items: {
                                        type: 'string',
                                    },
                                },
                                url: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                header: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                        required: ['name', 'value'],
                                        additionalProperties: false,
                                    },
                                },
                                metric: {
                                    type: 'object',
                                    properties: {
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                butlerMemoryUsage: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                                butlerUptime: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['butlerMemoryUsage', 'butlerUptime'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['dynamic'],
                                    additionalProperties: false,
                                },
                                attribute: {
                                    type: 'object',
                                    properties: {
                                        static: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                butlerVersion: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['butlerVersion'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['static', 'dynamic'],
                                },
                            },
                            required: ['enable'],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable'],
                    additionalProperties: false,
                },
                thirdPartyToolsCredentials: {
                    type: 'object',
                    properties: {
                        newRelic: {
                            type: ['array', 'null'],
                            items: {
                                type: 'object',
                                properties: {
                                    accountName: { type: 'string' },
                                    insertApiKey: { type: 'string' },
                                    accountId: { type: 'number' },
                                },
                                required: ['accountName', 'insertApiKey', 'accountId'],
                                additionalProperties: false,
                            },
                        },
                    },
                    required: ['newRelic'],
                    additionalProperties: false,
                },

                influxDb: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        hostIP: {
                            type: 'string',
                            format: 'hostname',
                        },
                        hostPort: { type: 'number' },
                        version: { type: 'number' },
                        auth: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                username: { type: 'string' },
                                password: {
                                    type: 'string',
                                    format: 'password',
                                },
                            },
                            required: ['enable', 'username', 'password'],
                            additionalProperties: false,
                        },
                        dbName: { type: 'string' },
                        retentionPolicy: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                duration: { type: 'string' },
                            },
                            required: ['name', 'duration'],
                            additionalProperties: false,
                        },
                        tag: {
                            type: 'object',
                            properties: {
                                static: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                        required: ['name', 'value'],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ['static'],
                            additionalProperties: false,
                        },
                        reloadTaskFailure: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                tailScriptLogLines: { type: 'number' },
                                tag: {
                                    type: 'object',
                                    properties: {
                                        static: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                useAppTags: { type: 'boolean' },
                                                useTaskTags: { type: 'boolean' },
                                            },
                                        },
                                    },
                                    required: ['static', 'dynamic'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'tailScriptLogLines', 'tag'],
                            additionalProperties: false,
                        },
                        reloadTaskSuccess: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                allReloadTasks: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                byCustomProperty: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        customPropertyName: { type: 'string' },
                                        enabledValue: { type: 'string' },
                                    },
                                    required: ['enable', 'customPropertyName', 'enabledValue'],
                                    additionalProperties: false,
                                },
                                tag: {
                                    type: 'object',
                                    properties: {
                                        static: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                useAppTags: { type: 'boolean' },
                                                useTaskTags: { type: 'boolean' },
                                            },
                                        },
                                    },
                                    required: ['static', 'dynamic'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'allReloadTasks', 'byCustomProperty', 'tag'],
                            additionalProperties: false,
                        },
                        userSyncTaskSuccess: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                tag: {
                                    type: 'object',
                                    properties: {
                                        static: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                useTaskTags: { type: 'boolean' },
                                            },
                                        },
                                    },
                                    required: ['static', 'dynamic'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'tag'],
                            additionalProperties: false,
                        },
                        externalProgramTaskSuccess: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                tag: {
                                    type: 'object',
                                    properties: {
                                        static: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                useTaskTags: { type: 'boolean' },
                                            },
                                        },
                                    },
                                    required: ['static', 'dynamic'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'tag'],
                            additionalProperties: false,
                        },
                        externalProgramTaskFailure: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                tag: {
                                    type: 'object',
                                    properties: {
                                        static: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        dynamic: {
                                            type: 'object',
                                            properties: {
                                                useTaskTags: { type: 'boolean' },
                                            },
                                        },
                                    },
                                    required: ['static', 'dynamic'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'tag'],
                            additionalProperties: false,
                        },
                    },
                    required: [
                        'enable',
                        'hostIP',
                        'hostPort',
                        'auth',
                        'dbName',
                        'retentionPolicy',
                        'tag',
                        'reloadTaskFailure',
                        'reloadTaskSuccess',
                        'userSyncTaskSuccess',
                        'externalProgramTaskSuccess',
                        'externalProgramTaskFailure',
                    ],
                    additionalProperties: false,
                },

                scriptLog: {
                    type: 'object',
                    properties: {
                        storeOnDisk: {
                            type: 'object',
                            properties: {
                                clientManaged: {
                                    type: 'object',
                                    properties: {
                                        reloadTaskFailure: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                logDirectory: { type: 'string' },
                                            },
                                            required: ['enable', 'logDirectory'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['reloadTaskFailure'],
                                    additionalProperties: false,
                                },
                                qsCloud: {
                                    type: 'object',
                                    properties: {
                                        appReloadFailure: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                logDirectory: { type: 'string' },
                                            },
                                            required: ['enable', 'logDirectory'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['appReloadFailure'],
                                },
                            },
                            required: ['clientManaged', 'qsCloud'],
                            additionalProperties: false,
                        },
                    },
                    required: ['storeOnDisk'],
                    additionalProperties: false,
                },

                qlikSenseUrls: {
                    type: 'object',
                    properties: {
                        qmc: {
                            type: 'string',
                            format: 'uri',
                        },
                        hub: {
                            type: 'string',
                            format: 'uri',
                        },
                        appBaseUrl: {
                            type: 'string',
                            format: 'uri',
                        },
                    },
                    required: ['qmc', 'hub', 'appBaseUrl'],
                    additionalProperties: false,
                },

                genericUrls: {
                    type: ['array', 'null'],
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            linkText: { type: 'string' },
                            comment: { type: 'string' },
                            url: {
                                type: 'string',
                                format: 'uri',
                            },
                        },
                        required: ['id', 'linkText', 'comment', 'url'],
                        additionalProperties: false,
                    },
                },

                qlikSenseVersion: {
                    type: 'object',
                    properties: {
                        versionMonitor: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                frequency: { type: 'string' },
                                host: {
                                    type: 'string',
                                    format: 'hostname',
                                },
                                rejectUnauthorized: { type: 'boolean' },
                                destination: {
                                    type: 'object',
                                    properties: {
                                        influxDb: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                tag: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'tag'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['influxDb'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'frequency', 'host', 'rejectUnauthorized', 'destination'],
                            additionalProperties: false,
                        },
                    },
                    required: ['versionMonitor'],
                    additionalProperties: false,
                },

                qlikSenseLicense: {
                    type: 'object',
                    properties: {
                        serverLicenseMonitor: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                frequency: { type: 'string' },
                                alert: {
                                    type: 'object',
                                    properties: {
                                        thresholdDays: { type: 'number' },
                                    },
                                    required: ['thresholdDays'],
                                    additionalProperties: false,
                                },
                                destination: {
                                    type: 'object',
                                    properties: {
                                        influxDb: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                tag: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'tag'],
                                            additionalProperties: false,
                                        },
                                        mqtt: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                sendRecurring: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                                sendAlert: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'sendRecurring', 'sendAlert'],
                                            additionalProperties: false,
                                        },
                                        webhook: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                sendRecurring: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                                sendAlert: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'sendRecurring', 'sendAlert'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['influxDb', 'mqtt', 'webhook'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'frequency', 'alert', 'destination'],
                            additionalProperties: false,
                        },
                        licenseMonitor: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                frequency: { type: 'string' },
                                destination: {
                                    type: 'object',
                                    properties: {
                                        influxDb: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                tag: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'tag'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['influxDb'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'frequency', 'destination'],
                            additionalProperties: false,
                        },
                        licenseRelease: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                dryRun: { type: 'boolean' },
                                frequency: { type: 'string' },
                                neverRelease: {
                                    type: 'object',
                                    properties: {
                                        user: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    userDir: { type: 'string' },
                                                    userId: { type: 'string' },
                                                },
                                                required: ['userDir', 'userId'],
                                                additionalProperties: false,
                                            },
                                        },
                                        tag: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                        customProperty: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        userDirectory: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                        inactive: {
                                            type: 'string',
                                            enum: ['yes', 'no', 'ignore'],
                                            transform: ['trim', 'toLowerCase'],
                                        },
                                        blocked: {
                                            type: 'string',
                                            enum: ['yes', 'no', 'ignore'],
                                            transform: ['trim', 'toLowerCase'],
                                        },
                                        removedExternally: {
                                            type: 'string',
                                            enum: ['yes', 'no', 'ignore'],
                                            transform: ['trim', 'toLowerCase'],
                                        },
                                    },
                                    required: [
                                        'user',
                                        'tag',
                                        'customProperty',
                                        'userDirectory',
                                        'inactive',
                                        'blocked',
                                        'removedExternally',
                                    ],
                                    additionalProperties: false,
                                },
                                licenseType: {
                                    type: 'object',
                                    properties: {
                                        analyzer: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                releaseThresholdDays: { type: 'number' },
                                            },
                                            required: ['enable', 'releaseThresholdDays'],
                                            additionalProperties: false,
                                        },
                                        professional: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                releaseThresholdDays: { type: 'number' },
                                            },
                                            required: ['enable', 'releaseThresholdDays'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['analyzer', 'professional'],
                                    additionalProperties: false,
                                },
                                destination: {
                                    type: 'object',
                                    properties: {
                                        influxDb: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                tag: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'tag'],
                                        },
                                    },
                                    required: ['influxDb'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'dryRun', 'frequency', 'neverRelease', 'licenseType', 'destination'],
                            additionalProperties: false,
                        },
                    },
                    required: ['serverLicenseMonitor', 'licenseMonitor', 'licenseRelease'],
                    additionalProperties: false,
                },

                teamsNotification: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        reloadTaskFailure: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                templateFile: { type: 'string' },
                            },
                            required: [
                                'enable',
                                'webhookURL',
                                'messageType',
                                'basicMsgTemplate',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'templateFile',
                            ],
                            additionalProperties: false,
                        },
                        reloadTaskAborted: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                templateFile: { type: 'string' },
                            },
                            required: [
                                'enable',
                                'webhookURL',
                                'messageType',
                                'basicMsgTemplate',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'templateFile',
                            ],
                            additionalProperties: false,
                        },
                        serviceStopped: {
                            type: 'object',
                            properties: {
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                templateFile: { type: 'string' },
                            },
                            required: ['webhookURL', 'messageType', 'basicMsgTemplate', 'rateLimit', 'templateFile'],
                            additionalProperties: false,
                        },
                        serviceStarted: {
                            type: 'object',
                            properties: {
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                templateFile: { type: 'string' },
                            },
                            required: ['webhookURL', 'messageType', 'basicMsgTemplate', 'rateLimit', 'templateFile'],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable', 'reloadTaskFailure', 'reloadTaskAborted', 'serviceStopped', 'serviceStarted'],
                    additionalProperties: false,
                },

                slackNotification: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        restMessage: {
                            type: 'object',
                            properties: {
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                            },
                            required: ['webhookURL'],
                            additionalProperties: false,
                        },
                        reloadTaskFailure: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                channel: { type: 'string' },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                templateFile: { type: 'string' },
                                fromUser: { type: 'string' },
                                iconEmoji: { type: 'string' },
                            },
                            required: [
                                'enable',
                                'webhookURL',
                                'channel',
                                'messageType',
                                'basicMsgTemplate',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'templateFile',
                                'fromUser',
                                'iconEmoji',
                            ],
                            additionalProperties: false,
                        },
                        reloadTaskAborted: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                channel: { type: 'string' },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                templateFile: { type: 'string' },
                                fromUser: { type: 'string' },
                                iconEmoji: { type: 'string' },
                            },
                            required: [
                                'enable',
                                'webhookURL',
                                'channel',
                                'messageType',
                                'basicMsgTemplate',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'templateFile',
                                'fromUser',
                                'iconEmoji',
                            ],
                            additionalProperties: false,
                        },
                        serviceStopped: {
                            type: 'object',
                            properties: {
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                channel: { type: 'string' },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                templateFile: { type: 'string' },
                                fromUser: { type: 'string' },
                                iconEmoji: { type: 'string' },
                            },
                            required: [
                                'webhookURL',
                                'channel',
                                'messageType',
                                'basicMsgTemplate',
                                'rateLimit',
                                'templateFile',
                                'fromUser',
                                'iconEmoji',
                            ],
                            additionalProperties: false,
                        },
                        serviceStarted: {
                            type: 'object',
                            properties: {
                                webhookURL: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                channel: { type: 'string' },
                                messageType: {
                                    type: 'string',
                                    enum: ['basic', 'formatted'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                basicMsgTemplate: { type: 'string' },
                                rateLimit: { type: 'number' },
                                templateFile: { type: 'string' },
                                fromUser: { type: 'string' },
                                iconEmoji: { type: 'string' },
                            },
                            required: [
                                'webhookURL',
                                'channel',
                                'messageType',
                                'basicMsgTemplate',
                                'rateLimit',
                                'templateFile',
                                'fromUser',
                                'iconEmoji',
                            ],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable', 'restMessage', 'reloadTaskFailure', 'reloadTaskAborted', 'serviceStopped', 'serviceStarted'],
                    additionalProperties: false,
                },

                emailNotification: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        reloadTaskSuccess: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                alertEnableByCustomProperty: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        customPropertyName: { type: 'string' },
                                        enabledValue: { type: 'string' },
                                    },
                                    required: ['enable', 'customPropertyName', 'enabledValue'],
                                    additionalProperties: false,
                                },
                                alertEnabledByEmailAddress: {
                                    type: 'object',
                                    properties: {
                                        customPropertyName: { type: 'string' },
                                    },
                                    required: ['customPropertyName'],
                                    additionalProperties: false,
                                },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'normal', 'high'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                subject: { type: 'string' },
                                bodyFileDirectory: { type: 'string' },
                                htmlTemplateFile: { type: 'string' },
                                fromAddress: { type: 'string' },
                                recipients: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                            },
                            required: [
                                'enable',
                                'alertEnableByCustomProperty',
                                'alertEnabledByEmailAddress',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'priority',
                                'subject',
                                'bodyFileDirectory',
                                'htmlTemplateFile',
                                'fromAddress',
                                'recipients',
                            ],
                            additionalProperties: false,
                        },
                        reloadTaskAborted: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                appOwnerAlert: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        includeOwner: {
                                            type: 'object',
                                            properties: {
                                                includeAll: { type: 'boolean' },
                                                user: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            directory: { type: 'string' },
                                                            userId: { type: 'string' },
                                                        },
                                                        required: ['directory', 'userId'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                            },
                                            required: ['includeAll', 'user'],
                                            additionalProperties: false,
                                        },
                                        excludeOwner: {
                                            type: 'object',
                                            properties: {
                                                user: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            directory: { type: 'string' },
                                                            userId: { type: 'string' },
                                                        },
                                                        required: ['directory', 'userId'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                            },
                                            required: ['user'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['enable', 'includeOwner', 'excludeOwner'],
                                    additionalProperties: false,
                                },
                                alertEnableByCustomProperty: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        customPropertyName: { type: 'string' },
                                        enabledValue: { type: 'string' },
                                    },
                                    required: ['enable', 'customPropertyName', 'enabledValue'],
                                    additionalProperties: false,
                                },
                                alertEnabledByEmailAddress: {
                                    type: 'object',
                                    properties: {
                                        customPropertyName: { type: 'string' },
                                    },
                                    required: ['customPropertyName'],
                                    additionalProperties: false,
                                },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'normal', 'high'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                subject: { type: 'string' },
                                bodyFileDirectory: { type: 'string' },
                                htmlTemplateFile: { type: 'string' },
                                fromAddress: { type: 'string' },
                                recipients: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                            },
                            required: [
                                'enable',
                                'appOwnerAlert',
                                'alertEnableByCustomProperty',
                                'alertEnabledByEmailAddress',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'priority',
                                'subject',
                                'bodyFileDirectory',
                                'htmlTemplateFile',
                                'fromAddress',
                                'recipients',
                            ],
                            additionalProperties: false,
                        },
                        reloadTaskFailure: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                appOwnerAlert: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        includeOwner: {
                                            type: 'object',
                                            properties: {
                                                includeAll: { type: 'boolean' },
                                                user: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            directory: { type: 'string' },
                                                            userId: { type: 'string' },
                                                        },
                                                        required: ['directory', 'userId'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                            },
                                            required: ['includeAll', 'user'],
                                            additionalProperties: false,
                                        },
                                        excludeOwner: {
                                            type: 'object',
                                            properties: {
                                                user: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            directory: { type: 'string' },
                                                            userId: { type: 'string' },
                                                        },
                                                        required: ['directory', 'userId'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                            },
                                            required: ['user'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['enable', 'includeOwner', 'excludeOwner'],
                                    additionalProperties: false,
                                },
                                alertEnableByCustomProperty: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        customPropertyName: { type: 'string' },
                                        enabledValue: { type: 'string' },
                                    },
                                    required: ['enable', 'customPropertyName', 'enabledValue'],
                                    additionalProperties: false,
                                },
                                alertEnabledByEmailAddress: {
                                    type: 'object',
                                    properties: {
                                        customPropertyName: { type: 'string' },
                                    },
                                    required: ['customPropertyName'],
                                    additionalProperties: false,
                                },
                                rateLimit: { type: 'number' },
                                headScriptLogLines: { type: 'number' },
                                tailScriptLogLines: { type: 'number' },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'normal', 'high'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                subject: { type: 'string' },
                                bodyFileDirectory: { type: 'string' },
                                htmlTemplateFile: { type: 'string' },
                                fromAddress: { type: 'string' },
                                recipients: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                            },
                            required: [
                                'enable',
                                'appOwnerAlert',
                                'alertEnableByCustomProperty',
                                'alertEnabledByEmailAddress',
                                'rateLimit',
                                'headScriptLogLines',
                                'tailScriptLogLines',
                                'priority',
                                'subject',
                                'bodyFileDirectory',
                                'htmlTemplateFile',
                                'fromAddress',
                                'recipients',
                            ],
                            additionalProperties: false,
                        },
                        serviceStopped: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'normal', 'high'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                subject: { type: 'string' },
                                bodyFileDirectory: { type: 'string' },
                                htmlTemplateFile: { type: 'string' },
                                fromAddress: { type: 'string' },
                                recipients: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                            },
                            required: [
                                'rateLimit',
                                'priority',
                                'subject',
                                'bodyFileDirectory',
                                'htmlTemplateFile',
                                'fromAddress',
                                'recipients',
                            ],
                            additionalProperties: false,
                        },
                        serviceStarted: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'normal', 'high'],
                                    transform: ['trim', 'toLowerCase'],
                                },
                                subject: { type: 'string' },
                                bodyFileDirectory: { type: 'string' },
                                htmlTemplateFile: { type: 'string' },
                                fromAddress: { type: 'string' },
                                recipients: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                            },
                            required: [
                                'rateLimit',
                                'priority',
                                'subject',
                                'bodyFileDirectory',
                                'htmlTemplateFile',
                                'fromAddress',
                                'recipients',
                            ],
                            additionalProperties: false,
                        },
                        smtp: {
                            type: 'object',
                            properties: {
                                host: {
                                    type: 'string',
                                    format: 'hostname',
                                },
                                port: { type: 'number' },
                                secure: { type: 'boolean' },
                                tls: {
                                    type: 'object',
                                    properties: {
                                        serverName: { type: ['string', 'null'] },
                                        ignoreTLS: { type: 'boolean' },
                                        requireTLS: { type: 'boolean' },
                                        rejectUnauthorized: { type: 'boolean' },
                                    },
                                    required: ['serverName', 'ignoreTLS', 'requireTLS', 'rejectUnauthorized'],
                                    additionalProperties: false,
                                },
                                auth: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        user: { type: 'string' },
                                        password: {
                                            type: 'string',
                                            format: 'password',
                                        },
                                    },
                                    required: ['enable', 'user', 'password'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['host', 'port', 'secure', 'tls', 'auth'],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable', 'reloadTaskAborted', 'reloadTaskFailure', 'serviceStopped', 'serviceStarted', 'smtp'],
                    additionalProperties: false,
                },

                incidentTool: {
                    type: 'object',
                    properties: {
                        signl4: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                url: {
                                    type: 'string',
                                    format: 'uri',
                                },
                                reloadTaskFailure: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        rateLimit: { type: 'number' },
                                        serviceName: { type: 'string' },
                                        severity: { type: 'number' },
                                        includeApp: {
                                            type: 'object',
                                            properties: {
                                                includeAll: { type: 'boolean' },
                                                appId: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'string',
                                                    },
                                                },
                                            },
                                            required: ['includeAll', 'appId'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['enable', 'rateLimit', 'serviceName', 'severity', 'includeApp'],
                                    additionalProperties: false,
                                },
                                reloadTaskAborted: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                        rateLimit: { type: 'number' },
                                        serviceName: { type: 'string' },
                                        severity: { type: 'number' },
                                        includeApp: {
                                            type: 'object',
                                            properties: {
                                                includeAll: { type: 'boolean' },
                                                appId: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'string',
                                                    },
                                                },
                                            },
                                            required: ['includeAll', 'appId'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['enable', 'rateLimit', 'serviceName', 'severity', 'includeApp'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'url', 'reloadTaskFailure', 'reloadTaskAborted'],
                            additionalProperties: false,
                        },
                        newRelic: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                destinationAccount: {
                                    type: 'object',
                                    properties: {
                                        event: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                        log: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                    required: ['event', 'log'],
                                    additionalProperties: false,
                                },
                                url: {
                                    type: 'object',
                                    properties: {
                                        event: {
                                            type: 'string',
                                            format: 'uri',
                                        },
                                        log: {
                                            type: 'string',
                                            format: 'uri',
                                        },
                                    },
                                    required: ['event', 'log'],
                                    additionalProperties: false,
                                },
                                reloadTaskFailure: {
                                    type: 'object',
                                    properties: {
                                        destination: {
                                            type: 'object',
                                            properties: {
                                                event: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                        sendToAccount: {
                                                            type: 'object',
                                                            properties: {
                                                                byCustomProperty: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        customPropertyName: { type: 'string' },
                                                                    },
                                                                    required: ['enable', 'customPropertyName'],
                                                                    additionalProperties: false,
                                                                },
                                                                always: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        account: {
                                                                            type: ['array', 'null'],
                                                                            items: {
                                                                                type: 'string',
                                                                            },
                                                                        },
                                                                    },
                                                                    required: ['enable', 'account'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['byCustomProperty', 'always'],
                                                            additionalProperties: false,
                                                        },
                                                        attribute: {
                                                            type: 'object',
                                                            properties: {
                                                                static: {
                                                                    type: ['array', 'null'],
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            name: { type: 'string' },
                                                                            value: { type: 'string' },
                                                                        },
                                                                        required: ['name', 'value'],
                                                                        additionalProperties: false,
                                                                    },
                                                                },
                                                                dynamic: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        useAppTags: { type: 'boolean' },
                                                                        useTaskTags: { type: 'boolean' },
                                                                    },
                                                                    required: ['useAppTags', 'useTaskTags'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['static', 'dynamic'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['enable', 'sendToAccount', 'attribute'],
                                                    additionalProperties: false,
                                                },
                                                log: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                        tailScriptLogLines: { type: 'number' },
                                                        sendToAccount: {
                                                            type: 'object',
                                                            properties: {
                                                                byCustomProperty: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        customPropertyName: { type: 'string' },
                                                                    },
                                                                    required: ['enable', 'customPropertyName'],
                                                                    additionalProperties: false,
                                                                },
                                                                always: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        account: {
                                                                            type: ['array', 'null'],
                                                                            items: {
                                                                                type: 'string',
                                                                            },
                                                                        },
                                                                    },
                                                                    required: ['enable', 'account'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['byCustomProperty', 'always'],
                                                            additionalProperties: false,
                                                        },
                                                        attribute: {
                                                            type: 'object',
                                                            properties: {
                                                                static: {
                                                                    type: ['array', 'null'],
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            name: { type: 'string' },
                                                                            value: { type: 'string' },
                                                                        },
                                                                        required: ['name', 'value'],
                                                                        additionalProperties: false,
                                                                    },
                                                                },
                                                                dynamic: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        useAppTags: { type: 'boolean' },
                                                                        useTaskTags: { type: 'boolean' },
                                                                    },
                                                                },
                                                            },
                                                            required: ['static', 'dynamic'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['enable', 'tailScriptLogLines', 'sendToAccount', 'attribute'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['event', 'log'],
                                            additionalProperties: false,
                                        },
                                        sharedSettings: {
                                            type: 'object',
                                            properties: {
                                                rateLimit: { type: 'number' },
                                                header: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            value: { type: 'string' },
                                                        },
                                                        required: ['name', 'value'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                                attribute: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['rateLimit', 'header', 'attribute'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['destination', 'sharedSettings'],
                                    additionalProperties: false,
                                },
                                reloadTaskAborted: {
                                    type: 'object',
                                    properties: {
                                        destination: {
                                            type: 'object',
                                            properties: {
                                                event: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                        sendToAccount: {
                                                            type: 'object',
                                                            properties: {
                                                                byCustomProperty: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        customPropertyName: { type: 'string' },
                                                                    },
                                                                    required: ['enable', 'customPropertyName'],
                                                                    additionalProperties: false,
                                                                },
                                                                always: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        account: {
                                                                            type: ['array', 'null'],
                                                                            items: {
                                                                                type: 'string',
                                                                            },
                                                                        },
                                                                    },
                                                                    required: ['enable', 'account'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['byCustomProperty', 'always'],
                                                            additionalProperties: false,
                                                        },
                                                        attribute: {
                                                            type: 'object',
                                                            properties: {
                                                                static: {
                                                                    type: ['array', 'null'],
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            name: { type: 'string' },
                                                                            value: { type: 'string' },
                                                                        },
                                                                        required: ['name', 'value'],
                                                                        additionalProperties: false,
                                                                    },
                                                                },
                                                                dynamic: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        useAppTags: { type: 'boolean' },
                                                                        useTaskTags: { type: 'boolean' },
                                                                    },
                                                                    required: ['useAppTags', 'useTaskTags'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['static', 'dynamic'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['enable', 'sendToAccount', 'attribute'],
                                                    additionalProperties: false,
                                                },
                                                log: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                        tailScriptLogLines: { type: 'number' },
                                                        sendToAccount: {
                                                            type: 'object',
                                                            properties: {
                                                                byCustomProperty: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        customPropertyName: { type: 'string' },
                                                                    },
                                                                    required: ['enable', 'customPropertyName'],
                                                                    additionalProperties: false,
                                                                },
                                                                always: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        account: {
                                                                            type: ['array', 'null'],
                                                                            items: {
                                                                                type: 'string',
                                                                            },
                                                                        },
                                                                    },
                                                                    required: ['enable', 'account'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['byCustomProperty', 'always'],
                                                            additionalProperties: false,
                                                        },
                                                        attribute: {
                                                            type: 'object',
                                                            properties: {
                                                                static: {
                                                                    type: ['array', 'null'],
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            name: { type: 'string' },
                                                                            value: { type: 'string' },
                                                                        },
                                                                        required: ['name', 'value'],
                                                                        additionalProperties: false,
                                                                    },
                                                                },
                                                                dynamic: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        useAppTags: { type: 'boolean' },
                                                                        useTaskTags: { type: 'boolean' },
                                                                    },
                                                                    required: ['useAppTags', 'useTaskTags'],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['static', 'dynamic'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['enable', 'tailScriptLogLines', 'sendToAccount', 'attribute'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['event', 'log'],
                                        },
                                        sharedSettings: {
                                            type: 'object',
                                            properties: {
                                                rateLimit: { type: 'number' },
                                                header: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            value: { type: 'string' },
                                                        },
                                                        required: ['name', 'value'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                                attribute: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['rateLimit', 'header', 'attribute'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['destination', 'sharedSettings'],
                                    additionalProperties: false,
                                },
                                serviceMonitor: {
                                    type: 'object',
                                    properties: {
                                        destination: {
                                            type: 'object',
                                            properties: {
                                                event: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                        sendToAccount: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'string',
                                                            },
                                                        },
                                                        attribute: {
                                                            type: 'object',
                                                            properties: {
                                                                static: {
                                                                    type: ['array', 'null'],
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            name: { type: 'string' },
                                                                            value: { type: 'string' },
                                                                        },
                                                                        required: ['name', 'value'],
                                                                        additionalProperties: false,
                                                                    },
                                                                },
                                                                dynamic: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        serviceHost: { type: 'boolean' },
                                                                        serviceName: { type: 'boolean' },
                                                                        serviceDisplayName: { type: 'boolean' },
                                                                        serviceState: { type: 'boolean' },
                                                                    },
                                                                    required: [
                                                                        'serviceHost',
                                                                        'serviceName',
                                                                        'serviceDisplayName',
                                                                        'serviceState',
                                                                    ],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['static', 'dynamic'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['enable', 'sendToAccount', 'attribute'],
                                                    additionalProperties: false,
                                                },
                                                log: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                        sendToAccount: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'string',
                                                            },
                                                        },
                                                        attribute: {
                                                            type: 'object',
                                                            properties: {
                                                                static: {
                                                                    type: ['array', 'null'],
                                                                    items: {
                                                                        type: 'object',
                                                                        properties: {
                                                                            name: { type: 'string' },
                                                                            value: { type: 'string' },
                                                                        },
                                                                        required: ['name', 'value'],
                                                                        additionalProperties: false,
                                                                    },
                                                                },
                                                                dynamic: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        serviceHost: { type: 'boolean' },
                                                                        serviceName: { type: 'boolean' },
                                                                        serviceDisplayName: { type: 'boolean' },
                                                                        serviceState: { type: 'boolean' },
                                                                    },
                                                                    required: [
                                                                        'serviceHost',
                                                                        'serviceName',
                                                                        'serviceDisplayName',
                                                                        'serviceState',
                                                                    ],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['static', 'dynamic'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['enable', 'sendToAccount', 'attribute'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['event', 'log'],
                                            additionalProperties: false,
                                        },
                                        monitorServiceState: {
                                            type: 'object',
                                            properties: {
                                                running: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                                stopped: {
                                                    type: 'object',
                                                    properties: {
                                                        enable: { type: 'boolean' },
                                                    },
                                                    required: ['enable'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['running', 'stopped'],
                                            additionalProperties: false,
                                        },
                                        sharedSettings: {
                                            type: 'object',
                                            properties: {
                                                rateLimit: { type: 'number' },
                                                header: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            value: { type: 'string' },
                                                        },
                                                        required: ['name', 'value'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                                attribute: {
                                                    type: 'object',
                                                    properties: {
                                                        static: {
                                                            type: ['array', 'null'],
                                                            items: {
                                                                type: 'object',
                                                                properties: {
                                                                    name: { type: 'string' },
                                                                    value: { type: 'string' },
                                                                },
                                                                required: ['name', 'value'],
                                                                additionalProperties: false,
                                                            },
                                                        },
                                                    },
                                                    required: ['static'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['rateLimit', 'header', 'attribute'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['destination', 'monitorServiceState', 'sharedSettings'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['enable', 'destinationAccount', 'url', 'reloadTaskFailure', 'reloadTaskAborted', 'serviceMonitor'],
                            additionalProperties: false,
                        },
                    },
                    required: ['signl4', 'newRelic'],
                    additionalProperties: false,
                },

                webhookNotification: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        reloadTaskFailure: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                webhooks: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            webhookURL: {
                                                type: 'string',
                                                format: 'uri',
                                            },
                                            httpMethod: {
                                                type: 'string',
                                                enum: ['GET', 'POST', 'PUT'],
                                                transform: ['trim', 'toUpperCase'],
                                            },
                                            cert: {
                                                type: 'object',
                                                properties: {
                                                    enable: { type: 'boolean' },
                                                    rejectUnauthorized: { type: 'boolean' },
                                                    certCA: { type: 'string' },
                                                },
                                                required: ['enable', 'rejectUnauthorized', 'certCA'],
                                                additionalProperties: false,
                                            },
                                        },
                                        required: ['description', 'webhookURL', 'httpMethod', 'cert'],
                                    },
                                },
                            },
                            required: ['rateLimit', 'webhooks'],
                            additionalProperties: false,
                        },
                        reloadTaskAborted: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                webhooks: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            webhookURL: {
                                                type: 'string',
                                                format: 'uri',
                                            },
                                            httpMethod: {
                                                type: 'string',
                                                enum: ['GET', 'POST', 'PUT'],
                                                transform: ['trim', 'toUpperCase'],
                                            },
                                            cert: {
                                                type: 'object',
                                                properties: {
                                                    enable: { type: 'boolean' },
                                                    rejectUnauthorized: { type: 'boolean' },
                                                    certCA: { type: 'string' },
                                                },
                                                required: ['enable', 'rejectUnauthorized', 'certCA'],
                                                additionalProperties: false,
                                            },
                                        },
                                        required: ['description', 'webhookURL', 'httpMethod', 'cert'],
                                    },
                                },
                            },
                            required: ['rateLimit', 'webhooks'],
                            additionalProperties: false,
                        },
                        serviceMonitor: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                webhooks: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            webhookURL: {
                                                type: 'string',
                                                format: 'uri',
                                            },
                                            httpMethod: {
                                                type: 'string',
                                                enum: ['GET', 'POST', 'PUT'],
                                                transform: ['trim', 'toUpperCase'],
                                            },
                                            cert: {
                                                type: 'object',
                                                properties: {
                                                    enable: { type: 'boolean' },
                                                    rejectUnauthorized: { type: 'boolean' },
                                                    certCA: { type: 'string' },
                                                },
                                                required: ['enable', 'rejectUnauthorized', 'certCA'],
                                                additionalProperties: false,
                                            },
                                        },
                                        required: ['description', 'webhookURL', 'httpMethod', 'cert'],
                                    },
                                },
                            },
                            required: ['rateLimit', 'webhooks'],
                            additionalProperties: false,
                        },
                        qlikSenseServerLicenseMonitor: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                webhooks: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            webhookURL: {
                                                type: 'string',
                                                format: 'uri',
                                            },
                                            httpMethod: {
                                                type: 'string',
                                                enum: ['GET', 'POST', 'PUT'],
                                                transform: ['trim', 'toUpperCase'],
                                            },
                                            cert: {
                                                type: 'object',
                                                properties: {
                                                    enable: { type: 'boolean' },
                                                    rejectUnauthorized: { type: 'boolean' },
                                                    certCA: { type: 'string' },
                                                },
                                                required: ['enable', 'rejectUnauthorized', 'certCA'],
                                                additionalProperties: false,
                                            },
                                        },
                                        required: ['description', 'webhookURL', 'httpMethod', 'cert'],
                                    },
                                },
                            },
                            required: ['rateLimit', 'webhooks'],
                            additionalProperties: false,
                        },
                        qlikSenseServerLicenseExpiryAlert: {
                            type: 'object',
                            properties: {
                                rateLimit: { type: 'number' },
                                webhooks: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            description: { type: 'string' },
                                            webhookURL: {
                                                type: 'string',
                                                format: 'uri',
                                            },
                                            httpMethod: {
                                                type: 'string',
                                                enum: ['GET', 'POST', 'PUT'],
                                                transform: ['trim', 'toUpperCase'],
                                            },
                                            cert: {
                                                type: 'object',
                                                properties: {
                                                    enable: { type: 'boolean' },
                                                    rejectUnauthorized: { type: 'boolean' },
                                                    certCA: { type: 'string' },
                                                },
                                                required: ['enable', 'rejectUnauthorized', 'certCA'],
                                                additionalProperties: false,
                                            },
                                        },
                                        required: ['description', 'webhookURL', 'httpMethod', 'cert'],
                                    },
                                },
                            },
                            required: ['rateLimit', 'webhooks'],
                            additionalProperties: false,
                        },
                    },
                    required: [
                        'enable',
                        'reloadTaskFailure',
                        'reloadTaskAborted',
                        'serviceMonitor',
                        'qlikSenseServerLicenseMonitor',
                        'qlikSenseServerLicenseExpiryAlert',
                    ],
                    additionalProperties: false,
                },

                scheduler: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        configfile: { type: 'string' },
                    },
                    required: ['enable', 'configfile'],
                    additionalProperties: false,
                },

                keyValueStore: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        maxKeysPerNamespace: { type: 'number' },
                    },
                    required: ['enable', 'maxKeysPerNamespace'],
                    additionalProperties: false,
                },

                mqttConfig: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        brokerHost: {
                            type: 'string',
                            format: 'hostname',
                        },
                        brokerPort: { type: 'number' },
                        azureEventGrid: {
                            type: 'object',
                            properties: {
                                enable: { type: 'boolean' },
                                clientId: { type: 'string' },
                                clientCertFile: { type: 'string' },
                                clientKeyFile: { type: 'string' },
                            },
                            required: ['enable', 'clientId', 'clientCertFile', 'clientKeyFile'],
                            additionalProperties: false,
                        },
                        taskFailureSendFull: { type: 'boolean' },
                        taskAbortedSendFull: { type: 'boolean' },
                        subscriptionRootTopic: { type: 'string' },
                        taskStartTopic: { type: 'string' },
                        taskFailureTopic: { type: 'string' },
                        taskFailureFullTopic: { type: 'string' },
                        taskFailureServerStatusTopic: { type: 'string' },
                        taskAbortedTopic: { type: 'string' },
                        taskAbortedFullTopic: { type: 'string' },
                        serviceRunningTopic: { type: 'string' },
                        serviceStoppedTopic: { type: 'string' },
                        serviceStatusTopic: { type: 'string' },
                        qlikSenseServerLicenseTopic: { type: 'string' },
                        qlikSenseServerLicenseExpireTopic: { type: 'string' },
                        qlikSenseCloud: {
                            type: 'object',
                            properties: {
                                event: {
                                    type: 'object',
                                    properties: {
                                        mqttForward: {
                                            type: 'object',
                                            properties: {
                                                enable: { type: 'boolean' },
                                                broker: {
                                                    type: 'object',
                                                    properties: {
                                                        host: {
                                                            type: 'string',
                                                            format: 'hostname',
                                                        },
                                                        port: { type: 'number' },
                                                        username: { type: 'string' },
                                                        password: { type: 'string' },
                                                    },
                                                    required: ['host', 'port', 'username', 'password'],
                                                    additionalProperties: false,
                                                },
                                                topic: {
                                                    type: 'object',
                                                    properties: {
                                                        subscriptionRoot: { type: 'string' },
                                                        appReload: { type: 'string' },
                                                    },
                                                    required: ['subscriptionRoot', 'appReload'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['enable', 'broker', 'topic'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['mqttForward'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['event'],
                            additionalProperties: false,
                        },
                    },
                    required: [
                        'enable',
                        'brokerHost',
                        'brokerPort',
                        'azureEventGrid',
                        'taskFailureSendFull',
                        'taskAbortedSendFull',
                        'subscriptionRootTopic',
                        'taskStartTopic',
                        'taskFailureTopic',
                        'taskFailureFullTopic',
                        'taskFailureServerStatusTopic',
                        'taskAbortedTopic',
                        'taskAbortedFullTopic',
                        'serviceRunningTopic',
                        'serviceStoppedTopic',
                        'serviceStatusTopic',
                        'qlikSenseServerLicenseTopic',
                        'qlikSenseServerLicenseExpireTopic',
                        'qlikSenseCloud',
                    ],
                    additionalProperties: false,
                },

                udpServerConfig: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        serverHost: {
                            type: 'string',
                            format: 'hostname',
                        },
                        portTaskFailure: { type: 'number' },
                    },
                    required: ['enable', 'serverHost', 'portTaskFailure'],
                    additionalProperties: false,
                },

                restServerConfig: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        serverHost: {
                            type: 'string',
                            format: 'hostname',
                        },
                        serverPort: { type: 'number' },
                        backgroundServerPort: { type: 'number' },
                    },
                    required: ['enable', 'serverHost', 'serverPort', 'backgroundServerPort'],
                    additionalProperties: false,
                },

                fileCopyApprovedDirectories: {
                    type: ['array', 'null'],
                    items: {
                        type: 'object',
                        properties: {
                            fromDirectory: { type: 'string' },
                            toDirectory: { type: 'string' },
                        },
                        required: ['fromDirectory', 'toDirectory'],
                        additionalProperties: false,
                    },
                },

                fileMoveApprovedDirectories: {
                    type: ['array', 'null'],
                    items: {
                        type: 'object',
                        properties: {
                            fromDirectory: { type: 'string' },
                            toDirectory: { type: 'string' },
                        },
                        required: ['fromDirectory', 'toDirectory'],
                        additionalProperties: false,
                    },
                },

                fileDeleteApprovedDirectories: {
                    type: ['array', 'null'],
                    items: {
                        type: 'string',
                    },
                },

                restServerApiDocGenerate: { type: 'boolean' },

                restServerEndpointsEnable: {
                    type: 'object',
                    properties: {
                        apiListEnabledEndpoints: { type: 'boolean' },
                        base62ToBase16: { type: 'boolean' },
                        base16ToBase62: { type: 'boolean' },
                        butlerping: { type: 'boolean' },
                        createDir: { type: 'boolean' },
                        createDirQVD: { type: 'boolean' },
                        fileDelete: { type: 'boolean' },
                        fileMove: { type: 'boolean' },
                        fileCopy: { type: 'boolean' },
                        keyValueStore: { type: 'boolean' },
                        mqttPublishMessage: { type: 'boolean' },
                        newRelic: {
                            type: 'object',
                            properties: {
                                postNewRelicMetric: { type: 'boolean' },
                                postNewRelicEvent: { type: 'boolean' },
                            },
                            required: ['postNewRelicMetric', 'postNewRelicEvent'],
                            additionalProperties: false,
                        },
                        scheduler: {
                            type: 'object',
                            properties: {
                                createNewSchedule: { type: 'boolean' },
                                getSchedule: { type: 'boolean' },
                                getScheduleStatusAll: { type: 'boolean' },
                                updateSchedule: { type: 'boolean' },
                                deleteSchedule: { type: 'boolean' },
                                startSchedule: { type: 'boolean' },
                                stopSchedule: { type: 'boolean' },
                            },
                            required: [
                                'createNewSchedule',
                                'getSchedule',
                                'getScheduleStatusAll',
                                'updateSchedule',
                                'deleteSchedule',
                                'startSchedule',
                                'stopSchedule',
                            ],
                            additionalProperties: false,
                        },
                        senseAppReload: { type: 'boolean' },
                        senseAppDump: { type: 'boolean' },
                        senseListApps: { type: 'boolean' },
                        senseStartTask: { type: 'boolean' },
                        slackPostMessage: { type: 'boolean' },
                    },
                    required: [
                        'apiListEnabledEndpoints',
                        'base62ToBase16',
                        'base16ToBase62',
                        'butlerping',
                        'createDir',
                        'createDirQVD',
                        'fileDelete',
                        'fileMove',
                        'fileCopy',
                        'keyValueStore',
                        'mqttPublishMessage',
                        'newRelic',
                        'scheduler',
                        'senseAppReload',
                        'senseAppDump',
                        'senseListApps',
                        'senseStartTask',
                        'slackPostMessage',
                    ],
                    additionalProperties: false,
                },

                restServerEndpointsConfig: {
                    type: 'object',
                    properties: {
                        newRelic: {
                            type: 'object',
                            properties: {
                                postNewRelicMetric: {
                                    type: 'object',
                                    properties: {
                                        destinationAccount: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                        url: {
                                            type: 'string',
                                            format: 'uri',
                                        },
                                        header: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        attribute: {
                                            type: 'object',
                                            properties: {
                                                static: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            value: { type: 'string' },
                                                        },
                                                        required: ['name', 'value'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                            },
                                            required: ['static'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['destinationAccount', 'url', 'header', 'attribute'],
                                    additionalProperties: false,
                                },
                                postNewRelicEvent: {
                                    type: 'object',
                                    properties: {
                                        destinationAccount: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                        url: {
                                            type: 'string',
                                            format: 'uri',
                                        },
                                        header: {
                                            type: ['array', 'null'],
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                    value: { type: 'string' },
                                                },
                                                required: ['name', 'value'],
                                                additionalProperties: false,
                                            },
                                        },
                                        attribute: {
                                            type: 'object',
                                            properties: {
                                                static: {
                                                    type: ['array', 'null'],
                                                    items: {
                                                        type: 'object',
                                                        properties: {
                                                            name: { type: 'string' },
                                                            value: { type: 'string' },
                                                        },
                                                        required: ['name', 'value'],
                                                        additionalProperties: false,
                                                    },
                                                },
                                            },
                                            required: ['static'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['destinationAccount', 'url', 'header', 'attribute'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['postNewRelicMetric', 'postNewRelicEvent'],
                            additionalProperties: false,
                        },
                    },
                    required: ['newRelic'],
                    additionalProperties: false,
                },

                startTaskFilter: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        allowTask: {
                            type: 'object',
                            properties: {
                                taskId: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                                tag: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'string',
                                    },
                                },
                                customProperty: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                        required: ['name', 'value'],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ['taskId', 'tag', 'customProperty'],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable', 'allowTask'],
                    additionalProperties: false,
                },

                serviceMonitor: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        frequency: { type: 'string' },
                        monitor: {
                            type: ['array', 'null'],
                            items: {
                                type: 'object',
                                properties: {
                                    host: {
                                        type: 'string',
                                        format: 'hostname',
                                    },
                                    services: {
                                        type: ['array', 'null'],
                                        items: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string' },
                                                friendlyName: { type: 'string' },
                                            },
                                            required: ['name', 'friendlyName'],
                                            additionalProperties: false,
                                        },
                                    },
                                },
                                required: ['host', 'services'],
                                additionalProperties: false,
                            },
                        },
                        alertDestination: {
                            type: 'object',
                            properties: {
                                influxDb: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                newRelic: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                email: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                mqtt: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                teams: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                slack: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                                webhook: {
                                    type: 'object',
                                    properties: {
                                        enable: { type: 'boolean' },
                                    },
                                    required: ['enable'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['influxDb', 'newRelic', 'email', 'mqtt', 'teams', 'slack', 'webhook'],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable', 'frequency', 'monitor', 'alertDestination'],
                    additionalProperties: false,
                },

                qlikSenseCloud: {
                    type: 'object',
                    properties: {
                        enable: { type: 'boolean' },
                        event: {
                            type: 'object',
                            properties: {
                                mqtt: {
                                    type: 'object',
                                    properties: {
                                        tenant: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' },
                                                tenantUrl: {
                                                    type: 'string',
                                                    format: 'uri',
                                                },
                                                authType: {
                                                    type: 'string',
                                                    enum: ['jwt'],
                                                    transform: ['trim', 'toLowerCase'],
                                                },
                                                auth: {
                                                    type: 'object',
                                                    properties: {
                                                        jwt: {
                                                            type: 'object',
                                                            properties: {
                                                                token: { type: 'string' },
                                                            },
                                                            required: ['token'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['jwt'],
                                                    additionalProperties: false,
                                                },
                                                qlikSenseUrls: {
                                                    type: 'object',
                                                    properties: {
                                                        qmc: {
                                                            type: 'string',
                                                            format: 'uri',
                                                        },
                                                        hub: {
                                                            type: 'string',
                                                        },
                                                    },
                                                    required: ['qmc', 'hub'],
                                                    additionalProperties: false,
                                                },
                                                comment: { type: 'string' },
                                                alert: {
                                                    type: 'object',
                                                    properties: {
                                                        teamsNotification: {
                                                            type: 'object',
                                                            properties: {
                                                                reloadAppFailure: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        alertEnableByTag: {
                                                                            type: 'object',
                                                                            properties: {
                                                                                enable: { type: 'boolean' },
                                                                                tag: { type: 'string' },
                                                                            },
                                                                            required: ['enable', 'tag'],
                                                                            additionalProperties: false,
                                                                        },
                                                                        basicContentOnly: { type: 'boolean' },
                                                                        webhookURL: {
                                                                            type: 'string',
                                                                            format: 'uri',
                                                                        },
                                                                        messageType: {
                                                                            type: 'string',
                                                                            enum: ['basic', 'formatted'],
                                                                            transform: ['trim', 'toLowerCase'],
                                                                        },
                                                                        basicMsgTemplate: { type: 'string' },
                                                                        rateLimit: { type: 'number' },
                                                                        headScriptLogLines: { type: 'number' },
                                                                        tailScriptLogLines: { type: 'number' },
                                                                        templateFile: { type: 'string' },
                                                                    },
                                                                    required: [
                                                                        'enable',
                                                                        'alertEnableByTag',
                                                                        'basicContentOnly',
                                                                        'webhookURL',
                                                                        'messageType',
                                                                        'basicMsgTemplate',
                                                                        'rateLimit',
                                                                        'headScriptLogLines',
                                                                        'tailScriptLogLines',
                                                                        'templateFile',
                                                                    ],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['reloadAppFailure'],
                                                            additionalProperties: false,
                                                        },
                                                        slackNotification: {
                                                            type: 'object',
                                                            properties: {
                                                                reloadAppFailure: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        alertEnableByTag: {
                                                                            type: 'object',
                                                                            properties: {
                                                                                enable: { type: 'boolean' },
                                                                                tag: { type: 'string' },
                                                                            },
                                                                            required: ['enable', 'tag'],
                                                                            additionalProperties: false,
                                                                        },
                                                                        basicContentOnly: { type: 'boolean' },
                                                                        webhookURL: {
                                                                            type: 'string',
                                                                            format: 'uri',
                                                                        },
                                                                        channel: { type: 'string' },
                                                                        messageType: {
                                                                            type: 'string',
                                                                            enum: ['basic', 'formatted'],
                                                                            transform: ['trim', 'toLowerCase'],
                                                                        },
                                                                        basicMsgTemplate: { type: 'string' },
                                                                        rateLimit: { type: 'number' },
                                                                        headScriptLogLines: { type: 'number' },
                                                                        tailScriptLogLines: { type: 'number' },
                                                                        templateFile: { type: 'string' },
                                                                        fromUser: { type: 'string' },
                                                                        iconEmoji: { type: 'string' },
                                                                    },
                                                                    required: [
                                                                        'enable',
                                                                        'alertEnableByTag',
                                                                        'basicContentOnly',
                                                                        'webhookURL',
                                                                        'channel',
                                                                        'messageType',
                                                                        'basicMsgTemplate',
                                                                        'rateLimit',
                                                                        'headScriptLogLines',
                                                                        'tailScriptLogLines',
                                                                        'templateFile',
                                                                        'fromUser',
                                                                        'iconEmoji',
                                                                    ],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['reloadAppFailure'],
                                                            additionalProperties: false,
                                                        },
                                                        emailNotification: {
                                                            type: 'object',
                                                            properties: {
                                                                reloadAppFailure: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        enable: { type: 'boolean' },
                                                                        alertEnableByTag: {
                                                                            type: 'object',
                                                                            properties: {
                                                                                enable: { type: 'boolean' },
                                                                                tag: { type: 'string' },
                                                                            },
                                                                            required: ['enable', 'tag'],
                                                                            additionalProperties: false,
                                                                        },
                                                                        appOwnerAlert: {
                                                                            type: 'object',
                                                                            properties: {
                                                                                enable: { type: 'boolean' },
                                                                                includeOwner: {
                                                                                    type: 'object',
                                                                                    properties: {
                                                                                        includeAll: { type: 'boolean' },
                                                                                        user: {
                                                                                            type: ['array', 'null'],
                                                                                            items: {
                                                                                                type: 'string',
                                                                                            },
                                                                                        },
                                                                                    },
                                                                                    required: ['includeAll', 'user'],
                                                                                    additionalProperties: false,
                                                                                },
                                                                                excludeOwner: {
                                                                                    type: 'object',
                                                                                    properties: {
                                                                                        user: {
                                                                                            type: ['array', 'null'],
                                                                                            items: {
                                                                                                type: 'string',
                                                                                            },
                                                                                        },
                                                                                    },
                                                                                    required: ['user'],
                                                                                    additionalProperties: false,
                                                                                },
                                                                            },
                                                                            required: ['enable', 'includeOwner', 'excludeOwner'],
                                                                            additionalProperties: false,
                                                                        },
                                                                        rateLimit: { type: 'number' },
                                                                        headScriptLogLines: { type: 'number' },
                                                                        tailScriptLogLines: { type: 'number' },
                                                                        priority: {
                                                                            type: 'string',
                                                                            enum: ['low', 'normal', 'high'],
                                                                            transform: ['trim', 'toLowerCase'],
                                                                        },
                                                                        subject: { type: 'string' },
                                                                        bodyFileDirectory: { type: 'string' },
                                                                        htmlTemplateFile: { type: 'string' },
                                                                        fromAddress: { type: 'string' },
                                                                        recipients: {
                                                                            type: ['array', 'null'],
                                                                            items: {
                                                                                type: 'string',
                                                                            },
                                                                        },
                                                                    },
                                                                    required: [
                                                                        'enable',
                                                                        'alertEnableByTag',
                                                                        'appOwnerAlert',
                                                                        'rateLimit',
                                                                        'headScriptLogLines',
                                                                        'tailScriptLogLines',
                                                                        'priority',
                                                                        'subject',
                                                                        'bodyFileDirectory',
                                                                        'htmlTemplateFile',
                                                                        'fromAddress',
                                                                        'recipients',
                                                                    ],
                                                                    additionalProperties: false,
                                                                },
                                                            },
                                                            required: ['reloadAppFailure'],
                                                            additionalProperties: false,
                                                        },
                                                    },
                                                    required: ['teamsNotification', 'slackNotification', 'emailNotification'],
                                                    additionalProperties: false,
                                                },
                                            },
                                            required: ['id', 'tenantUrl', 'authType', 'auth', 'qlikSenseUrls', 'comment', 'alert'],
                                            additionalProperties: false,
                                        },
                                    },
                                    required: ['tenant'],
                                    additionalProperties: false,
                                },
                            },
                            required: ['mqtt'],
                            additionalProperties: false,
                        },
                    },
                    required: ['enable', 'event'],
                },

                cert: {
                    type: 'object',
                    properties: {
                        clientCert: { type: 'string' },
                        clientCertKey: { type: 'string' },
                        clientCertCA: { type: 'string' },
                    },
                    required: ['clientCert', 'clientCertKey', 'clientCertCA'],
                    additionalProperties: false,
                },

                configEngine: {
                    type: 'object',
                    properties: {
                        engineVersion: { type: 'string' },
                        host: {
                            type: 'string',
                            format: 'hostname',
                        },
                        port: { type: 'number' },
                        useSSL: { type: 'boolean' },
                        headers: {
                            type: 'object',
                            properties: {
                                static: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                        required: ['name', 'value'],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ['static'],
                            additionalProperties: false,
                        },
                        rejectUnauthorized: { type: 'boolean' },
                    },
                    required: ['engineVersion', 'host', 'port', 'useSSL', 'headers', 'rejectUnauthorized'],
                    additionalProperties: false,
                },

                configQRS: {
                    type: 'object',
                    properties: {
                        authentication: { type: 'string' },
                        host: {
                            type: 'string',
                            format: 'hostname',
                        },
                        port: { type: 'number' },
                        useSSL: { type: 'boolean' },
                        headers: {
                            type: 'object',
                            properties: {
                                static: {
                                    type: ['array', 'null'],
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                        required: ['name', 'value'],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ['static'],
                            additionalProperties: false,
                        },
                        rejectUnauthorized: { type: 'boolean' },
                    },
                    required: ['authentication', 'host', 'useSSL', 'port', 'headers', 'rejectUnauthorized'],
                    additionalProperties: false,
                },

                configDirectories: {
                    type: 'object',
                    properties: {
                        qvdPath: { type: 'string' },
                    },
                },
            },
            required: [
                'logLevel',
                'fileLogging',
                'logDirectory',
                'anonTelemetry',
                'systemInfo',
                'cert',
                'configEngine',
                'configQRS',
                'configDirectories',
            ],
            additionalProperties: true,
        },
    },
    required: ['Butler'],
    additionalProperties: false,
};
