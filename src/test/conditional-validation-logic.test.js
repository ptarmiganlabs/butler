import { jest } from '@jest/globals';
import { configFileConditionalAssert } from '../lib/assert/assert_config_file.js';

/**
 * Test conditional validation logic directly
 */
describe('Conditional Validation Logic', () => {
    let mockConfig;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            error: jest.fn(),
            info: jest.fn(),
            debug: jest.fn()
        };

        // Mock config object with has() and get() methods
        mockConfig = {
            _data: {},
            has: jest.fn((path) => {
                const keys = path.split('.');
                let current = mockConfig._data;
                for (const key of keys) {
                    if (current && typeof current === 'object' && key in current) {
                        current = current[key];
                    } else {
                        return false;
                    }
                }
                return true;
            }),
            get: jest.fn((path) => {
                const keys = path.split('.');
                let current = mockConfig._data;
                for (const key of keys) {
                    if (current && typeof current === 'object' && key in current) {
                        current = current[key];
                    } else {
                        return undefined;
                    }
                }
                return current;
            })
        };
    });

    test('Should pass when configVisualisation is disabled', async () => {
        mockConfig._data = {
            Butler: {
                configVisualisation: {
                    enable: false
                    // Missing required fields: host, port, obfuscate
                }
            }
        };

        const result = await configFileConditionalAssert(mockConfig, mockLogger);
        expect(result).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('Should fail when configVisualisation is enabled but missing required fields', async () => {
        mockConfig._data = {
            Butler: {
                configVisualisation: {
                    enable: true
                    // Missing required fields: host, port, obfuscate
                }
            }
        };

        const result = await configFileConditionalAssert(mockConfig, mockLogger);
        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining("Missing required field 'Butler.configVisualisation.host' when configVisualisation is enabled")
        );
    });

    test('Should pass when configVisualisation is enabled with all required fields', async () => {
        mockConfig._data = {
            Butler: {
                configVisualisation: {
                    enable: true,
                    host: 'localhost',
                    port: 3100,
                    obfuscate: true
                }
            }
        };

        const result = await configFileConditionalAssert(mockConfig, mockLogger);
        expect(result).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('Should pass when uptimeMonitor.storeNewRelic is disabled', async () => {
        mockConfig._data = {
            Butler: {
                uptimeMonitor: {
                    enable: true,
                    frequency: 'every 15 minutes',
                    logLevel: 'verbose',
                    storeInInfluxdb: { enable: false },
                    storeNewRelic: {
                        enable: false
                        // Missing: destinationAccount, url, header, metric, attribute
                    }
                }
            }
        };

        const result = await configFileConditionalAssert(mockConfig, mockLogger);
        expect(result).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    test('Should fail when uptimeMonitor.storeNewRelic is enabled but missing required fields', async () => {
        mockConfig._data = {
            Butler: {
                uptimeMonitor: {
                    enable: true,
                    frequency: 'every 15 minutes',
                    logLevel: 'verbose',
                    storeInInfluxdb: { enable: false },
                    storeNewRelic: {
                        enable: true
                        // Missing: destinationAccount, url, header, metric, attribute
                    }
                }
            }
        };

        const result = await configFileConditionalAssert(mockConfig, mockLogger);
        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining("Missing required field 'Butler.uptimeMonitor.storeNewRelic.destinationAccount' when uptimeMonitor.storeNewRelic is enabled")
        );
    });

    test('Should pass when multiple features are disabled', async () => {
        mockConfig._data = {
            Butler: {
                configVisualisation: { enable: false },
                heartbeat: { enable: false },
                dockerHealthCheck: { enable: false },
                uptimeMonitor: { enable: false }
            }
        };

        const result = await configFileConditionalAssert(mockConfig, mockLogger);
        expect(result).toBe(true);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});