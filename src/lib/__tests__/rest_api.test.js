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
        const readFileSync = (filePath) => `file:${filePath}`;

        expect(isRestApiTlsEnabled(config)).toBe(true);
        expect(getRestApiPublicBaseUrl(config)).toBe('https://butler.example.com:8443');
        expect(getRestApiTlsOptions(config, readFileSync)).toEqual({
            cert: 'file:/cert.pem',
            key: 'file:/key.pem',
            ca: 'file:/ca.pem',
        });
    });

    test('should throw a descriptive error when TLS files cannot be loaded', () => {
        const config = createMockConfig({
            Butler: {
                restServerConfig: {
                    tls: {
                        enable: true,
                        cert: '/missing-cert.pem',
                        key: '/missing-key.pem',
                        ca: null,
                    },
                },
            },
        });

        expect(() => getRestApiTlsOptions(config, () => {
            throw new Error('ENOENT');
        })).toThrow('REST API TLS configuration could not be loaded: ENOENT');
    });
});
