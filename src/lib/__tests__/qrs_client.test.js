import { jest } from '@jest/globals';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Set up axios.create mock immediately after mocking
axios.create = jest.fn();

// Mock globals module
const mockGlobals = {
    config: {
        get: jest.fn(),
    },
    configQRS: {
        certPaths: {
            certPath: '/path/to/cert.pem',
            keyPath: '/path/to/key.pem',
        },
        cert: 'mock-cert-content',
        key: 'mock-key-content',
        ca: 'mock-ca-content',
    },
};

jest.unstable_mockModule('../../globals.js', () => ({
    default: mockGlobals,
}));

const QrsClient = (await import('../qrs_client.js')).default;

describe('QrsClient', () => {
    let mockAxiosInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
        };

        axios.create.mockReturnValue(mockAxiosInstance);

        // Default config
        mockGlobals.config.get.mockImplementation((key) => {
            const config = {
                'Butler.configQRS.host': 'qlik-server.com',
                'Butler.configQRS.port': 4242,
                'Butler.configQRS.useSSL': true,
                'Butler.configQRS.rejectUnauthorized': false,
            };
            return config[key];
        });
    });

    describe('Constructor', () => {
        test('should create instance with default configuration from globals', () => {
            const client = new QrsClient();

            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://qlik-server.com:4242/qrs/',
                    timeout: 30000,
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-qlik-xrfkey': expect.any(String),
                    }),
                }),
            );
        });

        test('should create instance with custom configuration', () => {
            const customConfig = {
                hostname: 'custom-server.com',
                portNumber: 9999,
                useSSL: true,
                rejectUnauthorized: true,
                headers: {
                    'Custom-Header': 'value',
                },
            };

            const client = new QrsClient(customConfig);

            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'https://custom-server.com:9999/qrs/',
                    headers: expect.objectContaining({
                        'Custom-Header': 'value',
                    }),
                }),
            );
        });

        test('should use HTTP when useSSL is false', () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.configQRS.host') return 'qlik-server.com';
                if (key === 'Butler.configQRS.port') return 4242;
                if (key === 'Butler.configQRS.useSSL') return false;
                return undefined;
            });

            const client = new QrsClient();

            expect(axios.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseURL: 'http://qlik-server.com:4242/qrs/',
                }),
            );
        });

        test('should include certificates in HTTPS agent when provided', () => {
            const client = new QrsClient();

            const createCall = axios.create.mock.calls[0][0];
            expect(createCall.httpsAgent).toBeDefined();
        });

        test('should generate random 16-character xrfkey', () => {
            const client = new QrsClient();

            const createCall = axios.create.mock.calls[0][0];
            const xrfkey = createCall.headers['x-qlik-xrfkey'];

            expect(xrfkey).toBeDefined();
            expect(xrfkey.length).toBe(16);
            expect(/^[A-Za-z0-9]{16}$/.test(xrfkey)).toBe(true);
        });

        test('should generate different xrfkeys for different instances', () => {
            const client1 = new QrsClient();
            const client2 = new QrsClient();

            const xrfkey1 = axios.create.mock.calls[0][0].headers['x-qlik-xrfkey'];
            const xrfkey2 = axios.create.mock.calls[1][0].headers['x-qlik-xrfkey'];

            // Very unlikely to be equal if truly random
            expect(xrfkey1).not.toBe(xrfkey2);
        });
    });

    describe('GET requests', () => {
        test('should make successful GET request', async () => {
            const mockResponse = {
                status: 200,
                data: { id: 'app-123', name: 'Test App' },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const result = await client.Get('app/app-123');

            expect(result).toEqual({
                statusCode: 200,
                body: { id: 'app-123', name: 'Test App' },
            });
            expect(mockAxiosInstance.get).toHaveBeenCalledWith('app/app-123');
        });

        test('should handle GET request with error response', async () => {
            const mockError = {
                response: {
                    status: 404,
                    data: { message: 'Not found' },
                },
            };

            mockAxiosInstance.get.mockRejectedValueOnce(mockError);

            const client = new QrsClient();
            const result = await client.Get('app/nonexistent');

            expect(result).toEqual({
                statusCode: 404,
                body: { message: 'Not found' },
            });
        });

        test('should throw on network error without response', async () => {
            const networkError = new Error('Network timeout');

            mockAxiosInstance.get.mockRejectedValueOnce(networkError);

            const client = new QrsClient();

            await expect(client.Get('app/app-123')).rejects.toThrow('Network timeout');
        });
    });

    describe('POST requests', () => {
        test('should make successful POST request with data', async () => {
            const mockResponse = {
                status: 201,
                data: { id: 'task-456', name: 'New Task' },
            };

            mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const postData = { name: 'New Task', enabled: true };
            const result = await client.Post('reloadtask/create', postData);

            expect(result).toEqual({
                statusCode: 201,
                body: { id: 'task-456', name: 'New Task' },
            });
            expect(mockAxiosInstance.post).toHaveBeenCalledWith('reloadtask/create', postData);
        });

        test('should make POST request with empty data object', async () => {
            const mockResponse = {
                status: 200,
                data: { success: true },
            };

            mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const result = await client.Post('some/endpoint');

            expect(mockAxiosInstance.post).toHaveBeenCalledWith('some/endpoint', {});
        });

        test('should handle POST request with error response', async () => {
            const mockError = {
                response: {
                    status: 400,
                    data: { message: 'Bad request' },
                },
            };

            mockAxiosInstance.post.mockRejectedValueOnce(mockError);

            const client = new QrsClient();
            const result = await client.Post('reloadtask/create', {});

            expect(result).toEqual({
                statusCode: 400,
                body: { message: 'Bad request' },
            });
        });

        test('should throw on network error', async () => {
            const networkError = new Error('Connection refused');

            mockAxiosInstance.post.mockRejectedValueOnce(networkError);

            const client = new QrsClient();

            await expect(client.Post('endpoint', {})).rejects.toThrow('Connection refused');
        });
    });

    describe('PUT requests', () => {
        test('should make successful PUT request', async () => {
            const mockResponse = {
                status: 200,
                data: { id: 'task-789', name: 'Updated Task' },
            };

            mockAxiosInstance.put.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const updateData = { name: 'Updated Task' };
            const result = await client.Put('reloadtask/task-789', updateData);

            expect(result).toEqual({
                statusCode: 200,
                body: { id: 'task-789', name: 'Updated Task' },
            });
            expect(mockAxiosInstance.put).toHaveBeenCalledWith('reloadtask/task-789', updateData);
        });

        test('should handle PUT request with error response', async () => {
            const mockError = {
                response: {
                    status: 403,
                    data: { message: 'Forbidden' },
                },
            };

            mockAxiosInstance.put.mockRejectedValueOnce(mockError);

            const client = new QrsClient();
            const result = await client.Put('reloadtask/task-789', {});

            expect(result).toEqual({
                statusCode: 403,
                body: { message: 'Forbidden' },
            });
        });
    });

    describe('DELETE requests', () => {
        test('should make successful DELETE request', async () => {
            const mockResponse = {
                status: 204,
                data: null,
            };

            mockAxiosInstance.delete.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const result = await client.Delete('reloadtask/task-999');

            expect(result).toEqual({
                statusCode: 204,
                body: null,
            });
            expect(mockAxiosInstance.delete).toHaveBeenCalledWith('reloadtask/task-999');
        });

        test('should handle DELETE request with error response', async () => {
            const mockError = {
                response: {
                    status: 404,
                    data: { message: 'Not found' },
                },
            };

            mockAxiosInstance.delete.mockRejectedValueOnce(mockError);

            const client = new QrsClient();
            const result = await client.Delete('reloadtask/nonexistent');

            expect(result).toEqual({
                statusCode: 404,
                body: { message: 'Not found' },
            });
        });
    });

    describe('Edge cases', () => {
        test('should handle various HTTP status codes', async () => {
            const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500, 503];

            for (const statusCode of statusCodes) {
                jest.clearAllMocks();

                if (statusCode < 400) {
                    mockAxiosInstance.get.mockResolvedValueOnce({
                        status: statusCode,
                        data: { status: statusCode },
                    });
                } else {
                    mockAxiosInstance.get.mockRejectedValueOnce({
                        response: {
                            status: statusCode,
                            data: { error: `Error ${statusCode}` },
                        },
                    });
                }

                const client = new QrsClient();
                const result = await client.Get('test/endpoint');

                expect(result.statusCode).toBe(statusCode);
            }
        });

        test('should handle endpoints with query parameters', async () => {
            const mockResponse = {
                status: 200,
                data: { count: 5 },
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const result = await client.Get('app/full?filter=name eq "Test"');

            expect(mockAxiosInstance.get).toHaveBeenCalledWith('app/full?filter=name eq "Test"');
        });

        test('should handle special characters in endpoint', async () => {
            const mockResponse = {
                status: 200,
                data: {},
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const result = await client.Get('custompropertydefinition/full?filter=name eq "ÅÄÖ"');

            expect(mockAxiosInstance.get).toHaveBeenCalled();
        });

        test('should handle very large response bodies', async () => {
            const largeData = Array.from({ length: 10000 }, (_, i) => ({ id: `item-${i}` }));
            const mockResponse = {
                status: 200,
                data: largeData,
            };

            mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

            const client = new QrsClient();
            const result = await client.Get('app/full');

            expect(result.body).toEqual(largeData);
        });
    });

    describe('Configuration variations', () => {
        test('should handle missing certificate paths', () => {
            mockGlobals.configQRS.certPaths = null;

            const client = new QrsClient();

            expect(axios.create).toHaveBeenCalled();
        });

        test('should handle missing certificate content', () => {
            mockGlobals.configQRS.cert = undefined;
            mockGlobals.configQRS.key = undefined;
            mockGlobals.configQRS.ca = undefined;

            const client = new QrsClient();

            expect(axios.create).toHaveBeenCalled();
        });

        test('should merge custom headers with generated headers', () => {
            const customHeaders = {
                'X-Custom-Header': 'custom-value',
                'X-Another-Header': 'another-value',
            };

            const client = new QrsClient({ headers: customHeaders });

            const createCall = axios.create.mock.calls[0][0];
            expect(createCall.headers).toMatchObject(customHeaders);
            expect(createCall.headers['x-qlik-xrfkey']).toBeDefined();
        });

        test('should set xrfkey as query parameter', () => {
            const client = new QrsClient();

            const createCall = axios.create.mock.calls[0][0];
            expect(createCall.params).toEqual({
                xrfkey: expect.any(String),
            });
            expect(createCall.params.xrfkey.length).toBe(16);
        });
    });
});
