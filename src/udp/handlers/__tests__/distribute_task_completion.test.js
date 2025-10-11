import { jest } from '@jest/globals';

describe('distribute_task_completion', () => {
    let distributeTaskCompletion;
    let mockGlobals;
    let mockGetTaskMetadata;
    let mockDoesTaskExist;
    let mockDistributionQueue;
    let mockHandleSuccessDistributeTask;
    let mockHandleFailedDistributeTask;
    let mockHandleAbortedDistributeTask;

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

        // Mock task existence check
        mockDoesTaskExist = jest.fn();
        await jest.unstable_mockModule('../../../qrs_util/does_task_exist.js', () => ({
            default: mockDoesTaskExist,
        }));

        // Mock distribution queue
        mockDistributionQueue = {
            add: jest.fn(),
            isIntermediateState: jest.fn((status) => {
                return (
                    status === 1 ||
                    status === 2 ||
                    status === 3 ||
                    status === 4 ||
                    status === 5 ||
                    status === 10 ||
                    status === 13 ||
                    status === 14
                );
            }),
        };
        await jest.unstable_mockModule('../distribution_queue.js', () => ({
            default: mockDistributionQueue,
        }));

        // Mock task handlers
        mockHandleSuccessDistributeTask = jest.fn();
        mockHandleFailedDistributeTask = jest.fn();
        mockHandleAbortedDistributeTask = jest.fn();

        await jest.unstable_mockModule('../task_types/success_distribute.js', () => ({
            handleSuccessDistributeTask: mockHandleSuccessDistributeTask,
        }));

        await jest.unstable_mockModule('../task_types/failed_distribute.js', () => ({
            handleFailedDistributeTask: mockHandleFailedDistributeTask,
        }));

        await jest.unstable_mockModule('../task_types/aborted_distribute.js', () => ({
            handleAbortedDistributeTask: mockHandleAbortedDistributeTask,
        }));

        // Import the module under test
        const module = await import('../distribute_task_completion.js');
        distributeTaskCompletion = module.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
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
        overrides.logMessage || 'Distribution completed',
    ];

    const createTaskMetadata = (executionStatus = 7) => ({
        id: 'dist-task-123',
        name: 'Distribute Task',
        taskType: 3, // Distribute task
        enabled: true,
        tags: [{ id: 'tag-1', name: 'Production' }],
        customProperties: [{ definition: { name: 'environment' }, value: 'production' }],
        operational: {
            lastExecutionResult: {
                status: executionStatus,
            },
        },
    });

    describe('task validation', () => {
        test('should return false if task does not exist', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: false });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('does not exist in Sense'));
        });

        test('should return early if task metadata cannot be retrieved', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(false);

            const result = await distributeTaskCompletion(msg);

            expect(result).toBeUndefined();
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not get task metadata'));
        });

        test('should return false if task is not a distribute task', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue({
                ...createTaskMetadata(),
                taskType: 0, // Reload task
            });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('is not a distribute task'));
        });
    });

    describe('final state handling', () => {
        test('should handle successful distribution (status 7)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(7);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockHandleSuccessDistributeTask).toHaveBeenCalledWith(msg, taskMetadata);
            expect(mockDistributionQueue.add).not.toHaveBeenCalled();
        });

        test('should handle failed distribution (status 8)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(8);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockHandleFailedDistributeTask).toHaveBeenCalledWith(msg, taskMetadata);
            expect(mockDistributionQueue.add).not.toHaveBeenCalled();
        });

        test('should handle aborted distribution (status 6)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(6);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockHandleFailedDistributeTask).toHaveBeenCalledWith(msg, taskMetadata);
            expect(mockDistributionQueue.add).not.toHaveBeenCalled();
        });

        test('should handle error distribution (status 11)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(11);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockHandleFailedDistributeTask).toHaveBeenCalledWith(msg, taskMetadata);
            expect(mockDistributionQueue.add).not.toHaveBeenCalled();
        });
    });

    describe('intermediate state handling', () => {
        test('should queue task in DistributionQueue state (status 13)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(13);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
            expect(mockHandleSuccessDistributeTask).not.toHaveBeenCalled();
            expect(mockHandleFailedDistributeTask).not.toHaveBeenCalled();
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('intermediate state 13'));
        });

        test('should queue task in DistributionRunning state (status 14)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(14);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('intermediate state 14'));
        });

        test('should queue task in Triggered state (status 1)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(1);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
        });

        test('should queue task in Started state (status 2)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(2);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
        });

        test('should queue task in Queued state (status 3)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(3);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
        });

        test('should queue task in AbortInitiated state (status 4)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(4);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
        });

        test('should queue task in Aborting state (status 5)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(5);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
        });

        test('should queue task in Retry state (status 10)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(10);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockDistributionQueue.add).toHaveBeenCalledWith('dist-task-123', msg, taskMetadata);
        });
    });

    describe('unexpected state handling', () => {
        test('should log warning for unexpected status', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(99); // Unknown status

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unexpected execution status 99'));
            expect(mockDistributionQueue.add).not.toHaveBeenCalled();
        });

        test('should handle NeverStarted status (status 0)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(0);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unexpected execution status 0'));
        });

        test('should handle Skipped status (status 9)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(9);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unexpected execution status 9'));
        });

        test('should handle Reset status (status 12)', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata(12);

            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue(taskMetadata);

            await distributeTaskCompletion(msg);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unexpected execution status 12'));
        });
    });

    describe('error handling', () => {
        test('should handle errors gracefully', async () => {
            const msg = createUdpMessage();

            mockDoesTaskExist.mockRejectedValue(new Error('QRS API error'));

            await distributeTaskCompletion(msg);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error processing distribution completion event'),
            );
        });

        test('should log stack trace on error', async () => {
            const msg = createUdpMessage();
            const error = new Error('Test error');

            mockDoesTaskExist.mockRejectedValue(error);

            await distributeTaskCompletion(msg);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Stack trace'));
        });
    });

    describe('task type validation', () => {
        test('should reject reload task (type 0)', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue({
                ...createTaskMetadata(),
                taskType: 0,
            });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('typeStr=reload'));
        });

        test('should reject external program task (type 1)', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue({
                ...createTaskMetadata(),
                taskType: 1,
            });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('typeStr=externalprogram'));
        });

        test('should reject user sync task (type 2)', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue({
                ...createTaskMetadata(),
                taskType: 2,
            });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('typeStr=usersync'));
        });

        test('should reject preload task (type 4)', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue({
                ...createTaskMetadata(),
                taskType: 4,
            });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('typeStr=preload'));
        });

        test('should reject unknown task type', async () => {
            const msg = createUdpMessage();
            mockDoesTaskExist.mockResolvedValue({ exists: true });
            mockGetTaskMetadata.mockResolvedValue({
                ...createTaskMetadata(),
                taskType: 99,
            });

            const result = await distributeTaskCompletion(msg);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('typeStr=unknown'));
        });
    });
});
