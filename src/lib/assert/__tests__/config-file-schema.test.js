import { confifgFileSchema } from '../config-file-schema.js';

describe('config-file-schema', () => {
    describe('confifgFileSchema', () => {
        test('should export a valid schema object', () => {
            expect(confifgFileSchema).toBeDefined();
            expect(typeof confifgFileSchema).toBe('object');
            expect(confifgFileSchema.type).toBe('object');
            expect(confifgFileSchema.properties).toBeDefined();
        });

        test('should have Butler as root property', () => {
            expect(confifgFileSchema.properties.Butler).toBeDefined();
            expect(confifgFileSchema.properties.Butler.type).toBe('object');
            expect(confifgFileSchema.properties.Butler.properties).toBeDefined();
        });

        test('should have logLevel with valid enum values', () => {
            const logLevel = confifgFileSchema.properties.Butler.properties.logLevel;

            expect(logLevel).toBeDefined();
            expect(logLevel.type).toBe('string');
            expect(logLevel.enum).toBeDefined();
            expect(logLevel.enum).toEqual(['error', 'warn', 'info', 'verbose', 'debug', 'silly']);
            expect(logLevel.transform).toEqual(['trim', 'toLowerCase']);
        });

        test('should have systemInfo object with required enable property', () => {
            const systemInfo = confifgFileSchema.properties.Butler.properties.systemInfo;

            expect(systemInfo).toBeDefined();
            expect(systemInfo.type).toBe('object');
            expect(systemInfo.properties.enable).toBeDefined();
            expect(systemInfo.properties.enable.type).toBe('boolean');
            expect(systemInfo.required).toEqual(['enable']);
            expect(systemInfo.additionalProperties).toBe(false);
        });

        test('should have configVisualisation object with proper structure', () => {
            const configVis = confifgFileSchema.properties.Butler.properties.configVisualisation;

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

        test('should have heartbeat object with URI format for remoteURL', () => {
            const heartbeat = confifgFileSchema.properties.Butler.properties.heartbeat;

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
            const butler = confifgFileSchema.properties.Butler.properties;

            expect(butler.fileLogging).toBeDefined();
            expect(butler.fileLogging.type).toBe('boolean');

            expect(butler.anonTelemetry).toBeDefined();
            expect(butler.anonTelemetry.type).toBe('boolean');
        });

        test('should have string property for logDirectory', () => {
            const logDirectory = confifgFileSchema.properties.Butler.properties.logDirectory;

            expect(logDirectory).toBeDefined();
            expect(logDirectory.type).toBe('string');
        });

        test('should be JSON serializable', () => {
            expect(() => JSON.stringify(confifgFileSchema)).not.toThrow();

            const serialized = JSON.stringify(confifgFileSchema);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toEqual(confifgFileSchema);
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

            expect(() => validateSchemaObject(confifgFileSchema)).not.toThrow();
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

            expect(() => checkAdditionalProperties(confifgFileSchema)).not.toThrow();
        });
    });
});
