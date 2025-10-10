import { jest } from '@jest/globals';

describe('success_distribute', () => {
    let handleSuccessDistributeTask;
    let mockGlobals;
    let mockGetDistributeTaskExecutionResults;
    let mockGetTaskTags;
    let mockPostDistributeTaskSuccessNotificationInfluxDb;
    let mockSendDistributeTaskSuccessNotificationEmail;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mock QRS utility functions
        mockGetDistributeTaskExecutionResults = jest.fn();
        mockGetTaskTags = jest.fn();
        mockPostDistributeTaskSuccessNotificationInfluxDb = jest.fn();
        mockSendDistributeTaskSuccessNotificationEmail = jest.fn();

        await jest.unstable_mockModule('../../../../qrs_util/distribute_task_execution_results.js', () => ({
            default: mockGetDistributeTaskExecutionResults,
        }));

        await jest.unstable_mockModule('../../../../qrs_util/task_tag_util.js', () => ({
            default: mockGetTaskTags,
        }));

        await jest.unstable_mockModule('../../../../lib/influxdb/task_success.js', () => ({
            postDistributeTaskSuccessNotificationInfluxDb: mockPostDistributeTaskSuccessNotificationInfluxDb,
        }));

        await jest.unstable_mockModule('../../../../lib/qseow/smtp.js', () => ({
            sendDistributeTaskSuccessNotificationEmail: mockSendDistributeTaskSuccessNotificationEmail,
        }));

        // Mock globals
        mockGlobals = {
            config: {
                has: jest.fn(() => true),
                get: jest.fn((key) => {
                    const configMap = {
                        'Butler.influxDb.enable': true,
                        'Butler.influxDb.distributeTaskSuccess.enable': true,
                    };
                    return configMap[key];
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

        await jest.unstable_mockModule('../../../../globals.js', () => ({
            default: mockGlobals,
        }));

        // Import the module under test
        const module = await import('../success_distribute.js');
        handleSuccessDistributeTask = module.handleSuccessDistributeTask;
    });

    afterEach(() => {
        jest.resetModules();
    });

    const createUdpMessage = (overrides = {}) => [
        overrides.messageType || '/scheduler-distribute-success/',
        overrides.host || 'server.domain.com',
        overrides.taskName || 'Distribute Task',
        overrides.appName || '', // Distribute tasks don't have apps
        overrides.user || 'INTERNAL\\sa_scheduler',
        overrides.taskId || 'dist-success-123',
        overrides.appId || '', // Distribute tasks don't have apps
        overrides.logTimeStamp || '2025-10-09 10:30:45.123',
        overrides.logLevel || 'INFO',
        overrides.executionId || 'exec-789',
        overrides.logMessage || 'Distribution completed successfully',
    ];

    const createTaskMetadata = (overrides = {}) => ({
        id: overrides.taskId || 'dist-success-123',
        name: overrides.taskName || 'Distribute Task',
        taskType: overrides.taskType || 3, // 3 = Distribute
        enabled: overrides.enabled !== undefined ? overrides.enabled : true,
        tags:
            overrides.tags !== undefined
                ? overrides.tags
                : [
                      { id: 'tag-1', name: 'Production' },
                      { id: 'tag-2', name: 'Success' },
                  ],
        customProperties:
            overrides.customProperties !== undefined
                ? overrides.customProperties
                : [
                      { definition: { name: 'environment' }, value: 'production' },
                      { definition: { name: 'owner' }, value: 'ops-team' },
                  ],
    });

    const createTaskExecutionResults = (overrides = {}) => ({
        executionResultId: overrides.executionResultId || 'result-123',
        taskName: overrides.taskName || 'Distribute Task',
        executingNodeName: overrides.executingNodeName || 'node-1',
        executionDetailsSorted: overrides.executionDetailsSorted || [
            {
                detailCreatedDate: '2025-10-09T10:00:00.000Z',
                message: 'Changing task state from NeverStarted to Triggered',
            },
            {
                detailCreatedDate: '2025-10-09T10:00:05.000Z',
                message: 'Changing task state from Triggered to Started',
            },
            {
                detailCreatedDate: '2025-10-09T10:01:00.000Z',
                message: 'Changing task state from Started to FinishedSuccess',
            },
        ],
        executionDetailsConcatenated: overrides.executionDetailsConcatenated || 'Details...',
        executionStatusNum: overrides.executionStatusNum || 7,
        executionStatusText: overrides.executionStatusText || 'FinishedSuccess',
        executionDuration: overrides.executionDuration || { hours: 0, minutes: 1, seconds: 30 },
        executionStartTime: overrides.executionStartTime || { year: 2025, month: 10, day: 9 },
        executionStopTime: overrides.executionStopTime || { year: 2025, month: 10, day: 9 },
    });

    describe('successful processing with InfluxDB enabled', () => {
        test('should successfully process distribute task and store in InfluxDB when enabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['Production', 'Success']);

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetDistributeTaskExecutionResults).toHaveBeenCalledWith('dist-success-123');
            expect(mockGetTaskTags).toHaveBeenCalledWith('dist-success-123');
            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'server.domain.com',
                user: 'INTERNAL/sa_scheduler',
                taskName: 'Distribute Task',
                taskId: 'dist-success-123',
                logTimeStamp: '2025-10-09 10:30:45.123',
                logLevel: 'INFO',
                executionId: 'exec-789',
                logMessage: 'Distribution completed successfully',
                taskTags: ['Production', 'Success'],
                qs_taskTags: ['Production', 'Success'],
                qs_taskCustomProperties: [
                    { name: 'environment', value: 'production' },
                    { name: 'owner', value: 'ops-team' },
                ],
                qs_taskMetadata: taskMetadata,
                taskInfo: taskInfo,
            });
        });

        test('should convert backslashes to forward slashes in user field', async () => {
            const msg = createUdpMessage({
                user: 'DOMAIN\\username',
            });
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'DOMAIN/username',
                }),
            );
        });

        test('should warn and return false when task execution results are not available', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(false);

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGetDistributeTaskExecutionResults).toHaveBeenCalledTimes(1);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unable to get task info for distribute task'));
        });

        test('should handle task with no tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [] });
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should not store in InfluxDB when Butler.influxDb.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return false;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetDistributeTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not store in InfluxDB when Butler.influxDb.distributeTaskSuccess.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetDistributeTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should handle config.has returning false', async () => {
            mockGlobals.config.has.mockReturnValue(false);
            mockGlobals.config.get.mockReturnValue(undefined);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetDistributeTaskExecutionResults).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should handle error during task execution results retrieval', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetDistributeTaskExecutionResults.mockRejectedValue(new Error('QRS API error'));

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error handling successful distribute task'));
        });

        test('should handle error when getErrorMessage is called', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetDistributeTaskExecutionResults.mockRejectedValue(new Error('Test error'));

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockGlobals.getErrorMessage).toHaveBeenCalled();
        });

        test('should handle undefined taskMetadata gracefully', async () => {
            const msg = createUdpMessage();
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessDistributeTask(msg, undefined);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                    qs_taskCustomProperties: [],
                    qs_taskMetadata: undefined,
                }),
            );
        });

        test('should handle null taskMetadata gracefully', async () => {
            const msg = createUdpMessage();
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessDistributeTask(msg, null);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                    qs_taskCustomProperties: [],
                    qs_taskMetadata: null,
                }),
            );
        });

        test('should handle empty tags array', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [] });
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle empty custom properties array', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: [] });
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle null custom properties', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: null });
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle complex custom properties with special characters', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
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

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [
                        { name: 'environment', value: 'production' },
                        { name: 'owner', value: 'ops-team' },
                    ],
                }),
            );
        });
    });

    describe('UDP message field extraction', () => {
        test('should correctly extract all fields from UDP message', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = [
                '/scheduler-distribute-success/',
                'prod-server.example.com',
                'Distribution Script',
                '',
                'CORP\\distribute_user',
                'task-999',
                '',
                '2025-10-09 23:45:12.789',
                'INFO',
                'exec-888',
                'Distribution completed successfully',
            ];
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'prod-server.example.com',
                    user: 'CORP/distribute_user',
                    taskName: 'Distribution Script',
                    taskId: 'task-999',
                    logTimeStamp: '2025-10-09 23:45:12.789',
                    logLevel: 'INFO',
                    executionId: 'exec-888',
                    logMessage: 'Distribution completed successfully',
                }),
            );
        });
    });

    describe('edge cases', () => {
        test('should handle special characters in task name', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage({
                taskName: 'Task with "quotes" & <special> chars',
            });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle very long log messages', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const longMessage = 'A'.repeat(10000);
            const msg = createUdpMessage({ logMessage: longMessage });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle empty log message', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage({ logMessage: '' });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessDistributeTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle null taskMetadata', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();

            const result = await handleSuccessDistributeTask(msg, null);

            expect(result).toBe(true);
        });

        test('should handle undefined taskMetadata', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();

            const result = await handleSuccessDistributeTask(msg, undefined);

            expect(result).toBe(true);
        });
    });

    describe('logging', () => {
        test('should log verbose information about the task', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('DISTRIBUTE TASK SUCCESS'));
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('completed successfully'));
        });

        test('should log when storing to InfluxDB', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(
                expect.stringContaining('Storing distribute task success info in InfluxDB'),
            );
        });

        test('should log when not storing to InfluxDB', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Not storing task info in InfluxDB'));
        });
    });

    describe('email notifications', () => {
        const createTaskExecutionResultsWithEmail = () => ({
            status: 0,
            statusText: 'FinishedSuccess',
            details: [{ message: 'Distribution completed', detailCreatedDate: '2025-10-09T10:30:45.000Z' }],
            duration: { hours: 0, minutes: 2, seconds: 15 },
            startTime: {
                startTimeUTC: '2025-10-09T10:28:30.000Z',
                startTimeLocal1: '2025-10-09 12:28:30',
            },
            stopTime: {
                stopTimeUTC: '2025-10-09T10:30:45.000Z',
                stopTimeLocal1: '2025-10-09 12:30:45',
            },
            executingNodeName: 'central-node',
        });

        test('should send email when email notifications are enabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return true;
                if (key === 'Butler.emailNotification.distributeTaskSuccess.enable') return true;
                if (key === 'Butler.influxDb.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResultsWithEmail();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockSendDistributeTaskSuccessNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    hostName: 'server.domain.com',
                    user: 'INTERNAL\\sa_scheduler',
                    taskName: 'Distribute Task',
                    taskId: 'dist-success-123',
                    logTimeStamp: '2025-10-09 10:30:45.123',
                    logLevel: 'INFO',
                    executionId: 'exec-789',
                    logMessage: 'Distribution completed successfully',
                    executionStatusNum: 0,
                    executionStatusText: 'FinishedSuccess',
                    executingNodeName: 'central-node',
                }),
            );
        });

        test('should not send email when email notifications are disabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return false;
                if (key === 'Butler.influxDb.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockSendDistributeTaskSuccessNotificationEmail).not.toHaveBeenCalled();
        });

        test('should not send email when distributeTaskSuccess email is disabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return true;
                if (key === 'Butler.emailNotification.distributeTaskSuccess.enable') return false;
                if (key === 'Butler.influxDb.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockSendDistributeTaskSuccessNotificationEmail).not.toHaveBeenCalled();
        });

        test('should send email with execution details', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return true;
                if (key === 'Butler.emailNotification.distributeTaskSuccess.enable') return true;
                if (key === 'Butler.influxDb.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResultsWithEmail();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockSendDistributeTaskSuccessNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionDetails: taskInfo.details,
                    executionDetailsConcatenated: 'Distribution completed',
                    executionDuration: taskInfo.duration,
                    executionStartTime: taskInfo.startTime,
                    executionStopTime: taskInfo.stopTime,
                }),
            );
        });

        test('should send email with task metadata', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return true;
                if (key === 'Butler.emailNotification.distributeTaskSuccess.enable') return true;
                if (key === 'Butler.influxDb.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResultsWithEmail();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockSendDistributeTaskSuccessNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: ['Production', 'Success'],
                    qs_taskCustomProperties: [
                        { name: 'environment', value: 'production' },
                        { name: 'owner', value: 'ops-team' },
                    ],
                    qs_taskMetadata: taskMetadata,
                }),
            );
        });

        test('should work with both email and InfluxDB enabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.emailNotification.enable') return true;
                if (key === 'Butler.emailNotification.distributeTaskSuccess.enable') return true;
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskSuccess.tag.dynamic.useTaskTags') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResultsWithEmail();

            mockGetDistributeTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            await handleSuccessDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskSuccessNotificationInfluxDb).toHaveBeenCalled();
            expect(mockSendDistributeTaskSuccessNotificationEmail).toHaveBeenCalled();
        });
    });
});
