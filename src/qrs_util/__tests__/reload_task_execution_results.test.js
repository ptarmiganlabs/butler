import { jest } from '@jest/globals';

describe('qrs_util/reload_task_execution_results', () => {
    let getReloadTaskExecutionResults;
    let mockQrsGet;
    let mockLogger;

    const mockTaskId = '123e4567-e89b-12d3-a456-426614174111';

    const createMockQrsResponse = (status = 7, duration = 60000) => ({
        statusCode: 200,
        body: {
            name: 'Test Reload Task',
            operational: {
                lastExecutionResult: {
                    fileReferenceID: 'file-ref-123',
                    id: 'result-123',
                    status,
                    executingNodeName: 'node1',
                    duration,
                    scriptLogSize: 42,
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
            isSea: false,
        };

        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({
            default: mockQrsClient,
        }));

        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));

        await jest.unstable_mockModule('../task_execution_details_sort.js', () => ({
            compareTaskDetails: jest.fn((a, b) => new Date(a.detailCreatedDate) - new Date(b.detailCreatedDate)),
        }));

        const module = await import('../reload_task_execution_results.js');
        getReloadTaskExecutionResults = module.getReloadTaskExecutionResults;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockQrsGet.mockReset();
    });

    test('returns reload task execution details for successful execution', async () => {
        mockQrsGet.mockResolvedValue(createMockQrsResponse(7, 60000));

        const result = await getReloadTaskExecutionResults(mockTaskId);

        expect(result).toBeTruthy();
        expect(result.executionResultId).toBe('result-123');
        expect(result.fileReferenceId).toBe('file-ref-123');
        expect(result.taskName).toBe('Test Reload Task');
        expect(result.executingNodeName).toBe('node1');
        expect(result.executionStatusNum).toBe(7);
        expect(result.executionStatusText).toBe('FinishedSuccess');
        expect(result.scriptLogSize).toBe(42);
        expect(mockQrsGet).toHaveBeenCalledWith(`reloadtask/${mockTaskId}`);
    });

    test('returns false when QRS API call throws', async () => {
        mockQrsGet.mockRejectedValue(new Error('QRS API error'));

        const result = await getReloadTaskExecutionResults(mockTaskId);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('message: QRS API error'));
    });

    test('returns false on unexpected HTTP status response', async () => {
        mockQrsGet.mockResolvedValue({ statusCode: 500, body: { message: 'Internal Server Error' } });

        const result = await getReloadTaskExecutionResults(mockTaskId);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('status: 500'));
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('body.message: Internal Server Error'));
    });
});