import { jest } from '@jest/globals';

describe('qrs_util/distribute_task_execution_results', () => {
    let getDistributeTaskExecutionResults;
    let mockQrsGet;
    let mockLogger;

    const mockTaskStatusLookup = {
        0: 'NeverStarted',
        1: 'Triggered',
        2: 'Started',
        3: 'Queued',
        4: 'AbortInitiated',
        5: 'Aborting',
        6: 'Aborted',
        7: 'FinishedSuccess',
        8: 'FinishedFail',
        9: 'Skipped',
        10: 'Retry',
        11: 'Error',
        12: 'Reset',
    };

    const mockTaskId = '123e4567-e89b-12d3-a456-426614174000';

    const createMockQrsResponse = (status = 7, duration = 60000) => ({
        body: {
            name: 'Test Distribute Task',
            operational: {
                lastExecutionResult: {
                    id: 'result-123',
                    status,
                    executingNodeName: 'node1',
                    duration,
                    startTime: '2024-01-15T10:30:00.000Z',
                    stopTime: '2024-01-15T10:31:00.000Z',
                    details: [
                        {
                            detailCreatedDate: '2024-01-15T10:30:10.000Z',
                            message: 'Step 1 completed',
                            detailsType: 0,
                        },
                        {
                            detailCreatedDate: '2024-01-15T10:30:20.000Z',
                            message: 'Step 2 completed',
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
            silly: jest.fn(),
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
        };

        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({
            default: mockQrsClient,
        }));

        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));

        await jest.unstable_mockModule('../task_execution_details_sort.js', () => ({
            compareTaskDetails: jest.fn((a, b) => new Date(a.detailCreatedDate) - new Date(b.detailCreatedDate)),
        }));

        const module = await import('../distribute_task_execution_results.js');
        getDistributeTaskExecutionResults = module.getDistributeTaskExecutionResults;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockQrsGet.mockReset();

        const originalMockResolvedValue = mockQrsGet.mockResolvedValue.bind(mockQrsGet);
        const originalMockResolvedValueOnce = mockQrsGet.mockResolvedValueOnce.bind(mockQrsGet);

        mockQrsGet.mockResolvedValue = (value) => originalMockResolvedValue({ statusCode: 200, ...value });
        mockQrsGet.mockResolvedValueOnce = (value) => originalMockResolvedValueOnce({ statusCode: 200, ...value });
    });

    test('returns task execution details for successful execution', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 60000));

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionResultId).toBe('result-123');
        expect(result.taskName).toBe('Test Distribute Task');
        expect(result.executingNodeName).toBe('node1');
        expect(result.executionStatusNum).toBe(7);
        expect(result.executionStatusText).toBe('FinishedSuccess');
        expect(result.executionDuration).toBeTruthy();
        expect(result.executionDetailsSorted).toHaveLength(2);
        expect(mockQrsGet).toHaveBeenCalledWith(`reloadtask/${mockTaskId}`);
    });

    test('returns task execution details for failed execution', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(8, 45000));

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionStatusNum).toBe(8);
        expect(result.executionStatusText).toBe('FinishedFail');
    });

    test('returns task execution details for aborted execution', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(6, 30000));

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionStatusNum).toBe(6);
        expect(result.executionStatusText).toBe('Aborted');
    });

    test('concatenates execution details correctly', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 60000));

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result.executionDetailsConcatenated).toContain('Step 1 completed');
        expect(result.executionDetailsConcatenated).toContain('Step 2 completed');
    });

    test('returns false when QRS API call fails', async () => {
        mockQrsGet.mockRejectedValue(new Error('QRS connection failed'));

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalled();
    });

    test('returns false on unexpected HTTP status response', async () => {
        mockQrsGet.mockResolvedValue({ statusCode: 500, body: { message: 'Internal Server Error' } });

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('status: 500'));
    });

    test('handles invalid task status gracefully', async () => {
        const mockResponse = createMockQrsResponse(99, 60000);
        mockResponse.body.operational.lastExecutionResult.status = 99;
        mockQrsGet.mockResolvedValue(mockResponse);

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionStatusText).toBeUndefined();
    });

    test('calculates execution duration correctly', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 125000));

        const result = await getDistributeTaskExecutionResults(mockTaskId);

        expect(result.executionDuration).toBeTruthy();
        expect(result.executionDuration.seconds).toBeTruthy();
    });
});
