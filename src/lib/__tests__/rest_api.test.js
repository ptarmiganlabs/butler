import { jest } from '@jest/globals';
import { getRestApiPublicBaseUrl, getRestApiTlsOptions, isRestApiTlsEnabled } from '../rest_api.js';

const createMockConfig = (configData) => ({
    get(path) {
        return path.split('.').reduce((result, key) => result?.[key], configData);
    },
    has(path) {
        return path.split('.').reduce((result, key) => result?.[key], configData) !== undefined;
    },
});

describe('rest_api helpers', () => {
    test('should return http base URL when TLS is disabled', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    serverHost: 'localhost',
                    serverPort: 8080,
                    tls: {
                        enable: false,
                    },
                },
            },
        });

        expect(isRestApiTlsEnabled(config)).toBe(false);
        expect(getRestApiPublicBaseUrl(config)).toBe('http://localhost:8080');
        expect(getRestApiTlsOptions(config)).toBeUndefined();
    });

    test('should return https base URL and load TLS files when TLS is enabled', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    enable: true,
                    serverHost: 'butler.example.com',
                    serverPort: 8443,
                    tls: {
                        enable: true,
                        cert: '/cert.pem',
                        key: '/key.pem',
                        ca: '/ca.pem',
                    },
                },
            },
        });
        const readFileSync = jest.fn((filePath) => `file:${filePath}`);

        expect(isRestApiTlsEnabled(config)).toBe(true);
        expect(getRestApiPublicBaseUrl(config)).toBe('https://butler.example.com:8443');
        expect(getRestApiTlsOptions(config, readFileSync)).toEqual({
            cert: 'file:/cert.pem',
            key: 'file:/key.pem',
            ca: 'file:/ca.pem',
        });
        expect(readFileSync).toHaveBeenNthCalledWith(1, '/cert.pem', 'utf8');
        expect(readFileSync).toHaveBeenNthCalledWith(2, '/key.pem', 'utf8');
        expect(readFileSync).toHaveBeenNthCalledWith(3, '/ca.pem', 'utf8');
    });

    test('should omit CA from TLS options when CA is null', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    enable: true,
                    tls: {
                        enable: true,
                        cert: '/cert.pem',
                        key: '/key.pem',
                        ca: null,
                    },
                },
            },
        });
        const readFileSync = jest.fn((filePath) => `file:${filePath}`);

        expect(getRestApiTlsOptions(config, readFileSync)).toEqual({
            cert: 'file:/cert.pem',
            key: 'file:/key.pem',
        });
        expect(readFileSync).toHaveBeenNthCalledWith(1, '/cert.pem', 'utf8');
        expect(readFileSync).toHaveBeenNthCalledWith(2, '/key.pem', 'utf8');
    });

    test('should throw a descriptive error with cause when TLS files cannot be loaded', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    enable: true,
                    tls: {
                        enable: true,
                        cert: '/missing-cert.pem',
                        key: '/missing-key.pem',
                        ca: null,
                    },
                },
            },
        });
        const originalError = new Error('ENOENT');
        let thrownError;

        try {
            getRestApiTlsOptions(config, () => {
                throw originalError;
            });
        } catch (err) {
            thrownError = err;
        }

        expect(thrownError).toBeInstanceOf(Error);
        expect(thrownError.message).toBe('REST API TLS cert file could not be loaded (/missing-cert.pem): ENOENT');
        expect(thrownError.cause).toBe(originalError);
    });
});
