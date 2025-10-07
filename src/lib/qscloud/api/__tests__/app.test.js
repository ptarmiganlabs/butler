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
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};

const mockVerifyGuid = jest.fn();

jest.unstable_mockModule('axios', () => ({
    default: mockAxios,
}));

jest.unstable_mockModule('../../../../globals.js', () => ({
    default: mockGlobals,
}));

jest.unstable_mockModule('../../../guid_util.js', () => ({
    verifyGuid: mockVerifyGuid,
}));

// Import the module under test
const { getQlikSenseCloudAppInfo, getQlikSenseCloudAppMetadata, getQlikSenseCloudAppItems } = await import('../app.js');

describe('QS Cloud App API', () => {
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

        // Default: valid GUID
        mockVerifyGuid.mockReturnValue(true);
    });

    describe('getQlikSenseCloudAppInfo', () => {
        test('should successfully retrieve app info', async () => {
            const mockAppData = {
                id: 'app123',
                name: 'Test App',
                description: 'Test Description',
            };

            mockAxios.request.mockResolvedValue({
                data: JSON.stringify(mockAppData),
            });

            const result = await getQlikSenseCloudAppInfo('app123');

            expect(result).toEqual(mockAppData);
            expect(mockVerifyGuid).toHaveBeenCalledWith('app123');
            expect(mockAxios.request).toHaveBeenCalledWith({
                url: '/api/v1/apps/app123',
                method: 'get',
                baseURL: 'https://tenant.qlik.com',
                headers: {
                    Authorization: 'Bearer test-jwt-token',
                },
                timeout: 30000,
                responseType: 'application/json',
            });
        });

        test('should return false for invalid GUID', async () => {
            mockVerifyGuid.mockReturnValue(false);

            const result = await getQlikSenseCloudAppInfo('invalid-guid');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith('[QSCLOUD] SENSE CLOUD GET APP ITEMS: Invalid appId: invalid-guid');
            expect(mockAxios.request).not.toHaveBeenCalled();
        });

        test('should handle axios request errors', async () => {
            const mockError = new Error('Network error');
            mockAxios.request.mockRejectedValue(mockError);

            const result = await getQlikSenseCloudAppInfo('app123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith('[QSCLOUD] SENSE CLOUD GET APP INFO: Network error');
        });

        test('should handle invalid JSON response', async () => {
            mockAxios.request.mockResolvedValue({
                data: 'invalid json',
            });

            const result = await getQlikSenseCloudAppInfo('app123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });
    });

    describe('getQlikSenseCloudAppMetadata', () => {
        test('should successfully retrieve app metadata', async () => {
            const mockMetadata = {
                tables: ['Table1', 'Table2'],
                fields: ['Field1', 'Field2'],
            };

            mockAxios.request.mockResolvedValue({
                data: JSON.stringify(mockMetadata),
            });

            const result = await getQlikSenseCloudAppMetadata('app123');

            expect(result).toEqual(mockMetadata);
            expect(mockAxios.request).toHaveBeenCalledWith({
                url: '/api/v1/apps/app123/data/metadata',
                method: 'get',
                baseURL: 'https://tenant.qlik.com',
                headers: {
                    Authorization: 'Bearer test-jwt-token',
                },
                timeout: 30000,
                responseType: 'application/json',
            });
        });

        test('should return false for invalid GUID', async () => {
            mockVerifyGuid.mockReturnValue(false);

            const result = await getQlikSenseCloudAppMetadata('invalid-guid');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith('[QSCLOUD] SENSE CLOUD GET APP ITEMS: Invalid appId: invalid-guid');
        });

        test('should handle axios request errors', async () => {
            const mockError = new Error('API error');
            mockAxios.request.mockRejectedValue(mockError);

            const result = await getQlikSenseCloudAppMetadata('app123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith('[QSCLOUD] SENSE CLOUD GET APP METADATA: API error');
        });
    });

    describe('getQlikSenseCloudAppItems', () => {
        test('should successfully retrieve app items', async () => {
            const mockItems = {
                data: [
                    { id: 'item1', name: 'Chart1', type: 'chart' },
                    { id: 'item2', name: 'Table1', type: 'table' },
                ],
                meta: { count: 2 },
            };

            mockAxios.request.mockResolvedValue({
                data: JSON.stringify(mockItems),
            });

            const result = await getQlikSenseCloudAppItems('app123');

            expect(result).toEqual(mockItems);
            expect(mockAxios.request).toHaveBeenCalledWith({
                url: '/api/v1/items',
                method: 'get',
                baseURL: 'https://tenant.qlik.com',
                params: {
                    resourceType: 'app',
                    resourceId: 'app123',
                    noActions: true,
                    limit: 100,
                },
                headers: {
                    Authorization: 'Bearer test-jwt-token',
                },
                timeout: 30000,
                responseType: 'application/json',
            });
        });

        test('should return false for invalid GUID', async () => {
            mockVerifyGuid.mockReturnValue(false);

            const result = await getQlikSenseCloudAppItems('invalid-guid');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith('[QSCLOUD] SENSE CLOUD GET APP ITEMS: Invalid appId: invalid-guid');
        });

        test('should handle axios request errors', async () => {
            const mockError = new Error('Items API error');
            mockAxios.request.mockRejectedValue(mockError);

            const result = await getQlikSenseCloudAppItems('app123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith('[QSCLOUD] Qlik SENSE CLOUD GET SCRIPT LOG: Items API error');
        });

        test('should handle empty app ID', async () => {
            const result = await getQlikSenseCloudAppItems('');

            expect(mockVerifyGuid).toHaveBeenCalledWith('');
        });

        test('should handle null app ID', async () => {
            const result = await getQlikSenseCloudAppItems(null);

            expect(mockVerifyGuid).toHaveBeenCalledWith(null);
        });
    });
});
