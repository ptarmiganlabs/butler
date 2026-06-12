import { jest } from '@jest/globals';

import { getRestApiScheme, getRestApiTlsOptions, getRestApiUrl, isRestApiTlsEnabled } from '../rest_server_config.js';

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
            if (result === undefined) {
                return false;
            }
        }
        return result !== undefined;
    }),
});

describe('rest_server_config', () => {
    const baseConfig = {
        Butler: {
            restServerConfig: {
                serverHost: 'localhost',
                serverPort: 8080,
                backgroundServerPort: 8081,
                tls: {
                    enable: false,
                    cert: '/tmp/server.crt',
                    key: '/tmp/server.key',
                    ca: null,
                },
            },
        },
    };

    test('should detect when REST API TLS is disabled', () => {
        const config = createMockConfig(baseConfig);

        expect(isRestApiTlsEnabled(config)).toBe(false);
        expect(getRestApiScheme(config)).toBe('http');
        expect(getRestApiUrl(config)).toBe('http://localhost:8080');
    });

    test('should detect when REST API TLS is enabled', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    ...baseConfig.Butler.restServerConfig,
                    tls: {
                        ...baseConfig.Butler.restServerConfig.tls,
                        enable: true,
                    },
                },
            },
        });

        expect(isRestApiTlsEnabled(config)).toBe(true);
        expect(getRestApiScheme(config)).toBe('https');
        expect(getRestApiUrl(config)).toBe('https://localhost:8080');
        expect(getRestApiUrl(config, 'backgroundServerPort')).toBe('https://localhost:8081');
    });

    test('should return undefined TLS options when TLS is disabled', () => {
        const config = createMockConfig(baseConfig);
        const fileSystem = { readFileSync: jest.fn() };

        expect(getRestApiTlsOptions(config, fileSystem)).toBeUndefined();
        expect(fileSystem.readFileSync).not.toHaveBeenCalled();
    });

    test('should load certificate, key and optional CA when TLS is enabled', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    ...baseConfig.Butler.restServerConfig,
                    tls: {
                        enable: true,
                        cert: '/tmp/server.crt',
                        key: '/tmp/server.key',
                        ca: '/tmp/root-ca.pem',
                    },
                },
            },
        });
        const fileSystem = {
            readFileSync: jest.fn((filePath) => Buffer.from(`file:${filePath}`)),
        };

        expect(getRestApiTlsOptions(config, fileSystem)).toEqual({
            cert: Buffer.from('file:/tmp/server.crt'),
            key: Buffer.from('file:/tmp/server.key'),
            ca: Buffer.from('file:/tmp/root-ca.pem'),
        });
    });
});
