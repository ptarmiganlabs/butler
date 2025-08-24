import { jest } from '@jest/globals';

// Mock modules before importing
const mockAxios = {
    request: jest.fn(),
};

const mockGlobals = {
    config: {
        get: jest.fn(),
    },
    logger: {
        error: jest.fn(),
    },
};

jest.unstable_mockModule('axios', () => ({
    default: mockAxios,
}));

jest.unstable_mockModule('../../../../globals.js', () => ({
    default: mockGlobals,
}));

// Import the module under test
const { getQlikSenseCloudUserInfo } = await import('../user.js');

describe('QS Cloud User API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Set up default config values
        mockGlobals.config.get.mockImplementation((path) => {
            const configs = {
                'Butler.qlikSenseCloud.event.mqtt.tenant.tenantUrl': 'https://tenant.qlik.com',
                'Butler.qlikSenseCloud.event.mqtt.tenant.auth.jwt.token': 'test-jwt-token',
            };
            return configs[path];
        });
    });

    describe('getQlikSenseCloudUserInfo', () => {
        test('should successfully retrieve user info', async () => {
            const mockUserData = {
                id: 'user123',
                name: 'Test User',
                email: 'test@example.com',
            };

            mockAxios.request.mockResolvedValue({
                data: JSON.stringify(mockUserData),
            });

            const result = await getQlikSenseCloudUserInfo('user123');

            expect(result).toEqual(mockUserData);
            expect(mockAxios.request).toHaveBeenCalledWith({
                url: '/api/v1/users/user123',
                method: 'get',
                baseURL: 'https://tenant.qlik.com',
                headers: {
                    Authorization: 'Bearer test-jwt-token',
                },
                timeout: 30000,
                responseType: 'application/json',
            });
        });

        test('should handle axios request errors', async () => {
            const mockError = new Error('Network error');
            mockAxios.request.mockRejectedValue(mockError);

            const result = await getQlikSenseCloudUserInfo('user123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                '[QSCLOUD] Qlik SENSE CLOUD GET SCRIPT LOG: Error: Network error'
            );
        });

        test('should handle invalid JSON response', async () => {
            mockAxios.request.mockResolvedValue({
                data: 'invalid json',
            });

            const result = await getQlikSenseCloudUserInfo('user123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });

        test('should handle missing configuration', async () => {
            mockGlobals.config.get.mockReturnValue(undefined);

            const result = await getQlikSenseCloudUserInfo('user123');

            expect(result).toBe(false);
        });

        test('should handle empty user ID', async () => {
            const result = await getQlikSenseCloudUserInfo('');

            expect(mockAxios.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/api/v1/users/',
                })
            );
        });

        test('should handle null user ID', async () => {
            const result = await getQlikSenseCloudUserInfo(null);

            expect(mockAxios.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/api/v1/users/null',
                })
            );
        });
    });
});