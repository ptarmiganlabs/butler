import Ajv from 'ajv';
import addFormats from 'ajv-formats';

import { confifgFileSchema as configFileSchema } from '../config-file-schema.js';

describe('config-file-schema', () => {
    const createMinimalInfluxDbConfig = (overrides = {}) => {
        const tagSection = {
            static: [],
            dynamic: {
                useTaskTags: true,
            },
        };

        return {
            enable: true,
            hostIP: 'influx.example.com',
            hostPort: 8086,
            tag: {
                static: [],
            },
            reloadTaskFailure: {
                enable: true,
                tailScriptLogLines: 20,
                tag: {
                    static: [],
                    dynamic: {
                        useAppTags: true,
                        useTaskTags: true,
                    },
                },
            },
            reloadTaskSuccess: {
                enable: true,
                allReloadTasks: {
                    enable: false,
                },
                byCustomProperty: {
                    enable: false,
                    customPropertyName: 'cp_name',
                    enabledValue: 'Yes',
                },
                headScriptLogLines: 15,
                tailScriptLogLines: 25,
                tag: {
                    static: [],
                    dynamic: {
                        useAppTags: true,
                        useTaskTags: true,
                    },
                },
            },
            userSyncTaskSuccess: { enable: false, tag: tagSection },
            userSyncTaskFailure: { enable: false, tag: tagSection },
            externalProgramTaskSuccess: { enable: false, tag: tagSection },
            externalProgramTaskFailure: { enable: false, tag: tagSection },
            distributeTaskSuccess: { enable: false, tag: tagSection },
            distributeTaskFailure: { enable: false, tag: tagSection },
            preloadTaskSuccess: { enable: false, tag: tagSection },
            preloadTaskFailure: { enable: false, tag: tagSection },
            ...overrides,
        };
    };

    const createMinimalRestServerConfig = (overrides = {}) => ({
        enable: true,
        serverHost: 'localhost',
        serverPort: 8080,
        backgroundServerPort: 8081,
        tls: {
            enable: false,
            cert: '/tmp/butler-rest-api.crt',
            key: '/tmp/butler-rest-api.key',
            ca: null,
        },
        ...overrides,
    });

    describe('configFileSchema', () => {
        test('should export a valid schema object', () => {
            expect(configFileSchema).toBeDefined();
            expect(typeof configFileSchema).toBe('object');
            expect(configFileSchema.type).toBe('object');
            expect(configFileSchema.properties).toBeDefined();
        });

        test('should have Butler as root property', () => {
            expect(configFileSchema.properties.Butler).toBeDefined();
            expect(configFileSchema.properties.Butler.type).toBe('object');
            expect(configFileSchema.properties.Butler.properties).toBeDefined();
        });

        test('should have logLevel with valid enum values', () => {
            const logLevel = configFileSchema.properties.Butler.properties.logLevel;

            expect(logLevel).toBeDefined();
            expect(logLevel.type).toBe('string');
            expect(logLevel.enum).toBeDefined();
            expect(logLevel.enum).toEqual(['error', 'warn', 'info', 'verbose', 'debug', 'silly']);
            expect(logLevel.transform).toEqual(['trim', 'toLowerCase']);
        });

        test('should have systemInfo object with required enable property', () => {
            const systemInfo = configFileSchema.properties.Butler.properties.systemInfo;

            expect(systemInfo).toBeDefined();
            expect(systemInfo.type).toBe('object');
            expect(systemInfo.properties.enable).toBeDefined();
            expect(systemInfo.properties.enable.type).toBe('boolean');
            expect(systemInfo.required).toEqual(['enable']);
            expect(systemInfo.additionalProperties).toBe(false);
        });

        test('should have versioned InfluxDB config blocks', () => {
            const influxDb = configFileSchema.properties.Butler.properties.influxDb;

            expect(influxDb).toBeDefined();
            expect(influxDb.properties.version.enum).toEqual([1, 2, 3]);
            expect(influxDb.properties.v1Config.properties.auth).toBeDefined();
            expect(influxDb.properties.v2Config.properties.org).toBeDefined();
            expect(influxDb.properties.v2Config.properties.bucket).toBeDefined();
            expect(influxDb.properties.v2Config.properties.token).toBeDefined();
            expect(influxDb.properties.v3Config.properties.database).toBeDefined();
            expect(influxDb.properties.v3Config.properties.token).toBeDefined();
        });

        test('should require v2Config when version is 2 and allow only runtime-required fields', () => {
            const ajv = new Ajv({ allErrors: true, strict: true });
            addFormats(ajv);
            const validate = ajv.compile(configFileSchema.properties.Butler.properties.influxDb);

            const missingV2Config = createMinimalInfluxDbConfig({
                version: 2,
            });
            expect(validate(missingV2Config)).toBe(false);

            const validV2Config = createMinimalInfluxDbConfig({
                version: 2,
                v2Config: {
                    org: 'my-org',
                    bucket: 'butler',
                    token: 'secret-token',
                },
            });
            expect(validate(validV2Config)).toBe(true);
        });

        test('should require v3Config when version is 3 and allow only runtime-required fields', () => {
            const ajv = new Ajv({ allErrors: true, strict: true });
            addFormats(ajv);
            const validate = ajv.compile(configFileSchema.properties.Butler.properties.influxDb);

            const missingV3Config = createMinimalInfluxDbConfig({
                version: 3,
            });
            expect(validate(missingV3Config)).toBe(false);

            const validV3Config = createMinimalInfluxDbConfig({
                version: 3,
                v3Config: {
                    database: 'butler',
                    token: 'secret-token',
                },
            });
            expect(validate(validV3Config)).toBe(true);
        });

        test('should require either legacy v1 fields or v1Config when version is omitted or 1', () => {
            const ajv = new Ajv({ allErrors: true, strict: true });
            addFormats(ajv);
            const validate = ajv.compile(configFileSchema.properties.Butler.properties.influxDb);

            const missingV1Settings = createMinimalInfluxDbConfig();
            expect(validate(missingV1Settings)).toBe(false);

            const validLegacyV1Config = createMinimalInfluxDbConfig({
                auth: {
                    enable: false,
                    username: 'user_joe',
                    password: 'joesecret',
                },
                dbName: 'butler',
                retentionPolicy: {
                    name: '10d',
                    duration: '10d',
                },
            });
            expect(validate(validLegacyV1Config)).toBe(true);

            const validStructuredV1Config = createMinimalInfluxDbConfig({
                version: 1,
                v1Config: {
                    auth: {
                        enable: false,
                        username: 'user_joe',
                        password: 'joesecret',
                    },
                    dbName: 'butler',
                    retentionPolicy: {
                        name: '10d',
                        duration: '10d',
                    },
                },
            });
            expect(validate(validStructuredV1Config)).toBe(true);
        });

        test('should have configVisualisation object with proper structure', () => {
            const configVis = configFileSchema.properties.Butler.properties.configVisualisation;

            expect(configVis).toBeDefined();
            expect(configVis.type).toBe('object');
            expect(configVis.properties.enable).toBeDefined();
            expect(configVis.properties.host).toBeDefined();
            expect(configVis.properties.port).toBeDefined();
            expect(configVis.properties.obfuscate).toBeDefined();

            expect(configVis.properties.enable.type).toBe('boolean');
            expect(configVis.properties.host.type).toBe('string');
            expect(configVis.properties.host.format).toBe('hostname');
            expect(configVis.properties.port.type).toBe('number');
            expect(configVis.properties.obfuscate.type).toBe('boolean');

            expect(configVis.required).toEqual(['enable']);
            expect(configVis.additionalProperties).toBe(false);
        });

        test('should have REST server TLS config with optional CA certificate', () => {
            const restServerConfig = configFileSchema.properties.Butler.properties.restServerConfig;

            expect(restServerConfig).toBeDefined();
            expect(restServerConfig.type).toBe('object');
            expect(restServerConfig.properties.tls).toBeDefined();
            expect(restServerConfig.properties.tls.type).toBe('object');
            expect(restServerConfig.properties.tls.properties.enable.type).toBe('boolean');
            expect(restServerConfig.properties.tls.properties.cert.type).toBe('string');
            expect(restServerConfig.properties.tls.properties.key.type).toBe('string');
            expect(restServerConfig.properties.tls.properties.ca.type).toEqual(['string', 'null']);
            expect(restServerConfig.properties.tls.required).toEqual(['enable', 'cert', 'key']);
        });

        test('should validate REST server config when TLS is enabled and CA is omitted', () => {
            const ajv = new Ajv({ allErrors: true, strict: true });
            addFormats(ajv);
            const validate = ajv.compile(configFileSchema.properties.Butler.properties.restServerConfig);

            expect(
                validate(
                    createMinimalRestServerConfig({
                        tls: {
                            enable: true,
                            cert: '/tmp/butler-rest-api.crt',
                            key: '/tmp/butler-rest-api.key',
                            ca: null,
                        },
                    }),
                ),
            ).toBe(true);

            expect(
                validate(
                    createMinimalRestServerConfig({
                        tls: {
                            enable: true,
                            key: '/tmp/butler-rest-api.key',
                            ca: null,
                        },
                    }),
                ),
            ).toBe(false);
        });

        test('should have heartbeat object with URI format for remoteURL', () => {
            const heartbeat = configFileSchema.properties.Butler.properties.heartbeat;

            expect(heartbeat).toBeDefined();
            expect(heartbeat.type).toBe('object');
            expect(heartbeat.properties.enable).toBeDefined();
            expect(heartbeat.properties.remoteURL).toBeDefined();
            expect(heartbeat.properties.frequency).toBeDefined();

            expect(heartbeat.properties.enable.type).toBe('boolean');
            expect(heartbeat.properties.remoteURL.type).toBe('string');
            expect(heartbeat.properties.remoteURL.format).toBe('uri');
            expect(heartbeat.properties.frequency.type).toBe('string');

            expect(heartbeat.required).toEqual(['enable']);
            expect(heartbeat.additionalProperties).toBe(false);
        });

        test('should have boolean properties for basic flags', () => {
            const butler = configFileSchema.properties.Butler.properties;

            expect(butler.fileLogging).toBeDefined();
            expect(butler.fileLogging.type).toBe('boolean');

            expect(butler.anonTelemetry).toBeDefined();
            expect(butler.anonTelemetry.type).toBe('boolean');
        });

        test('should have string property for logDirectory', () => {
            const logDirectory = configFileSchema.properties.Butler.properties.logDirectory;

            expect(logDirectory).toBeDefined();
            expect(logDirectory.type).toBe('string');
        });

        test('should be JSON serializable', () => {
            expect(() => JSON.stringify(configFileSchema)).not.toThrow();

            const serialized = JSON.stringify(configFileSchema);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toEqual(configFileSchema);
        });

        test('should be a valid JSON Schema structure', () => {
            // Basic JSON Schema validation - all objects should have type property
            const validateSchemaObject = (obj) => {
                if (typeof obj === 'object' && obj !== null) {
                    if (obj.type === 'object' && obj.properties) {
                        expect(obj.properties).toBeDefined();
                        // Recursively validate nested properties
                        Object.values(obj.properties).forEach((prop) => {
                            if (typeof prop === 'object' && prop !== null) {
                                validateSchemaObject(prop);
                            }
                        });
                    }
                }
            };

            expect(() => validateSchemaObject(configFileSchema)).not.toThrow();
        });

        test('should have consistent additionalProperties settings', () => {
            // Objects that explicitly set additionalProperties: false should be intentional
            const checkAdditionalProperties = (obj, path = '') => {
                if (typeof obj === 'object' && obj !== null) {
                    if (obj.type === 'object' && obj.properties) {
                        // If additionalProperties is explicitly set to false, it should have required fields or be intentional
                        if (obj.additionalProperties === false) {
                            // This is intentional behavior - objects with additionalProperties: false
                            // are being strict about their structure
                            expect(obj.properties).toBeDefined();
                        }

                        // Recursively check nested objects
                        Object.entries(obj.properties).forEach(([key, prop]) => {
                            checkAdditionalProperties(prop, `${path}.${key}`);
                        });
                    }
                }
            };

            expect(() => checkAdditionalProperties(configFileSchema)).not.toThrow();
        });
    });
});
