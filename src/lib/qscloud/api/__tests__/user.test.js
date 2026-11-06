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

jest.unstable_mockModule('axios', () => ({
    default: mockAxios,
}));

jest.unstable_mockModule('../../../../globals.js', () => ({
    default: mockGlobals,
}));

// Import the module under test
const { getQlikSenseCloudUserInfo, clearQlikSenseCloudUserInfoReads } = await import('../user.js');

describe('QS Cloud User API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Each test reads the users itself, instead of reusing what earlier tests read
        clearQlikSenseCloudUserInfoReads();

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
                '[QSCLOUD] QLIK SENSE CLOUD GET USER INFO: Could not get user "user123": Network error',
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
                }),
            );
        });

        test('should handle null user ID', async () => {
            const result = await getQlikSenseCloudUserInfo(null);

            expect(mockAxios.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: '/api/v1/users/null',
                }),
            );
        });
    });

    describe('reusing user reads', () => {
        const user = { id: 'user123', name: 'Test User', email: 'test@example.com' };

        beforeEach(() => {
            mockAxios.request.mockResolvedValue({ data: JSON.stringify(user) });
        });

        test('reuses a read of the same user from the last 5 minutes', async () => {
            const first = await getQlikSenseCloudUserInfo('user123');
            const second = await getQlikSenseCloudUserInfo('user123');

            expect(first).toEqual(user);
            expect(second).toEqual(user);
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        test('shares a read of the same user that is still under way', async () => {
            const [first, second] = await Promise.all([getQlikSenseCloudUserInfo('user123'), getQlikSenseCloudUserInfo('user123')]);

            expect(first).toEqual(user);
            expect(second).toEqual(user);
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        test('reads each user separately', async () => {
            await getQlikSenseCloudUserInfo('user123');
            await getQlikSenseCloudUserInfo('user456');

            expect(mockAxios.request).toHaveBeenCalledTimes(2);
            expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/v1/users/user456' }));
        });

        test('reads the user again once 5 minutes have passed', async () => {
            // Only the clock is faked, so the reads still resolve
            jest.useFakeTimers({ now: new Date('2026-11-06T13:00:00Z'), doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
            try {
                await getQlikSenseCloudUserInfo('user123');
                jest.setSystemTime(new Date('2026-11-06T13:04:59Z'));
                await getQlikSenseCloudUserInfo('user123');
                expect(mockAxios.request).toHaveBeenCalledTimes(1);

                jest.setSystemTime(new Date('2026-11-06T13:05:00Z'));
                await getQlikSenseCloudUserInfo('user123');
                expect(mockAxios.request).toHaveBeenCalledTimes(2);
            } finally {
                jest.useRealTimers();
            }
        });

        test('reads the user again after a read that failed', async () => {
            mockAxios.request.mockRejectedValueOnce(new Error('Network error'));

            const first = await getQlikSenseCloudUserInfo('user123');
            const second = await getQlikSenseCloudUserInfo('user123');

            expect(first).toBe(false);
            expect(second).toEqual(user);
            expect(mockAxios.request).toHaveBeenCalledTimes(2);
        });
    });
});
