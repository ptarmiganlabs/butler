import { jest } from '@jest/globals';
import { default as Ajv } from 'ajv';
import { confifgFileSchema } from '../lib/assert/config-file-schema.js';

/**
 * Test conditional configuration validation
 * This test ensures that settings are only validated when their associated features are enabled.
 */
describe('Conditional Configuration Validation', () => {
    let ajv;

    beforeEach(async () => {
        ajv = new Ajv({
            strict: true,
            async: true,
            allErrors: true,
        });

        // Add keywords and formats like in configFileStructureAssert
        const ajvKeywords = await import('ajv-keywords');
        ajvKeywords.default(ajv);

        const ajvFormats = await import('ajv-formats');
        ajvFormats.default(ajv);
    });

    test('Should allow missing fields when feature is disabled - configVisualisation example', async () => {
        // This config has configVisualisation disabled but missing required fields
        const configWithDisabledFeature = {
            Butler: {
                logLevel: 'info',
                fileLogging: false,
                logDirectory: 'log',
                anonTelemetry: true,
                systemInfo: {
                    enable: true
                },
                configVisualisation: {
                    enable: false
                    // Missing: host, port, obfuscate - these should not be required when disabled
                },
                cert: {
                    clientCert: '/path/to/cert.crt',
                    clientCertKey: '/path/to/cert_key.pem',
                    clientCertCA: '/path/to/ca.crt'
                },
                configEngine: {
                    host: 'localhost',
                    port: 4747,
                    useSSL: true,
                    engineVersion: '12.1216.0',
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configQRS: {
                    authentication: 'certificates',
                    host: 'localhost',
                    port: 4242,
                    useSSL: true,
                    
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configDirectories: {
                    qvdPath: '/path/to/qvd'
                }
            }
        };

        const validate = ajv.compile(confifgFileSchema);
        const valid = await validate(configWithDisabledFeature);

        if (!valid) {
            console.log('Validation errors:', validate.errors);
        }

        // This should pass - when enable: false, other fields should not be required
        expect(valid).toBe(true);
    });

    test('Should require fields when feature is enabled - configVisualisation example', async () => {
        // This config has configVisualisation enabled but missing required fields  
        const configWithEnabledFeature = {
            Butler: {
                logLevel: 'info',
                fileLogging: false,
                logDirectory: 'log',
                anonTelemetry: true,
                systemInfo: {
                    enable: true
                },
                configVisualisation: {
                    enable: true
                    // Missing: host, port, obfuscate - these should be required when enabled
                },
                cert: {
                    clientCert: '/path/to/cert.crt',
                    clientCertKey: '/path/to/cert_key.pem',
                    clientCertCA: '/path/to/ca.crt'
                },
                configEngine: {
                    host: 'localhost',
                    port: 4747,
                    useSSL: true,
                    engineVersion: '12.1216.0',
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configQRS: {
                    authentication: 'certificates',
                    host: 'localhost',
                    port: 4242,
                    useSSL: true,
                    
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configDirectories: {
                    qvdPath: '/path/to/qvd'
                }
            }
        };

        const validate = ajv.compile(confifgFileSchema);
        const valid = await validate(configWithEnabledFeature);

        // This should fail - when enable: true, other fields should be required
        expect(valid).toBe(false);
        
        // Check that the errors mention the missing required fields
        const errorMessages = validate.errors.map(err => err.message).join(', ');
        expect(errorMessages).toContain('required');
    });

    test('Should allow missing fields when feature is disabled - heartbeat example', async () => {
        const configWithDisabledHeartbeat = {
            Butler: {
                logLevel: 'info',
                fileLogging: false,
                logDirectory: 'log',
                anonTelemetry: true,
                systemInfo: {
                    enable: true
                },
                heartbeat: {
                    enable: false
                    // Missing: remoteURL, frequency - should not be required when disabled
                },
                cert: {
                    clientCert: '/path/to/cert.crt',
                    clientCertKey: '/path/to/cert_key.pem',
                    clientCertCA: '/path/to/ca.crt'
                },
                configEngine: {
                    host: 'localhost',
                    port: 4747,
                    useSSL: true,
                    engineVersion: '12.1216.0',
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configQRS: {
                    authentication: 'certificates',
                    host: 'localhost',
                    port: 4242,
                    useSSL: true,
                    
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configDirectories: {
                    qvdPath: '/path/to/qvd'
                }
            }
        };

        const validate = ajv.compile(confifgFileSchema);
        const valid = await validate(configWithDisabledHeartbeat);

        if (!valid) {
            console.log('Heartbeat validation errors:', validate.errors);
        }

        expect(valid).toBe(true);
    });

    test('Should allow missing fields when feature is disabled - uptimeMonitor.storeNewRelic example', async () => {
        const configWithDisabledNewRelic = {
            Butler: {
                logLevel: 'info',
                fileLogging: false, 
                logDirectory: 'log',
                anonTelemetry: true,
                systemInfo: {
                    enable: true
                },
                uptimeMonitor: {
                    enable: true,
                    frequency: 'every 15 minutes',
                    logLevel: 'verbose',
                    storeInInfluxdb: {
                        enable: false
                    },
                    storeNewRelic: {
                        enable: false
                        // Missing: destinationAccount, url, header, metric, attribute
                        // These should not be required when enable: false
                    }
                },
                cert: {
                    clientCert: '/path/to/cert.crt',
                    clientCertKey: '/path/to/cert_key.pem',
                    clientCertCA: '/path/to/ca.crt'
                },
                configEngine: {
                    host: 'localhost',
                    port: 4747,
                    useSSL: true,
                    engineVersion: '12.1216.0',
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configQRS: {
                    authentication: 'certificates',
                    host: 'localhost',
                    port: 4242,
                    useSSL: true,
                    
                    headers: {
                        static: [{ name: 'X-Qlik-User', value: 'UserDirectory=Internal; UserId=sa_repository' }]
                    },
                    rejectUnauthorized: false
                },
                configDirectories: {
                    qvdPath: '/path/to/qvd'
                }
            }
        };

        const validate = ajv.compile(confifgFileSchema);
        const valid = await validate(configWithDisabledNewRelic);

        if (!valid) {
            console.log('New Relic validation errors:', validate.errors);
        }

        expect(valid).toBe(true);
    });
});