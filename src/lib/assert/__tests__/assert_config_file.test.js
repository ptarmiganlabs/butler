import { jest } from '@jest/globals';

// Mock external dependencies
jest.unstable_mockModule('qrs-interact', () => ({
    default: jest.fn(),
}));

jest.unstable_mockModule('fs/promises', () => ({
    default: {
        readFile: jest.fn(),
    },
    readFile: jest.fn(),
}));

jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
    getReloadTasksCustomProperties: jest.fn(),
}));

jest.unstable_mockModule('../../../globals.js', () => ({
    default: {
        butler: {
            configFileExpanded: '/path/to/config.yaml',
        },
    },
}));

// Mock logger
const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
};

// Mock config object
const createMockConfig = (configData) => ({
    get: jest.fn((path) => {
        const keys = path.split('.');
        let result = configData;
        for (const key of keys) {
            result = result?.[key];
        }
        return result;
    }),
});

describe('assert_config_file', () => {
    let assertConfigModule;
    let qrsInteractMock;
    let fsMock;
    let taskCpUtilMock;

    beforeAll(async () => {
        const qrsInteractLib = await import('qrs-interact');
        qrsInteractMock = qrsInteractLib.default;
        
        const fsLib = await import('fs/promises');
        fsMock = fsLib.default || fsLib;
        
        const taskCpLib = await import('../../../qrs_util/task_cp_util.js');
        taskCpUtilMock = taskCpLib;

        assertConfigModule = await import('../assert_config_file.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('configFileQsAssert', () => {
        test('should pass with valid QS configuration', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [
                                { name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' },
                                { name: 'User-Agent', value: 'Butler' },
                            ],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [
                                { name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' },
                            ],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should fail when configEngine.headers.static is empty', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [
                                { name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' },
                            ],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configEngine.headers.static is an empty array in the config file. Aborting.'
            );
        });

        test('should fail when configEngine.headers.static missing X-Qlik-User', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [
                                { name: 'User-Agent', value: 'Butler' },
                            ],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [
                                { name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' },
                            ],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configEngine.headers.static does not contain an object with the property "X-Qlik-User" in the config file. Aborting.'
            );
        });

        test('should fail when configQRS.headers.static is empty', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [
                                { name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' },
                            ],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configQRS.headers.static is an empty array in the config file. Aborting.'
            );
        });

        test('should fail when configQRS.headers.static missing X-Qlik-User', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [
                                { name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' },
                            ],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [
                                { name: 'User-Agent', value: 'Butler' },
                            ],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configQRS.headers.static does not contain an object with the property "X-Qlik-User" in the config file. Aborting.'
            );
        });
    });

    describe('configFileEmailAssert', () => {
        test('should pass with valid email configuration', async () => {
            const config = createMockConfig({
                Butler: {
                    emailNotification: {
                        enable: true,
                        reloadTaskFailure: {
                            enable: true,
                            recipients: ['admin@company.com'],
                        },
                        reloadTaskAborted: {
                            enable: true,
                            recipients: ['admin@company.com'],
                        },
                    },
                    smtp: {
                        host: 'smtp.company.com',
                        port: 587,
                        secure: false,
                        auth: {
                            enable: true,
                            user: 'butler@company.com',
                            password: 'secret',
                        },
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileEmailAssert(config, configQRS, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should fail when email enabled but no recipients configured', async () => {
            const config = createMockConfig({
                Butler: {
                    emailNotification: {
                        enable: true,
                        reloadTaskFailure: {
                            enable: true,
                            recipients: [],
                        },
                        reloadTaskAborted: {
                            enable: true,
                            recipients: [],
                        },
                    },
                    smtp: {
                        host: 'smtp.company.com',
                        port: 587,
                        secure: false,
                        auth: {
                            enable: true,
                            user: 'butler@company.com',
                            password: 'secret',
                        },
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileEmailAssert(config, configQRS, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG EMAIL')
            );
        });

        test('should fail when SMTP host is missing', async () => {
            const config = createMockConfig({
                Butler: {
                    emailNotification: {
                        enable: true,
                        reloadTaskFailure: {
                            enable: true,
                            recipients: ['admin@company.com'],
                        },
                        reloadTaskAborted: {
                            enable: true,
                            recipients: ['admin@company.com'],
                        },
                    },
                    smtp: {
                        host: '',
                        port: 587,
                        secure: false,
                        auth: {
                            enable: true,
                            user: 'butler@company.com',
                            password: 'secret',
                        },
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileEmailAssert(config, configQRS, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG EMAIL')
            );
        });
    });

    describe('configFileInfluxDbAssert', () => {
        test('should pass with valid InfluxDB configuration', async () => {
            const config = createMockConfig({
                Butler: {
                    influxDb: {
                        enable: true,
                        hostIP: '192.168.1.100',
                        hostPort: 8086,
                        auth: {
                            enable: true,
                            username: 'butler',
                            password: 'secret',
                        },
                        dbName: 'butler',
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileInfluxDbAssert(config, configQRS, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should fail when InfluxDB enabled but host IP is missing', async () => {
            const config = createMockConfig({
                Butler: {
                    influxDb: {
                        enable: true,
                        hostIP: '',
                        hostPort: 8086,
                        auth: {
                            enable: true,
                            username: 'butler',
                            password: 'secret',
                        },
                        dbName: 'butler',
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileInfluxDbAssert(config, configQRS, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG INFLUXDB')
            );
        });

        test('should fail when InfluxDB auth enabled but credentials missing', async () => {
            const config = createMockConfig({
                Butler: {
                    influxDb: {
                        enable: true,
                        hostIP: '192.168.1.100',
                        hostPort: 8086,
                        auth: {
                            enable: true,
                            username: '',
                            password: '',
                        },
                        dbName: 'butler',
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileInfluxDbAssert(config, configQRS, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG INFLUXDB')
            );
        });
    });

    describe('configFileNewRelicAssert', () => {
        test('should pass with valid New Relic configuration', async () => {
            const config = createMockConfig({
                Butler: {
                    incidentTool: {
                        newRelic: {
                            enable: true,
                            destinationAccount: {
                                event: {
                                    enable: true,
                                    accountId: '12345',
                                    insertApiKey: 'NRII-abc123',
                                    url: 'https://insights-collector.newrelic.com/v1/accounts/events',
                                },
                                log: {
                                    enable: true,
                                    accountId: '12345',
                                    insertApiKey: 'NRII-abc123',
                                    url: 'https://log-api.newrelic.com/log/v1',
                                },
                            },
                        },
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileNewRelicAssert(config, configQRS, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should fail when New Relic enabled but account ID missing', async () => {
            const config = createMockConfig({
                Butler: {
                    incidentTool: {
                        newRelic: {
                            enable: true,
                            destinationAccount: {
                                event: {
                                    enable: true,
                                    accountId: '',
                                    insertApiKey: 'NRII-abc123',
                                    url: 'https://insights-collector.newrelic.com/v1/accounts/events',
                                },
                                log: {
                                    enable: true,
                                    accountId: '12345',
                                    insertApiKey: 'NRII-abc123',
                                    url: 'https://log-api.newrelic.com/log/v1',
                                },
                            },
                        },
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileNewRelicAssert(config, configQRS, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG NEW RELIC')
            );
        });
    });

    describe('configFileAppAssert', () => {
        test('should pass with valid app configuration', async () => {
            taskCpUtilMock.getReloadTasksCustomProperties.mockResolvedValue([
                { name: 'Butler.isPartial', value: 'true' },
                { name: 'Butler.appTag', value: 'production' },
            ]);

            const config = createMockConfig({
                Butler: {
                    heartbeat: {
                        enable: true,
                        remoteURL: 'https://monitoring.company.com/heartbeat',
                    },
                    dockerHealthCheck: {
                        enable: true,
                        port: 12398,
                    },
                    restServerConfig: {
                        enable: true,
                        serverHost: 'localhost',
                        serverPort: 8080,
                    },
                },
            });

            const result = await assertConfigModule.configFileAppAssert(config, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should handle task custom properties retrieval error', async () => {
            taskCpUtilMock.getReloadTasksCustomProperties.mockRejectedValue(new Error('QRS connection failed'));

            const config = createMockConfig({
                Butler: {
                    heartbeat: {
                        enable: true,
                        remoteURL: 'https://monitoring.company.com/heartbeat',
                    },
                },
            });

            const result = await assertConfigModule.configFileAppAssert(config, logger);

            expect(result).toBe(true); // Should still pass as this is not a critical error
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG APP')
            );
        });
    });

    describe('configFileStructureAssert', () => {
        test('should pass with valid config file structure', async () => {
            const validConfig = {
                Butler: {
                    heartbeat: {
                        enable: true,
                        remoteURL: 'https://monitoring.company.com/heartbeat',
                    },
                    restServerConfig: {
                        enable: true,
                        serverHost: 'localhost',
                        serverPort: 8080,
                    },
                },
            };

            fsMock.readFile.mockResolvedValue(JSON.stringify(validConfig));

            const result = await assertConfigModule.configFileStructureAssert();

            expect(result).toBe(true);
        });

        test('should handle config file read error', async () => {
            fsMock.readFile.mockRejectedValue(new Error('File not found'));

            const result = await assertConfigModule.configFileStructureAssert();

            expect(result).toBe(false);
        });

        test('should handle invalid JSON in config file', async () => {
            fsMock.readFile.mockResolvedValue('invalid json content');

            const result = await assertConfigModule.configFileStructureAssert();

            expect(result).toBe(false);
        });
    });

    describe('configFileConditionalAssert', () => {
        test('should pass when heartbeat is properly configured', async () => {
            const config = createMockConfig({
                Butler: {
                    heartbeat: {
                        enable: true,
                        remoteURL: 'https://monitoring.company.com/heartbeat',
                        frequency: '30 * * * * *',
                    },
                },
            });

            const result = await assertConfigModule.configFileConditionalAssert(config, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should fail when heartbeat enabled but URL missing', async () => {
            const config = createMockConfig({
                Butler: {
                    heartbeat: {
                        enable: true,
                        remoteURL: '',
                        frequency: '30 * * * * *',
                    },
                },
            });

            const result = await assertConfigModule.configFileConditionalAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('ASSERT CONFIG CONDITIONAL')
            );
        });

        test('should pass when heartbeat is disabled', async () => {
            const config = createMockConfig({
                Butler: {
                    heartbeat: {
                        enable: false,
                        remoteURL: '', // Should not matter when disabled
                        frequency: '30 * * * * *',
                    },
                },
            });

            const result = await assertConfigModule.configFileConditionalAssert(config, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle undefined config paths gracefully', async () => {
            const config = createMockConfig({});

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalled();
        });

        test('should handle null values in config', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: null,
                        },
                    },
                },
            });

            // Should handle gracefully and not crash
            await expect(assertConfigModule.configFileQsAssert(config, logger)).resolves.toBeDefined();
        });
    });
});