import { jest } from '@jest/globals';

describe('udp/handlers/distribution_ended', () => {
    let distributionEnded;
    let mockDoesTaskExist;
    let mockGetTaskMetadata;
    let mockHandleSuccessDistributeTask;
    let mockHandleFailedDistributeTask;
    let mockHandleAbortedDistributeTask;
    let mockDistributionQueue;
    let mockLogger;

    const createMockMsg = (taskId = '123e4567-e89b-12d3-a456-426614174000') => [
        '/scheduler-distribute/',
        'sense-host',
        'Test Distribute Task',
        '',
        'DOMAIN\\user',
        taskId,
        '',
        '2024-01-15T10:30:00.000Z',
        'INFO',
        'execId-123',
        'Task completed successfully',
    ];

    beforeAll(async () => {
        mockDoesTaskExist = jest.fn().mockResolvedValue({ exists: true });
        mockGetTaskMetadata = jest.fn().mockResolvedValue({
            taskType: 3,
            operational: { lastExecutionResult: { status: 7 } },
        });
        mockHandleSuccessDistributeTask = jest.fn().mockResolvedValue();
        mockHandleFailedDistributeTask = jest.fn().mockResolvedValue();
        mockHandleAbortedDistributeTask = jest.fn().mockResolvedValue();

        mockDistributionQueue = {
            isIntermediateState: jest.fn(() => false),
            add: jest.fn(),
        };

        mockLogger = {
            debug: jest.fn(),
            verbose: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const mockGlobals = {
            logger: mockLogger,
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../../../qrs_util/task_metadata.js', () => ({
            default: mockGetTaskMetadata,
        }));
        await jest.unstable_mockModule('../../../qrs_util/does_task_exist.js', () => ({
            default: mockDoesTaskExist,
        }));
        await jest.unstable_mockModule('../distribution_queue.js', () => ({
            default: mockDistributionQueue,
        }));
        await jest.unstable_mockModule('../task_types/success_distribute.js', () => ({
            handleSuccessDistributeTask: mockHandleSuccessDistributeTask,
        }));
        await jest.unstable_mockModule('../task_types/failed_distribute.js', () => ({
            handleFailedDistributeTask: mockHandleFailedDistributeTask,
        }));
        await jest.unstable_mockModule('../task_types/aborted_distribute.js', () => ({
            handleAbortedDistributeTask: mockHandleAbortedDistributeTask,
        }));

        const module = await import('../distribution_ended.js');
        distributionEnded = module.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns false when task does not exist', async () => {
        mockDoesTaskExist.mockResolvedValueOnce({ exists: false });

        const result = await distributionEnded(createMockMsg());

        expect(result).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('does not exist in Sense')
        );
    });

    test('returns false when task metadata cannot be retrieved', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce(false);

        const result = await distributionEnded(createMockMsg());

        expect(result).toBeUndefined();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Could not get task metadata')
        );
    });

    test('returns false when task is not a distribute task (type 3)', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({ taskType: 0 });

        const result = await distributionEnded(createMockMsg());

        expect(result).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('is not a distribute task')
        );
    });

    test('calls success handler for status 7 (FinishedSuccess)', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({
            taskType: 3,
            operational: { lastExecutionResult: { status: 7 } },
        });

        await distributionEnded(createMockMsg());

        expect(mockHandleSuccessDistributeTask).toHaveBeenCalled();
        expect(mockHandleFailedDistributeTask).not.toHaveBeenCalled();
    });

    test('calls failed handler for status 6 (Aborted)', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({
            taskType: 3,
            operational: { lastExecutionResult: { status: 6 } },
        });

        await distributionEnded(createMockMsg());

        expect(mockHandleFailedDistributeTask).toHaveBeenCalled();
        expect(mockHandleSuccessDistributeTask).not.toHaveBeenCalled();
    });

    test('calls failed handler for status 8 (FinishedFail)', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({
            taskType: 3,
            operational: { lastExecutionResult: { status: 8 } },
        });

        await distributionEnded(createMockMsg());

        expect(mockHandleFailedDistributeTask).toHaveBeenCalled();
    });

    test('calls failed handler for status 11 (Error)', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({
            taskType: 3,
            operational: { lastExecutionResult: { status: 11 } },
        });

        await distributionEnded(createMockMsg());

        expect(mockHandleFailedDistributeTask).toHaveBeenCalled();
    });

    test('adds to queue for intermediate status (status 2 = Queued)', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({
            taskType: 3,
            operational: { lastExecutionResult: { status: 2 } },
        });
        mockDistributionQueue.isIntermediateState.mockReturnValueOnce(true);

        await distributionEnded(createMockMsg());

        expect(mockDistributionQueue.add).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith(
            expect.stringContaining('intermediate state')
        );
    });

    test('logs unknown status', async () => {
        mockGetTaskMetadata.mockResolvedValueOnce({
            taskType: 3,
            operational: { lastExecutionResult: { status: 99 } },
        });

        await distributionEnded(createMockMsg());

        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Unexpected execution status')
        );
    });

    test('handles errors gracefully', async () => {
        mockDoesTaskExist.mockRejectedValueOnce(new Error('Connection failed'));

        await distributionEnded(createMockMsg());

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error.mock.calls[0][0]).toContain('Error processing distribution completion event');
    });
});
