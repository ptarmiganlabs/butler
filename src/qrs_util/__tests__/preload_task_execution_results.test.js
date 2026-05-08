import { jest } from '@jest/globals';

describe('qrs_util/preload_task_execution_results', () => {
    let getPreloadTaskExecutionResults;
    let mockQrsGet;
    let mockLogger;

    const mockTaskId = '223e4567-e89b-12d3-a456-426614174001';

    const createMockQrsResponse = (status = 7, duration = 90000) => ({
        body: {
            name: 'Test Preload Task',
            operational: {
                lastExecutionResult: {
                    id: 'result-456',
                    status,
                    executingNodeName: 'node2',
                    duration,
                    startTime: '2024-01-15T14:00:00.000Z',
                    stopTime: '2024-01-15T14:01:30.000Z',
                    details: [
                        {
                            detailCreatedDate: '2024-01-15T14:00:10.000Z',
                            message: 'Preload started',
                            detailsType: 0,
                        },
                        {
                            detailCreatedDate: '2024-01-15T14:01:00.000Z',
                            message: 'Preload completed',
                            detailsType: 0,
                        },
                    ],
                },
            },
        },
    });

    beforeAll(async () => {
        mockQrsGet = jest.fn();

        const mockQrsClient = jest.fn(() => ({
            Get: mockQrsGet,
        }));

        mockLogger = {
            debug: jest.fn(),
            verbose: jest.fn(),
            error: jest.fn(),
        };

        const mockGlobals = {
            config: {
                get: jest.fn((key) => {
                    if (key === 'Butler.configQRS.host') return 'sense-server';
                    if (key === 'Butler.configQRS.port') return 4242;
                    return null;
                }),
            },
            configQRS: {
                certPaths: {
                    certPath: '/path/to/cert.pem',
                    keyPath: '/path/to/key.pem',
                },
            },
            logger: mockLogger,
            getQRSHttpHeaders: jest.fn(() => ({ 'Content-Type': 'application/json' })),
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({
            default: mockQrsClient,
        }));

        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));

        await jest.unstable_mockModule('../task_execution_details_sort.js', () => ({
            compareTaskDetails: jest.fn((a, b) => new Date(a.detailCreatedDate) - new Date(b.detailCreatedDate)),
        }));

        const module = await import('../preload_task_execution_results.js');
        getPreloadTaskExecutionResults = module.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockQrsGet.mockReset();
    });

    test('returns preload task execution details for successful execution', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 90000));

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionResultId).toBe('result-456');
        expect(result.taskName).toBe('Test Preload Task');
        expect(result.executingNodeName).toBe('node2');
        expect(result.executionStatusNum).toBe(7);
        expect(result.executionStatusText).toBe('FinishedSuccess');
        expect(result.executionStartTime).toBeTruthy();
        expect(result.executionStopTime).toBeTruthy();
        expect(mockQrsGet).toHaveBeenCalledWith(`reloadtask/${mockTaskId}`);
    });

    test('handles multiple timestamp formats in start time', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 90000));

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result.executionStartTime.startTimeUTC).toBeTruthy();
        expect(result.executionStartTime.startTimeLocal1).toBeTruthy();
        expect(result.executionStartTime.startTimeLocal2).toBeTruthy();
        expect(result.executionStartTime.startTimeLocal3).toBeTruthy();
    });

    test('handles SQL Server minimum datetime for start time (1753)', async () => {
        const mockResponse = createMockQrsResponse(7, 90000);
        mockResponse.body.operational.lastExecutionResult.startTime = '1753-01-01T00:00:00.000Z';
        mockQrsGet.mockResolvedValue(mockResponse);

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result.executionStartTime.startTimeUTC).toBe('-');
        expect(result.executionStartTime.startTimeLocal1).toBe('-');
    });

    test('handles SQL Server minimum datetime for stop time (1753)', async () => {
        const mockResponse = createMockQrsResponse(7, 90000);
        mockResponse.body.operational.lastExecutionResult.stopTime = '1753-01-01T00:00:00.000Z';
        mockQrsGet.mockResolvedValue(mockResponse);

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result.executionStopTime.stopTimeUTC).toBe('-');
        expect(result.executionStopTime.stopTimeLocal1).toBe('-');
    });

    test('processes execution details with multiple timestamp formats', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 90000));

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result.executionDetailsSorted).toHaveLength(2);
        expect(result.executionDetailsSorted[0].timestampUTC).toBeTruthy();
        expect(result.executionDetailsSorted[0].timestampLocal1).toBeTruthy();
        expect(result.executionDetailsSorted[0].message).toBe('Preload started');
    });

    test('handles failed preload task execution', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(8, 45000));

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionStatusNum).toBe(8);
        expect(result.executionStatusText).toBe('FinishedFail');
    });

    test('returns false when QRS API call fails', async () => {
        mockQrsGet.mockRejectedValue(new Error('QRS connection failed'));

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalled();
    });

    test('handles aborted task status', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(6, 15000));

        const result = await getPreloadTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionStatusNum).toBe(6);
        expect(result.executionStatusText).toBe('Aborted');
    });
});
