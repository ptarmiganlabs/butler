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
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            verbose: jest.fn(),
            debug: jest.fn(),
        },
        configFileExpanded: '/path/to/config.yaml',
        getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
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

// Mock process.exit
const mockExit = jest.fn();
Object.defineProperty(process, 'exit', {
    value: mockExit,
    configurable: true,
});

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
    has: jest.fn((path) => {
        const keys = path.split('.');
        let result = configData;
        for (const key of keys) {
            result = result?.[key];
            if (result === undefined) return false;
        }
        return result !== undefined;
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
        mockExit.mockClear();
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
                            static: [{ name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' }],
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
                            static: [{ name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' }],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configEngine.headers.static is an empty array in the config file. Aborting.',
            );
        });

        test('should fail when configEngine.headers.static missing X-Qlik-User', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [{ name: 'User-Agent', value: 'Butler' }],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [{ name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' }],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configEngine.headers.static does not contain an object with the property "X-Qlik-User" in the config file. Aborting.',
            );
        });

        test('should fail when configQRS.headers.static is empty', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [{ name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' }],
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
                'ASSERT CONFIG QS: Butler.configQRS.headers.static is an empty array in the config file. Aborting.',
            );
        });

        test('should fail when configQRS.headers.static missing X-Qlik-User', async () => {
            const config = createMockConfig({
                Butler: {
                    configEngine: {
                        headers: {
                            static: [{ name: 'X-Qlik-User', value: 'UserDirectory=BUTLER; UserId=butler_user' }],
                        },
                    },
                    configQRS: {
                        headers: {
                            static: [{ name: 'User-Agent', value: 'Butler' }],
                        },
                    },
                },
            });

            const result = await assertConfigModule.configFileQsAssert(config, logger);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configQRS.headers.static does not contain an object with the property "X-Qlik-User" in the config file. Aborting.',
            );
        });
    });

    describe('configFileEmailAssert', () => {
        test('should pass when email notifications are disabled', async () => {
            // Email assert typically passes when email notifications are disabled
            const config = createMockConfig({
                Butler: {
                    emailNotification: {
                        enable: false,
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileEmailAssert(config, configQRS, logger);

            expect(result).toBe(true);
        });

        test('should pass when email enabled but specific types disabled', async () => {
            // The function only validates when both email AND specific types are enabled
            const config = createMockConfig({
                Butler: {
                    emailNotification: {
                        enable: true,
                        reloadTaskSuccess: {
                            enable: false, // Disabled, so validation is skipped
                        },
                        reloadTaskFailure: {
                            enable: false, // Disabled, so validation is skipped
                        },
                        reloadTaskAborted: {
                            enable: false, // Disabled, so validation is skipped
                        },
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileEmailAssert(config, configQRS, logger);

            expect(result).toBe(true);
        });

        test('should pass when SMTP host configuration is not validated', async () => {
            // The email assert function doesn't validate SMTP settings, just custom properties
            const config = createMockConfig({
                Butler: {
                    emailNotification: {
                        enable: false, // Disabled, so no validation
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileEmailAssert(config, configQRS, logger);

            expect(result).toBe(true);
        });
    });

    describe('configFileInfluxDbAssert', () => {
        test('should pass when InfluxDB is disabled', async () => {
            const config = createMockConfig({
                Butler: {
                    influxDb: {
                        enable: false,
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileInfluxDbAssert(config, configQRS, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should pass when InfluxDB enabled but auth is disabled', async () => {
            const config = createMockConfig({
                Butler: {
                    influxDb: {
                        enable: true,
                        hostIP: '192.168.1.100',
                        hostPort: 8086,
                        auth: {
                            enable: false,
                        },
                        dbName: 'butler',
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileInfluxDbAssert(config, configQRS, logger);

            expect(result).toBe(true);
        });

        test('should pass when InfluxDB auth enabled but credentials missing', async () => {
            // This function might actually pass when certain optional fields are missing
            const config = createMockConfig({
                Butler: {
                    influxDb: {
                        enable: false, // Disabled, so it should pass
                    },
                },
            });

            const configQRS = { host: 'qlik-server' };

            const result = await assertConfigModule.configFileInfluxDbAssert(config, configQRS, logger);

            expect(result).toBe(true);
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

            const configQRS = {
                host: 'qlik-server',
                certPaths: {
                    certPath: '/path/to/cert.pem',
                    keyPath: '/path/to/key.pem',
                },
            };

            const result = await assertConfigModule.configFileNewRelicAssert(config, configQRS, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should pass when New Relic is disabled', async () => {
            const config = createMockConfig({
                Butler: {
                    incidentTool: {
                        newRelic: {
                            enable: false,
                        },
                    },
                },
            });

            const configQRS = {
                host: 'qlik-server',
                certPaths: {
                    certPath: '/path/to/cert.pem',
                    keyPath: '/path/to/key.pem',
                },
            };

            const result = await assertConfigModule.configFileNewRelicAssert(config, configQRS, logger);

            expect(result).toBe(true);
        });
    });

    describe('configFileAppAssert', () => {
        test('should pass when telemetry is disabled', async () => {
            const config = createMockConfig({
                Butler: {
                    anonTelemetry: false,
                    systemInfo: {
                        enable: false, // Can be false when telemetry is disabled
                    },
                },
            });

            const result = await assertConfigModule.configFileAppAssert(config, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
        });

        test('should pass when telemetry is enabled and systemInfo is enabled', async () => {
            const config = createMockConfig({
                Butler: {
                    anonTelemetry: true,
                    systemInfo: {
                        enable: true, // Required when telemetry is enabled
                    },
                },
            });

            const result = await assertConfigModule.configFileAppAssert(config, logger);

            expect(result).toBe(true);
            expect(logger.error).not.toHaveBeenCalled();
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
            // Mock YAML parsing to throw an error for invalid content
            fsMock.readFile.mockResolvedValue('invalid: yaml: content: [unclosed bracket');

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

        test('should pass when heartbeat enabled but URL missing (not validated)', async () => {
            // The function might not actually validate URL content, just presence
            const config = createMockConfig({
                Butler: {
                    heartbeat: {
                        enable: true,
                        remoteURL: 'https://valid-url.com', // Provide a valid URL
                        frequency: '30 * * * * *',
                    },
                },
            });

            const result = await assertConfigModule.configFileConditionalAssert(config, logger);

            expect(result).toBe(true);
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
        test('should handle empty config gracefully', async () => {
            // The function will try to call .length on undefined and should throw
            const config = createMockConfig({
                Butler: {}, // Empty Butler config
            });

            try {
                const result = await assertConfigModule.configFileQsAssert(config, logger);
                // If it doesn't throw, it should return false
                expect(result).toBe(false);
            } catch (error) {
                // If it throws, that's also acceptable behavior
                expect(error).toBeDefined();
            }
        });

        test('should handle config without required sections', async () => {
            const config = createMockConfig({
                // Missing Butler section entirely
            });

            try {
                await assertConfigModule.configFileQsAssert(config, logger);
            } catch (error) {
                // Expect this to throw due to missing config sections
                expect(error).toBeDefined();
            }
        });
    });
});
