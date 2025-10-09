import { jest } from '@jest/globals';

describe('success_usersync', () => {
    let handleSuccessUserSyncTask;
    let mockGlobals;
    let mockGetUserSyncTaskExecutionResults;
    let mockGetTaskTags;
    let mockPostUserSyncTaskSuccessNotificationInfluxDb;

    // Mock getUserSyncTaskExecutionResults
    mockGetUserSyncTaskExecutionResults = jest.fn();
    jest.unstable_mockModule('../../../../qrs_util/usersync_task_execution_results.js', () => ({
        default: mockGetUserSyncTaskExecutionResults,
    }));

    // Mock getTaskTags
    mockGetTaskTags = jest.fn();
    jest.unstable_mockModule('../../../../qrs_util/task_tag_util.js', () => ({
        default: mockGetTaskTags,
    }));

    // Mock postUserSyncTaskSuccessNotificationInfluxDb
    mockPostUserSyncTaskSuccessNotificationInfluxDb = jest.fn();
    jest.unstable_mockModule('../../../../lib/post_to_influxdb.js', () => ({
        postUserSyncTaskSuccessNotificationInfluxDb: mockPostUserSyncTaskSuccessNotificationInfluxDb,
    }));

    // Mock globals
    mockGlobals = {
        config: {
            has: jest.fn(() => true),
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.userSyncTaskSuccess.enable': true,
                };
                return configMap[key] !== undefined ? configMap[key] : false;
            }),
        },
        logger: {
            verbose: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        sleep: jest.fn(() => Promise.resolve()),
    };
    jest.unstable_mockModule('../../../../globals.js', () => ({ default: mockGlobals }));

    beforeAll(async () => {
        // Import the module under test
        const module = await import('../success_usersync.js');
        handleSuccessUserSyncTask = module.handleSuccessUserSyncTask;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper to create a valid UDP message array
    const createUdpMessage = (overrides = {}) => {
        return [
            '/scheduler-task-success/', // msg[0]: Message type
            'server.domain.com', // msg[1]: Host name
            'User Sync Task', // msg[2]: Task name
            '', // msg[3]: App name (not used for user sync)
            'INTERNAL\\sa_scheduler', // msg[4]: User
            'user-sync-task-123', // msg[5]: Task ID
            '', // msg[6]: App ID (not used for user sync)
            '2025-10-08T10:30:00.000Z', // msg[7]: Log timestamp
            'INFO', // msg[8]: Log level
            'exec-id-456', // msg[9]: Execution ID
            'Task finished successfully', // msg[10]: Log message
            ...Object.values(overrides),
        ];
    };

    // Helper to create task metadata
    const createTaskMetadata = (overrides = {}) => {
        return {
            taskType: 2, // UserSync task type
            tags: [
                { id: 'tag-1', name: 'Production' },
                { id: 'tag-2', name: 'UserSync' },
            ],
            customProperties: [
                { definition: { name: 'team' }, value: 'IT-Ops' },
                { definition: { name: 'priority' }, value: 'high' },
            ],
            ...overrides,
        };
    };

    // Helper to create task execution results
    const createTaskExecutionResults = (overrides = {}) => {
        return {
            executionResultId: 'exec-result-789',
            taskName: 'User Sync Task',
            executingNodeName: 'Node1',
            executionDetailsSorted: [
                { detailCreatedDate: '2025-10-08T10:29:00Z', message: 'Task started' },
                { detailCreatedDate: '2025-10-08T10:30:00Z', message: 'Changing task state from Started to FinishedSuccess' },
            ],
            executionDetailsConcatenated: 'Task started\nChanging task state from Started to FinishedSuccess\n',
            executionStatusNum: 7,
            executionStatusText: 'FinishedSuccess',
            executionDuration: { hours: 0, minutes: 1, seconds: 30 },
            executionStartTime: {
                startTimeUTC: '2025-10-08T10:29:00.000Z',
                startTimeLocal1: '2025-10-08 10:29:00',
                startTimeLocal2: '10/8/25, 10:29:00 AM',
                startTimeLocal3: 'Oct 8, 2025, 10:29:00 AM',
                startTimeLocal4: 'October 8, 2025 at 10:29:00 AM GMT',
                startTimeLocal5: 'October 8, 2025 at 10:29:00 AM GMT',
            },
            executionStopTime: {
                stopTimeUTC: '2025-10-08T10:30:30.000Z',
                stopTimeLocal1: '2025-10-08 10:30:30',
                stopTimeLocal2: '10/8/25, 10:30:30 AM',
                stopTimeLocal3: 'Oct 8, 2025, 10:30:30 AM',
                stopTimeLocal4: 'October 8, 2025 at 10:30:30 AM GMT',
                stopTimeLocal5: 'October 8, 2025 at 10:30:30 AM GMT',
            },
            ...overrides,
        };
    };

    describe('Basic functionality', () => {
        test('should successfully process user sync task when InfluxDB is disabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return false;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('User sync task User Sync Task (user-sync-task-123) completed successfully'),
            );
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Not storing task info in InfluxDB'));
            expect(mockGetUserSyncTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should successfully process user sync task and store in InfluxDB when enabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['Production', 'UserSync']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).toHaveBeenCalledWith('user-sync-task-123');
            expect(mockGetTaskTags).toHaveBeenCalledWith('user-sync-task-123');
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'server.domain.com',
                user: 'INTERNAL/sa_scheduler',
                taskName: 'User Sync Task',
                taskId: 'user-sync-task-123',
                logTimeStamp: '2025-10-08T10:30:00.000Z',
                logLevel: 'INFO',
                executionId: 'exec-id-456',
                logMessage: 'Task finished successfully',
                qs_taskTags: ['Production', 'UserSync'],
                qs_taskCustomProperties: [
                    { name: 'team', value: 'IT-Ops' },
                    { name: 'priority', value: 'high' },
                ],
                taskInfo,
                qs_taskMetadata: taskMetadata,
            });
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('User sync info for task user-sync-task-123, "User Sync Task" stored in InfluxDB'),
            );
        });

        test('should convert backslashes to forward slashes in user field', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            msg[4] = 'DOMAIN\\username'; // Use backslash format
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['Production']);

            await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'DOMAIN/username', // Should be converted to forward slash
                }),
            );
        });
    });

    describe('Retry logic for task execution results', () => {
        test('should succeed on first attempt when task info is immediately available', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).toHaveBeenCalledTimes(1);
            expect(mockGlobals.sleep).not.toHaveBeenCalled();
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Task info for user sync task user-sync-task-123 retrieved successfully after 0 attempts'),
            );
        });

        test('should retry when FinishedSuccess message not yet in execution details', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // First two calls return incomplete data
            const incompleteTaskInfo = createTaskExecutionResults({
                executionDetailsSorted: [{ detailCreatedDate: '2025-10-08T10:29:00Z', message: 'Task started' }],
            });

            // Third call returns complete data
            const completeTaskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults
                .mockResolvedValueOnce(incompleteTaskInfo)
                .mockResolvedValueOnce(incompleteTaskInfo)
                .mockResolvedValueOnce(completeTaskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).toHaveBeenCalledTimes(3);
            expect(mockGlobals.sleep).toHaveBeenCalledTimes(2);
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(
                expect.stringContaining('Unable to get task info for user sync task user-sync-task-123. Attempt 1 of 5'),
            );
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Task info for user sync task user-sync-task-123 retrieved successfully after 2 attempts'),
            );
        });

        test('should warn when task duration is 0 seconds but message is FinishedSuccess', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults({
                executionDuration: { hours: 0, minutes: 0, seconds: 0 },
            });

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(
                expect.stringContaining(
                    'duration is 0 seconds. This is likely caused by the QRS not having updated the execution details yet',
                ),
            );
        });

        test('should fail after 5 retry attempts and not store in InfluxDB', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // All calls return incomplete data
            const incompleteTaskInfo = createTaskExecutionResults({
                executionDetailsSorted: [{ detailCreatedDate: '2025-10-08T10:29:00Z', message: 'Task started' }],
            });

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(incompleteTaskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            // The function should continue even if FinishedSuccess message is not found after retries
            // It will still try to store in InfluxDB with whatever data it has
            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).toHaveBeenCalledTimes(5);
            expect(mockGlobals.sleep).toHaveBeenCalledTimes(5);
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(
                expect.stringContaining('Unable to get task info for user sync task user-sync-task-123. Attempt 5 of 5'),
            );
            // Should still attempt to store in InfluxDB
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalled();
        });
    });

    describe('Task metadata handling', () => {
        test('should handle empty tags array', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [] });
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle undefined tags', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: undefined });
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tags for task user-sync-task-123: []'));
        });

        test('should handle empty custom properties array', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: [] });
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle undefined custom properties', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: undefined });
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should correctly format custom properties', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                customProperties: [
                    { definition: { name: 'environment' }, value: 'production' },
                    { definition: { name: 'owner' }, value: 'ops-team' },
                ],
            });
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [
                        { name: 'environment', value: 'production' },
                        { name: 'owner', value: 'ops-team' },
                    ],
                }),
            );
        });
    });

    describe('Error handling', () => {
        test('should catch and log errors gracefully', async () => {
            mockGlobals.config.get.mockImplementation(() => {
                throw new Error('Config error');
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error handling successful user sync task: Config error'),
            );
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Stack trace:'));
        });

        test('should handle getTaskTags throwing error', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockRejectedValue(new Error('QRS connection failed'));

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error handling successful user sync task: QRS connection failed'),
            );
        });

        test('should handle postUserSyncTaskSuccessNotificationInfluxDb throwing error', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);
            mockPostUserSyncTaskSuccessNotificationInfluxDb.mockImplementation(() => {
                throw new Error('InfluxDB write failed');
            });

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error handling successful user sync task: InfluxDB write failed'),
            );
        });
    });

    describe('Configuration edge cases', () => {
        test('should not store in InfluxDB when Butler.influxDb.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return false;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not store in InfluxDB when Butler.influxDb.userSyncTaskSuccess.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should handle config.has returning false', async () => {
            mockGlobals.config.has.mockReturnValue(false);
            mockGlobals.config.get.mockReturnValue(undefined);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetUserSyncTaskExecutionResults).not.toHaveBeenCalled();
        });
    });

    describe('UDP message field extraction', () => {
        test('should correctly extract all fields from UDP message', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.userSyncTaskSuccess.enable') return true;
                return false;
            });
            mockGlobals.config.has.mockReturnValue(true);

            const msg = [
                '/scheduler-task-success/',
                'qlik-server.company.com',
                'Daily User Directory Sync',
                '',
                'INTERNAL\\sa_scheduler',
                'abc-123-def-456',
                '',
                '2025-10-08T14:22:33.444Z',
                'DEBUG',
                'execution-xyz-789',
                'User sync completed with 150 users synced',
            ];
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetUserSyncTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['Production', 'Critical']);

            await handleSuccessUserSyncTask(msg, taskMetadata);

            expect(mockPostUserSyncTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'qlik-server.company.com',
                user: 'INTERNAL/sa_scheduler',
                taskName: 'Daily User Directory Sync',
                taskId: 'abc-123-def-456',
                logTimeStamp: '2025-10-08T14:22:33.444Z',
                logLevel: 'DEBUG',
                executionId: 'execution-xyz-789',
                logMessage: 'User sync completed with 150 users synced',
                qs_taskTags: ['Production', 'Critical'],
                qs_taskCustomProperties: [
                    { name: 'team', value: 'IT-Ops' },
                    { name: 'priority', value: 'high' },
                ],
                taskInfo,
                qs_taskMetadata: taskMetadata,
            });
        });
    });
});
