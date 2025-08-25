/* eslint-disable import/no-dynamic-require */
import { jest } from '@jest/globals';

describe('assert_config_file', () => {
    let assertConfigFile;
    let mockGlobals;
    let mockGetReloadTasksCustomProperties;
    let mockQrsInteract;
    let mockAjv;
    let mockAjvKeywords;
    let mockAjvFormats;
    let mockFs;
    let mockLoad;

    const mockConfig = {
        has: jest.fn(),
        get: jest.fn(),
    };

    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
    };

    beforeAll(async () => {
        // Mock globals
        mockGlobals = {
            config: mockConfig,
            logger: mockLogger,
            configFileExpanded: '/path/to/config.yaml'
        };

        // Mock QrsInteract
        mockQrsInteract = jest.fn().mockImplementation(() => ({
            Get: jest.fn()
        }));

        // Mock AJV and related modules
        mockAjv = jest.fn().mockImplementation(() => ({
            compile: jest.fn()
        }));

        mockAjvKeywords = {
            default: jest.fn()
        };

        mockAjvFormats = {
            default: jest.fn()
        };

        mockFs = {
            readFile: jest.fn()
        };

        mockLoad = jest.fn();

        // Mock dependencies
        await jest.unstable_mockModule('../../../globals.js', () => ({
            default: mockGlobals,
        }));

        await jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
            getReloadTasksCustomProperties: jest.fn(),
        }));

        await jest.unstable_mockModule('qrs-interact', () => ({
            default: mockQrsInteract,
        }));

        await jest.unstable_mockModule('ajv', () => ({
            default: mockAjv,
        }));

        await jest.unstable_mockModule('ajv-keywords', () => mockAjvKeywords);

        await jest.unstable_mockModule('ajv-formats', () => mockAjvFormats);

        await jest.unstable_mockModule('fs/promises', () => mockFs);

        await jest.unstable_mockModule('js-yaml', () => ({
            load: mockLoad,
        }));

        await jest.unstable_mockModule('./config-file-schema.js', () => ({
            confifgFileSchema: { type: 'object' }
        }));

        // Import the modules after mocking
        const taskCpModule = await import('../../../qrs_util/task_cp_util.js');
        mockGetReloadTasksCustomProperties = taskCpModule.getReloadTasksCustomProperties;

        // Import the module under test
        assertConfigFile = await import('../assert_config_file.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset default config responses
        mockConfig.has.mockReturnValue(true);
        mockConfig.get.mockReturnValue(true);
    });

    describe('configFileQsAssert', () => {
        test('should return true when all required headers are present', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.configEngine.headers.static') {
                    return [
                        { name: 'X-Qlik-User', value: 'UserDirectory=INTERNAL; UserId=sa_repository' },
                        { name: 'X-Custom-Header', value: 'custom-value' }
                    ];
                }
                if (key === 'Butler.configQRS.headers.static') {
                    return [
                        { name: 'X-Qlik-User', value: 'UserDirectory=INTERNAL; UserId=sa_repository' }
                    ];
                }
                return true;
            });

            const result = await assertConfigFile.configFileQsAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should return false when configEngine headers static is empty', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.configEngine.headers.static') {
                    return [];
                }
                if (key === 'Butler.configQRS.headers.static') {
                    return [{ name: 'X-Qlik-User', value: 'UserDirectory=INTERNAL; UserId=sa_repository' }];
                }
                return true;
            });

            const result = await assertConfigFile.configFileQsAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configEngine.headers.static is an empty array in the config file. Aborting.'
            );
        });

        test('should return false when configEngine headers static lacks X-Qlik-User', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.configEngine.headers.static') {
                    return [{ name: 'X-Custom-Header', value: 'custom-value' }];
                }
                if (key === 'Butler.configQRS.headers.static') {
                    return [{ name: 'X-Qlik-User', value: 'UserDirectory=INTERNAL; UserId=sa_repository' }];
                }
                return true;
            });

            const result = await assertConfigFile.configFileQsAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('does not contain an object with the property "X-Qlik-User"')
            );
        });

        test('should return false when configQRS headers static is empty', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.configEngine.headers.static') {
                    return [{ name: 'X-Qlik-User', value: 'UserDirectory=INTERNAL; UserId=sa_repository' }];
                }
                if (key === 'Butler.configQRS.headers.static') {
                    return [];
                }
                return true;
            });

            const result = await assertConfigFile.configFileQsAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG QS: Butler.configQRS.headers.static is an empty array in the config file. Aborting.'
            );
        });

        test('should return false when configQRS headers static lacks X-Qlik-User', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.configEngine.headers.static') {
                    return [{ name: 'X-Qlik-User', value: 'UserDirectory=INTERNAL; UserId=sa_repository' }];
                }
                if (key === 'Butler.configQRS.headers.static') {
                    return [{ name: 'X-Custom-Header', value: 'custom-value' }];
                }
                return true;
            });

            const result = await assertConfigFile.configFileQsAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Butler.configQRS.headers.static does not contain an object with the property "X-Qlik-User"')
            );
        });
    });

    describe('configFileEmailAssert', () => {
        const mockConfigQRS = {
            certPaths: {
                certPath: '/path/to/cert.pem',
                keyPath: '/path/to/key.pem'
            }
        };

        beforeEach(() => {
            mockGetReloadTasksCustomProperties.mockResolvedValue([
                { name: 'EmailAlert', choiceValues: ['yes', 'no'] },
                { name: 'EmailAddress', choiceValues: ['admin@company.com'] }
            ]);

            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.configQRS.host': 'qlik-server.com',
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.customPropertyName': 'EmailAlert',
                    'Butler.emailNotification.reloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName': 'EmailAddress',
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName': 'EmailAlert',
                    'Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName': 'EmailAddress',
                    'Butler.emailNotification.reloadTaskAborted.enable': true,
                    'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName': 'EmailAlert',
                    'Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName': 'EmailAddress'
                };
                return configMap[key] || false;
            });
        });

        test('should return true when email notifications are properly configured', async () => {
            const result = await assertConfigFile.configFileEmailAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true);
            expect(mockGetReloadTasksCustomProperties).toHaveBeenCalledTimes(3); // For success, failure, and aborted
        });

        test('should return true when email notifications are disabled', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return false;
                return false;
            });

            const result = await assertConfigFile.configFileEmailAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true);
            expect(mockGetReloadTasksCustomProperties).not.toHaveBeenCalled();
        });

        test('should return false when custom property does not exist for success notifications', async () => {
            mockGetReloadTasksCustomProperties.mockResolvedValue([
                { name: 'OtherProperty', choiceValues: ['yes', 'no'] }
            ]);

            const result = await assertConfigFile.configFileEmailAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Custom property 'EmailAlert' not found in Qlik Sense")
            );
        });

        test('should handle errors when fetching custom properties', async () => {
            mockGetReloadTasksCustomProperties.mockRejectedValue(new Error('QRS API Error'));

            const result = await assertConfigFile.configFileEmailAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true); // Function continues despite errors
            expect(mockLogger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG EMAIL: Error: QRS API Error'
            );
        });

        test('should validate failure notifications independently', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.enable': false,
                    'Butler.emailNotification.reloadTaskFailure.enable': true,
                    'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName': 'EmailAlert',
                    'Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName': 'EmailAddress',
                    'Butler.emailNotification.reloadTaskAborted.enable': false
                };
                return configMap[key] || false;
            });

            const result = await assertConfigFile.configFileEmailAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true);
            expect(mockGetReloadTasksCustomProperties).toHaveBeenCalledTimes(1); // Only for failure
        });

        test('should validate aborted notifications independently', async () => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.enable': false,
                    'Butler.emailNotification.reloadTaskFailure.enable': false,
                    'Butler.emailNotification.reloadTaskAborted.enable': true,
                    'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName': 'EmailAlert',
                    'Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName': 'EmailAddress'
                };
                return configMap[key] || false;
            });

            const result = await assertConfigFile.configFileEmailAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true);
            expect(mockGetReloadTasksCustomProperties).toHaveBeenCalledTimes(1); // Only for aborted
        });
    });

    describe('configFileInfluxDbAssert', () => {
        const mockConfigQRS = {
            certPaths: {
                certPath: '/path/to/cert.pem',
                keyPath: '/path/to/key.pem'
            }
        };

        beforeEach(() => {
            mockGetReloadTasksCustomProperties.mockResolvedValue([
                { name: 'InfluxDBMonitor', choiceValues: ['enabled', 'disabled'] }
            ]);

            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName': 'InfluxDBMonitor',
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue': 'enabled'
                };
                return configMap[key] || false;
            });

            mockConfig.has.mockImplementation((key) => {
                return ['Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName',
                        'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue'].includes(key);
            });
        });

        test('should return true when InfluxDB configuration is valid', async () => {
            const result = await assertConfigFile.configFileInfluxDbAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true);
            expect(mockGetReloadTasksCustomProperties).toHaveBeenCalled();
        });

        test('should return true when InfluxDB feature is disabled', async () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable') return false;
                return false;
            });

            const result = await assertConfigFile.configFileInfluxDbAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true);
            expect(mockGetReloadTasksCustomProperties).not.toHaveBeenCalled();
        });

        test('should return false when custom property does not exist', async () => {
            mockGetReloadTasksCustomProperties.mockResolvedValue([
                { name: 'OtherProperty', choiceValues: ['yes', 'no'] }
            ]);

            const result = await assertConfigFile.configFileInfluxDbAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Custom property 'InfluxDBMonitor' not found in Qlik Sense")
            );
        });

        test('should return false when custom property value does not exist', async () => {
            mockGetReloadTasksCustomProperties.mockResolvedValue([
                { name: 'InfluxDBMonitor', choiceValues: ['yes', 'no'] }
            ]);

            const result = await assertConfigFile.configFileInfluxDbAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Custom property value 'enabled' not found")
            );
        });

        test('should handle errors when fetching custom properties', async () => {
            mockGetReloadTasksCustomProperties.mockRejectedValue(new Error('QRS API Error'));

            const result = await assertConfigFile.configFileInfluxDbAssert(mockConfig, mockConfigQRS, mockLogger);

            expect(result).toBe(true); // Function continues despite errors
            expect(mockLogger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG INFLUXDB: Error: QRS API Error'
            );
        });
    });

    describe('configFileAppAssert', () => {
        test('should return true when telemetry and system info are both enabled', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.anonTelemetry';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.anonTelemetry') return true;
                if (key === 'Butler.systemInfo.enable') return true;
                return false;
            });

            const result = await assertConfigFile.configFileAppAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should return true when telemetry is missing (default enabled) and system info is enabled', async () => {
            mockConfig.has.mockReturnValue(false); // No telemetry config = default enabled
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.systemInfo.enable') return true;
                return false;
            });

            const result = await assertConfigFile.configFileAppAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should return true when telemetry is disabled regardless of system info', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.anonTelemetry';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.anonTelemetry') return false;
                if (key === 'Butler.systemInfo.enable') return false;
                return false;
            });

            const result = await assertConfigFile.configFileAppAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should return false when telemetry is enabled but system info is disabled', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.anonTelemetry';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.anonTelemetry') return true;
                if (key === 'Butler.systemInfo.enable') return false;
                return false;
            });

            const result = await assertConfigFile.configFileAppAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Anonymous telemetry is enabled')
            );
        });

        test('should return false when telemetry is missing (default enabled) but system info is disabled', async () => {
            mockConfig.has.mockReturnValue(false); // No telemetry config = default enabled
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.systemInfo.enable') return false;
                return false;
            });

            const result = await assertConfigFile.configFileAppAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Anonymous telemetry is enabled')
            );
        });
    });

    describe('configFileStructureAssert', () => {
        let mockAjvInstance;
        let mockValidate;

        beforeEach(() => {
            mockValidate = jest.fn();
            mockAjvInstance = {
                compile: jest.fn().mockReturnValue(mockValidate)
            };
            mockAjv.mockReturnValue(mockAjvInstance);

            mockFs.readFile.mockResolvedValue('Butler:\n  systemInfo:\n    enable: true');
            mockLoad.mockReturnValue({ Butler: { systemInfo: { enable: true } } });
            mockValidate.mockResolvedValue(true);
        });

        test('should return true when config file is valid', async () => {
            const result = await assertConfigFile.configFileStructureAssert();

            expect(result).toBe(true);
            expect(mockAjv).toHaveBeenCalledWith({
                strict: true,
                async: true,
                allErrors: true
            });
            expect(mockAjvKeywords.default).toHaveBeenCalledWith(mockAjvInstance);
            expect(mockAjvFormats.default).toHaveBeenCalledWith(mockAjvInstance);
            expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/config.yaml', 'utf8');
            expect(mockLoad).toHaveBeenCalled();
            expect(mockValidate).toHaveBeenCalled();
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Your config file at /path/to/config.yaml is valid')
            );
        });

        test('should handle invalid YAML', async () => {
            mockLoad.mockImplementation(() => {
                throw new Error('Invalid YAML syntax');
            });

            const result = await assertConfigFile.configFileStructureAssert();

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Config file is not valid YAML')
            );
        });

        test('should handle schema validation errors', async () => {
            mockValidate.mockResolvedValue(false);
            mockValidate.errors = [
                {
                    instancePath: '/Butler/systemInfo',
                    schemaPath: '#/properties/Butler/properties/systemInfo/required',
                    keyword: 'required',
                    params: { missingProperty: 'enable' },
                    message: 'must have required property \'enable\''
                }
            ];

            // Mock process.exit to prevent actual exit
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

            await assertConfigFile.configFileStructureAssert();

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                'VERIFY CONFIG FILE: /Butler/systemInfo : must have required property \'enable\''
            );
            expect(mockExit).toHaveBeenCalledWith(1);

            mockExit.mockRestore();
        });

        test('should handle file read errors', async () => {
            mockFs.readFile.mockRejectedValue(new Error('File not found'));

            const result = await assertConfigFile.configFileStructureAssert();

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('VERIFY CONFIG FILE: Error: File not found')
            );
        });
    });

    describe('configFileConditionalAssert', () => {
        test('should return true when no conditional features are enabled', async () => {
            mockConfig.has.mockReturnValue(false);
            mockConfig.get.mockReturnValue(false);

            const result = await assertConfigFile.configFileConditionalAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should validate configVisualisation fields when enabled', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key.startsWith('Butler.configVisualisation');
            });
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.configVisualisation.enable': true,
                    'Butler.configVisualisation.host': 'localhost',
                    'Butler.configVisualisation.port': 3000,
                    'Butler.configVisualisation.obfuscate': false
                };
                return configMap[key] || false;
            });

            const result = await assertConfigFile.configFileConditionalAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should return false when configVisualisation is enabled but missing required fields', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key === 'Butler.configVisualisation.enable';
            });
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.configVisualisation.enable') return true;
                return false;
            });

            const result = await assertConfigFile.configFileConditionalAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Missing required field 'Butler.configVisualisation.host'")
            );
        });

        test('should validate heartbeat fields when enabled', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key.startsWith('Butler.heartbeat');
            });
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.heartbeat.enable': true,
                    'Butler.heartbeat.remoteURL': 'https://heartbeat.example.com',
                    'Butler.heartbeat.frequency': 30000
                };
                return configMap[key] || false;
            });

            const result = await assertConfigFile.configFileConditionalAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should validate multiple features at once', async () => {
            mockConfig.has.mockImplementation((key) => {
                return key.startsWith('Butler.heartbeat') || key.startsWith('Butler.scheduler');
            });
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.heartbeat.enable': true,
                    'Butler.heartbeat.remoteURL': 'https://heartbeat.example.com',
                    'Butler.heartbeat.frequency': 30000,
                    'Butler.scheduler.enable': true,
                    'Butler.scheduler.configfile': '/path/to/schedule.yaml'
                };
                return configMap[key] || false;
            });

            const result = await assertConfigFile.configFileConditionalAssert(mockConfig, mockLogger);

            expect(result).toBe(true);
        });

        test('should handle errors gracefully', async () => {
            mockConfig.has.mockImplementation(() => {
                throw new Error('Config access error');
            });

            const result = await assertConfigFile.configFileConditionalAssert(mockConfig, mockLogger);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'ASSERT CONFIG CONDITIONAL: Error: Config access error'
            );
        });
    });
});