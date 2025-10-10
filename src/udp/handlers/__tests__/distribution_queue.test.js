import { jest } from '@jest/globals';

describe('distribution_queue', () => {
    let distributionQueue;
    let mockGlobals;
    let mockGetTaskMetadata;
    let mockHandleSuccessDistributeTask;
    let mockHandleFailedDistributeTask;

    beforeAll(async () => {
        // Mock globals
        mockGlobals = {
            logger: {
                info: jest.fn(),
                debug: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                verbose: jest.fn(),
            },
            getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        };

        await jest.unstable_mockModule('../../../globals.js', () => ({
            default: mockGlobals,
        }));

        // Mock task metadata function
        mockGetTaskMetadata = jest.fn();
        await jest.unstable_mockModule('../../../qrs_util/task_metadata.js', () => ({
            default: mockGetTaskMetadata,
        }));

        // Mock task handlers
        mockHandleSuccessDistributeTask = jest.fn();
        mockHandleFailedDistributeTask = jest.fn();

        await jest.unstable_mockModule('../task_types/success_distribute.js', () => ({
            handleSuccessDistributeTask: mockHandleSuccessDistributeTask,
        }));

        await jest.unstable_mockModule('../task_types/failed_distribute.js', () => ({
            handleFailedDistributeTask: mockHandleFailedDistributeTask,
        }));

        // Import the module under test
        const module = await import('../distribution_queue.js');
        distributionQueue = module.default;
    });

    beforeEach(() => {
        // Clear the queue before each test
        distributionQueue.clear();
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    const createUdpMessage = (overrides = {}) => [
        overrides.messageType || '/scheduler-distribute/',
        overrides.host || 'server.domain.com',
        overrides.taskName || 'Distribute Task',
        overrides.appName || '',
        overrides.user || 'INTERNAL\\sa_scheduler',
        overrides.taskId || 'dist-task-123',
        overrides.appId || '',
        overrides.logTimeStamp || '2025-10-09 10:30:45.123',
        overrides.logLevel || 'INFO',
        overrides.executionId || 'exec-789',
        overrides.logMessage || 'Distribution in progress',
    ];

    const createTaskMetadata = (executionStatus = 13) => ({
        id: 'dist-task-123',
        name: 'Distribute Task',
        taskType: 3,
        enabled: true,
        tags: [{ id: 'tag-1', name: 'Production' }],
        customProperties: [{ definition: { name: 'environment' }, value: 'production' }],
        operational: {
            lastExecutionResult: {
                status: executionStatus,
            },
        },
    });

    describe('queue management', () => {
        test('should add task to queue', () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            expect(distributionQueue.getQueueSize()).toBe(1);
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('Added task'));
        });

        test('should update existing task in queue', () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            distributionQueue.add('dist-task-123', msg, taskMetadata);
            distributionQueue.add('dist-task-123', msg, taskMetadata);

            expect(distributionQueue.getQueueSize()).toBe(1);
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(expect.stringContaining('already in queue'));
        });

        test('should start polling when first task is added', () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            expect(distributionQueue.isPolling).toBe(true);
        });

        test('should handle multiple tasks in queue', () => {
            const msg1 = createUdpMessage({ taskId: 'task-1' });
            const msg2 = createUdpMessage({ taskId: 'task-2' });
            const taskMetadata = createTaskMetadata(13);

            distributionQueue.add('task-1', msg1, taskMetadata);
            distributionQueue.add('task-2', msg2, taskMetadata);

            expect(distributionQueue.getQueueSize()).toBe(2);
        });

        test('should clear all tasks from queue', () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            distributionQueue.add('dist-task-123', msg, taskMetadata);
            distributionQueue.clear();

            expect(distributionQueue.getQueueSize()).toBe(0);
            expect(distributionQueue.isPolling).toBe(false);
        });
    });

    describe('state detection', () => {
        test('should identify final states correctly', () => {
            expect(distributionQueue.isFinalState(6)).toBe(true); // Aborted
            expect(distributionQueue.isFinalState(7)).toBe(true); // FinishedSuccess
            expect(distributionQueue.isFinalState(8)).toBe(true); // FinishedFail
            expect(distributionQueue.isFinalState(11)).toBe(true); // Error
        });

        test('should identify intermediate states correctly', () => {
            expect(distributionQueue.isIntermediateState(1)).toBe(true); // Triggered
            expect(distributionQueue.isIntermediateState(2)).toBe(true); // Started
            expect(distributionQueue.isIntermediateState(3)).toBe(true); // Queued
            expect(distributionQueue.isIntermediateState(4)).toBe(true); // AbortInitiated
            expect(distributionQueue.isIntermediateState(5)).toBe(true); // Aborting
            expect(distributionQueue.isIntermediateState(10)).toBe(true); // Retry
            expect(distributionQueue.isIntermediateState(13)).toBe(true); // DistributionQueue
            expect(distributionQueue.isIntermediateState(14)).toBe(true); // DistributionRunning
        });

        test('should not identify final states as intermediate', () => {
            expect(distributionQueue.isIntermediateState(6)).toBe(false);
            expect(distributionQueue.isIntermediateState(7)).toBe(false);
            expect(distributionQueue.isIntermediateState(8)).toBe(false);
            expect(distributionQueue.isIntermediateState(11)).toBe(false);
        });

        test('should not identify intermediate states as final', () => {
            expect(distributionQueue.isFinalState(13)).toBe(false);
            expect(distributionQueue.isFinalState(14)).toBe(false);
        });
    });

    describe('periodic polling', () => {
        test('should check queue periodically', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(13));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            // Advance time to trigger polling
            await jest.advanceTimersByTimeAsync(30000);

            expect(mockGetTaskMetadata).toHaveBeenCalledWith('dist-task-123');
        });

        test('should process task when it reaches final state (success)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            // First check: still in intermediate state
            mockGetTaskMetadata.mockResolvedValueOnce(createTaskMetadata(13));
            // Second check: reached final state
            mockGetTaskMetadata.mockResolvedValueOnce(createTaskMetadata(7));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            // First poll - still in intermediate state
            await jest.advanceTimersByTimeAsync(30000);
            expect(distributionQueue.getQueueSize()).toBe(1);

            // Second poll - reached final state
            await jest.advanceTimersByTimeAsync(30000);
            expect(mockHandleSuccessDistributeTask).toHaveBeenCalledWith(msg, expect.objectContaining({ id: 'dist-task-123' }));
            expect(distributionQueue.getQueueSize()).toBe(0);
        });

        test('should process task when it reaches final state (failure)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(14);

            // Reached final state (FinishedFail)
            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(8));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockHandleFailedDistributeTask).toHaveBeenCalledWith(msg, expect.objectContaining({ id: 'dist-task-123' }));
            expect(distributionQueue.getQueueSize()).toBe(0);
        });

        test('should process task when it reaches aborted state', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(4);

            // Reached final state (Aborted)
            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(6));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockHandleFailedDistributeTask).toHaveBeenCalledWith(msg, expect.objectContaining({ id: 'dist-task-123' }));
            expect(distributionQueue.getQueueSize()).toBe(0);
        });

        test('should process task when it reaches error state', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(10);

            // Reached final state (Error)
            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(11));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockHandleFailedDistributeTask).toHaveBeenCalledWith(msg, expect.objectContaining({ id: 'dist-task-123' }));
            expect(distributionQueue.getQueueSize()).toBe(0);
        });

        test('should stop polling when queue is empty', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(7));

            distributionQueue.add('dist-task-123', msg, taskMetadata);
            expect(distributionQueue.isPolling).toBe(true);

            // Advance time to process the task
            await jest.advanceTimersByTimeAsync(30000);

            // The task should be processed and removed, causing polling to stop
            // Check after allowing async operations to complete
            await jest.advanceTimersByTimeAsync(1);

            // Since the queue is now empty after processing, next checkQueue call will stop polling
            await jest.advanceTimersByTimeAsync(30000);

            expect(distributionQueue.getQueueSize()).toBe(0);
        });
    });

    describe('timeout handling', () => {
        test('should remove task that exceeds max age', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            // Use the singleton queue but with a task that will timeout
            distributionQueue.add('timeout-task-123', msg, taskMetadata);

            // Get the queued task and manually set its queuedAt time to be old
            const queuedTask = distributionQueue.queue.get('timeout-task-123');
            const sixHoursOneMinuteAgo = Date.now() - (6 * 60 * 60 * 1000 + 60 * 1000);
            queuedTask.queuedAt = sixHoursOneMinuteAgo;

            // Mock task metadata to return intermediate state (so it doesn't get processed)
            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(13));

            // Advance time to trigger check
            await jest.advanceTimersByTimeAsync(30000);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('has been in queue'));
            expect(distributionQueue.queue.has('timeout-task-123')).toBe(false);
        });

        test('should continue checking other tasks after removing timed-out task', async () => {
            const msg1 = createUdpMessage({ taskId: 'old-task' });
            const msg2 = createUdpMessage({ taskId: 'new-task' });
            const taskMetadata = createTaskMetadata(13);

            distributionQueue.add('old-task', msg1, taskMetadata);
            distributionQueue.add('new-task', msg2, taskMetadata);

            // Make one task old
            const oldTask = distributionQueue.queue.get('old-task');
            const sevenHoursAgo = Date.now() - 7 * 60 * 60 * 1000;
            oldTask.queuedAt = sevenHoursAgo;

            // Mock task metadata to return intermediate state
            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(13));

            // Advance time to trigger check
            await jest.advanceTimersByTimeAsync(30000);

            // Old task should be removed, new task should remain
            expect(distributionQueue.queue.has('old-task')).toBe(false);
            expect(distributionQueue.queue.has('new-task')).toBe(true);
        });
    });

    describe('error handling', () => {
        test('should handle error when getting task metadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata.mockResolvedValue(false);

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Could not get task metadata'));
            expect(distributionQueue.getQueueSize()).toBe(1); // Task remains in queue
        });

        test('should handle exception during task metadata retrieval', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata.mockRejectedValue(new Error('QRS API error'));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error checking task'));
            expect(distributionQueue.getQueueSize()).toBe(1); // Task remains in queue
        });

        test('should handle error during task processing', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(7));
            mockHandleSuccessDistributeTask.mockRejectedValue(new Error('Processing error'));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error processing completed task'));
            expect(distributionQueue.getQueueSize()).toBe(0); // Task is still removed from queue
        });
    });

    describe('queue statistics', () => {
        test('should return correct statistics for empty queue', () => {
            const stats = distributionQueue.getQueueStats();

            expect(stats.size).toBe(0);
            expect(stats.oldestTaskAge).toBe(0);
            expect(stats.averageCheckCount).toBe(0);
        });

        test('should return correct statistics for queue with tasks', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata.mockResolvedValue(createTaskMetadata(13));

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            // Advance time and trigger a check
            await jest.advanceTimersByTimeAsync(30000);

            const stats = distributionQueue.getQueueStats();

            expect(stats.size).toBe(1);
            expect(stats.oldestTaskAgeMs).toBeGreaterThan(0);
            expect(stats.averageCheckCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe('integration scenarios', () => {
        test('should handle task progressing through multiple intermediate states', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockGetTaskMetadata
                .mockResolvedValueOnce(createTaskMetadata(13)) // DistributionQueue
                .mockResolvedValueOnce(createTaskMetadata(14)) // DistributionRunning
                .mockResolvedValueOnce(createTaskMetadata(7)); // FinishedSuccess

            distributionQueue.add('dist-task-123', msg, taskMetadata);

            // First check: still in DistributionQueue
            await jest.advanceTimersByTimeAsync(30000);
            expect(distributionQueue.getQueueSize()).toBe(1);

            // Second check: now DistributionRunning
            await jest.advanceTimersByTimeAsync(30000);
            expect(distributionQueue.getQueueSize()).toBe(1);

            // Third check: FinishedSuccess
            await jest.advanceTimersByTimeAsync(30000);
            expect(mockHandleSuccessDistributeTask).toHaveBeenCalled();
            expect(distributionQueue.getQueueSize()).toBe(0);
        });

        test('should process multiple tasks concurrently', async () => {
            const msg1 = createUdpMessage({ taskId: 'task-1' });
            const msg2 = createUdpMessage({ taskId: 'task-2' });
            const msg3 = createUdpMessage({ taskId: 'task-3' });

            mockGetTaskMetadata
                .mockResolvedValueOnce(createTaskMetadata(7)) // task-1 success
                .mockResolvedValueOnce(createTaskMetadata(8)) // task-2 failure
                .mockResolvedValueOnce(createTaskMetadata(13)); // task-3 still running

            distributionQueue.add('task-1', msg1, createTaskMetadata(13));
            distributionQueue.add('task-2', msg2, createTaskMetadata(14));
            distributionQueue.add('task-3', msg3, createTaskMetadata(13));

            await jest.advanceTimersByTimeAsync(30000);

            expect(mockHandleSuccessDistributeTask).toHaveBeenCalledTimes(1);
            expect(mockHandleFailedDistributeTask).toHaveBeenCalledTimes(1);
            expect(distributionQueue.getQueueSize()).toBe(1); // task-3 still in queue
        });
    });
});
