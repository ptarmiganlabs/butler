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
        verbose: jest.fn(),
        debug: jest.fn(),
    },
};

const mockLuxon = {
    Duration: {
        fromObject: jest.fn(),
    },
    DateTime: {
        fromISO: jest.fn(),
        DATETIME_SHORT_WITH_SECONDS: 'short_with_seconds',
        DATETIME_MED_WITH_SECONDS: 'med_with_seconds',
        DATETIME_FULL_WITH_SECONDS: 'full_with_seconds',
    },
};

jest.unstable_mockModule('axios', () => ({
    default: mockAxios,
}));

jest.unstable_mockModule('../../../../globals.js', () => ({
    default: mockGlobals,
}));

jest.unstable_mockModule('luxon', () => mockLuxon);

// Import the module under test
const { 
    getQlikSenseCloudAppReloadScriptLog,
    getQlikSenseCloudAppReloadScriptLogHead,
    getQlikSenseCloudAppReloadScriptLogTail,
    getQlikSenseCloudAppReloadInfo
} = await import('../appreloadinfo.js');

describe('QS Cloud App Reload Info API', () => {
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

    describe('getQlikSenseCloudAppReloadScriptLog', () => {
        test('should successfully retrieve script log', async () => {
            const mockLogData = 'Line 1\r\nLine 2\r\nLine 3\r\nLine 4';
            
            mockAxios.request.mockResolvedValue({
                data: mockLogData,
            });

            const result = await getQlikSenseCloudAppReloadScriptLog('app123', 'reload456');

            expect(result).toEqual({
                scriptLogFull: ['Line 1', 'Line 2', 'Line 3', 'Line 4'],
                scriptLogSize: 4,
            });

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: '/api/v1/apps/app123/reloads/logs/reload456',
                method: 'get',
                baseURL: 'https://tenant.qlik.com',
                headers: {
                    Authorization: 'Bearer test-jwt-token',
                },
                timeout: 30000,
                responseType: 'application/json',
            });

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(
                '[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Done getting script log'
            );
        });

        test('should handle axios request errors', async () => {
            const mockError = new Error('Network error');
            mockAxios.request.mockRejectedValue(mockError);

            const result = await getQlikSenseCloudAppReloadScriptLog('app123', 'reload456');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                '[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Error: Network error'
            );
        });

        test('should handle empty log data', async () => {
            mockAxios.request.mockResolvedValue({
                data: '',
            });

            const result = await getQlikSenseCloudAppReloadScriptLog('app123', 'reload456');

            expect(result).toEqual({
                scriptLogFull: [''],
                scriptLogSize: 1,
            });
        });

        test('should handle single line log', async () => {
            mockAxios.request.mockResolvedValue({
                data: 'Single line log',
            });

            const result = await getQlikSenseCloudAppReloadScriptLog('app123', 'reload456');

            expect(result).toEqual({
                scriptLogFull: ['Single line log'],
                scriptLogSize: 1,
            });
        });
    });

    describe('getQlikSenseCloudAppReloadScriptLogHead', () => {
        test('should return head lines when count > 0', () => {
            const scriptLogFull = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
            
            const result = getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, 2);

            expect(result).toBe('Line 1\r\nLine 2');
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(
                '[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Script log head:\nLine 1\r\nLine 2'
            );
        });

        test('should return empty string when count is 0', () => {
            const scriptLogFull = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
            
            const result = getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, 0);

            expect(result).toBe('');
            expect(mockGlobals.logger.debug).not.toHaveBeenCalled();
        });

        test('should handle count larger than array length', () => {
            const scriptLogFull = ['Line 1', 'Line 2'];
            
            const result = getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, 5);

            expect(result).toBe('Line 1\r\nLine 2');
        });

        test('should handle empty array', () => {
            const scriptLogFull = [];
            
            const result = getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, 2);

            expect(result).toBe('');
        });

        test('should handle negative count', () => {
            const scriptLogFull = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
            
            const result = getQlikSenseCloudAppReloadScriptLogHead(scriptLogFull, -1);

            expect(result).toBe('');
        });
    });

    describe('getQlikSenseCloudAppReloadScriptLogTail', () => {
        test('should return tail lines when count > 0', () => {
            const scriptLogFull = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
            
            const result = getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, 2);

            expect(result).toBe('Line 3\r\nLine 4');
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(
                '[QSCLOUD] QLIK SENSE CLOUD GET SCRIPT LOG: Script log tails:\nLine 3\r\nLine 4'
            );
        });

        test('should return empty string when count is 0', () => {
            const scriptLogFull = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
            
            const result = getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, 0);

            expect(result).toBe('');
            expect(mockGlobals.logger.debug).not.toHaveBeenCalled();
        });

        test('should handle count larger than array length', () => {
            const scriptLogFull = ['Line 1', 'Line 2'];
            
            const result = getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, 5);

            expect(result).toBe('Line 1\r\nLine 2');
        });

        test('should handle empty array', () => {
            const scriptLogFull = [];
            
            const result = getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, 2);

            expect(result).toBe('');
        });

        test('should handle negative count', () => {
            const scriptLogFull = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
            
            const result = getQlikSenseCloudAppReloadScriptLogTail(scriptLogFull, -1);

            expect(result).toBe('');
        });
    });

    describe('getQlikSenseCloudAppReloadInfo', () => {
        beforeEach(() => {
            // Mock DateTime for reload info tests
            const mockDateTimeInstance = {
                diff: jest.fn(),
                toFormat: jest.fn(),
                toLocaleString: jest.fn(),
                shiftTo: jest.fn(),
                toObject: jest.fn(),
            };

            mockDateTimeInstance.diff.mockReturnValue({
                shiftTo: jest.fn().mockReturnValue({
                    toObject: jest.fn().mockReturnValue({
                        hours: 1,
                        minutes: 30,
                        seconds: 45.123,
                    }),
                }),
            });

            mockDateTimeInstance.toFormat.mockReturnValue('2023-01-01 12:00:00');
            mockDateTimeInstance.toLocaleString.mockReturnValue('1/1/2023, 12:00:00 PM');

            mockLuxon.DateTime.fromISO.mockReturnValue(mockDateTimeInstance);
        });

        test('should successfully retrieve and format reload info', async () => {
            const mockReloadInfo = {
                id: 'reload123',
                status: 'SUCCEEDED',
                appId: 'app456',
                creationTime: '2023-01-01T10:00:00Z',
                startTime: '2023-01-01T11:00:00Z',
                endTime: '2023-01-01T12:30:45Z',
            };

            mockAxios.request.mockResolvedValue({
                data: JSON.stringify(mockReloadInfo),
            });

            const result = await getQlikSenseCloudAppReloadInfo('reload123');

            expect(result).toEqual(expect.objectContaining({
                id: 'reload123',
                status: 'SUCCEEDED',
                appId: 'app456',
                executionDuration: {
                    hours: 1,
                    minutes: 30,
                    seconds: 45,
                },
                executionCreationTime: expect.objectContaining({
                    creationTimeUTC: '2023-01-01T10:00:00Z',
                    creationTimeLocal1: '2023-01-01 12:00:00',
                }),
                executionStartTime: expect.objectContaining({
                    startTimeUTC: '2023-01-01T11:00:00Z',
                    startTimeLocal1: '2023-01-01 12:00:00',
                }),
                executionStopTime: expect.objectContaining({
                    stopTimeUTC: '2023-01-01T12:30:45Z',
                    stopTimeLocal1: '2023-01-01 12:00:00',
                }),
            }));

            expect(mockAxios.request).toHaveBeenCalledWith({
                url: '/api/v1/reloads/reload123',
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
            const mockError = new Error('API error');
            mockAxios.request.mockRejectedValue(mockError);

            const result = await getQlikSenseCloudAppReloadInfo('reload123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                '[QSCLOUD] Qlik SENSE CLOUD GET RELOAD INFO: Error: API error'
            );
        });

        test('should handle invalid JSON response', async () => {
            mockAxios.request.mockResolvedValue({
                data: 'invalid json',
            });

            const result = await getQlikSenseCloudAppReloadInfo('reload123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });

        test('should handle missing configuration', async () => {
            mockGlobals.config.get.mockReturnValue(undefined);

            const result = await getQlikSenseCloudAppReloadInfo('reload123');

            expect(result).toBe(false);
        });
    });
});