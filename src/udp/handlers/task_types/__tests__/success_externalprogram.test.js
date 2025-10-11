import { jest } from '@jest/globals';

describe('success_externalprogram', () => {
    let handleSuccessExternalProgramTask;
    let mockGlobals;
    let mockGetExternalProgramTaskExecutionResults;
    let mockGetTaskTags;
    let mockPostExternalProgramTaskSuccessNotificationInfluxDb;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mock QRS utility functions
        mockGetExternalProgramTaskExecutionResults = jest.fn();
        mockGetTaskTags = jest.fn();
        mockPostExternalProgramTaskSuccessNotificationInfluxDb = jest.fn();

        await jest.unstable_mockModule('../../../../qrs_util/externalprogram_task_execution_results.js', () => ({
            default: mockGetExternalProgramTaskExecutionResults,
        }));

        await jest.unstable_mockModule('../../../../qrs_util/task_tag_util.js', () => ({
            default: mockGetTaskTags,
        }));

        await jest.unstable_mockModule('../../../../lib/influxdb/task_success.js', () => ({
            postExternalProgramTaskSuccessNotificationInfluxDb: mockPostExternalProgramTaskSuccessNotificationInfluxDb,
        }));

        // Mock globals
        mockGlobals = {
            config: {
                has: jest.fn(() => true),
                get: jest.fn((key) => {
                    const configMap = {
                        'Butler.influxDb.enable': true,
                        'Butler.influxDb.externalProgramTaskSuccess.enable': true,
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
        const module = await import('../success_externalprogram.js');
        handleSuccessExternalProgramTask = module.handleSuccessExternalProgramTask;
    });

    afterEach(() => {
        jest.resetModules();
    });

    const createUdpMessage = (overrides = {}) => [
        overrides.messageType || '/scheduler-externalprogram-success/',
        overrides.host || 'server.domain.com',
        overrides.taskName || 'External Program Task',
        overrides.appName || '', // External programs don't have apps
        overrides.user || 'INTERNAL\\sa_scheduler',
        overrides.taskId || 'ext-success-123',
        overrides.appId || '', // External programs don't have apps
        overrides.logTimeStamp || '2025-10-09 10:30:45.123',
        overrides.logLevel || 'INFO',
        overrides.executionId || 'exec-789',
        overrides.logMessage || 'External program completed successfully',
    ];

    const createTaskMetadata = (overrides = {}) => ({
        id: overrides.taskId || 'ext-success-123',
        name: overrides.taskName || 'External Program Task',
        taskType: overrides.taskType || 1, // 1 = ExternalProgram
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
        taskName: overrides.taskName || 'External Program Task',
        executingNodeName: overrides.executingNodeName || 'node1.example.com',
        executionDetailsSorted: overrides.executionDetailsSorted || [
            {
                detailCreatedDate: '2025-10-09T10:00:00.000Z',
                message: 'Changing task state from NeverStarted to Triggered',
            },
            {
                detailCreatedDate: '2025-10-09T10:00:01.000Z',
                message: 'Changing task state from Triggered to Started',
            },
            {
                detailCreatedDate: '2025-10-09T10:00:10.000Z',
                message: 'Changing task state from Started to FinishedSuccess',
            },
        ],
        executionDetailsConcatenated: overrides.executionDetailsConcatenated || 'Task completed',
        executionStatusNum: overrides.executionStatusNum !== undefined ? overrides.executionStatusNum : 7,
        executionStatusText: overrides.executionStatusText || 'FinishedSuccess',
        executionDuration: overrides.executionDuration || { hours: 0, minutes: 0, seconds: 10 },
        executionStartTime: overrides.executionStartTime || { year: 2025, month: 10, day: 9 },
        executionStopTime: overrides.executionStopTime || { year: 2025, month: 10, day: 9 },
    });

    describe('successful processing with InfluxDB enabled', () => {
        test('should successfully process external program task and store in InfluxDB when enabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['Production', 'Success']);

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetExternalProgramTaskExecutionResults).toHaveBeenCalledWith('ext-success-123');
            expect(mockGetTaskTags).toHaveBeenCalledWith('ext-success-123');
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'server.domain.com',
                user: 'INTERNAL/sa_scheduler',
                taskName: 'External Program Task',
                taskId: 'ext-success-123',
                logTimeStamp: '2025-10-09 10:30:45.123',
                logLevel: 'INFO',
                executionId: 'exec-789',
                logMessage: 'External program completed successfully',
                taskTags: ['Production', 'Success'],
                qs_taskCustomProperties: [
                    { name: 'environment', value: 'production' },
                    { name: 'owner', value: 'ops-team' },
                ],
                taskInfo,
                qs_taskMetadata: taskMetadata,
            });
        });

        test('should convert backslashes to forward slashes in user field', async () => {
            const msg = createUdpMessage({ user: 'DOMAIN\\username' });
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'DOMAIN/username',
                }),
            );
        });

        test('should retry up to 5 times to get task execution results', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // Return incomplete results 4 times, then complete results
            const incompleteTaskInfo = createTaskExecutionResults({
                executionDetailsSorted: [
                    {
                        detailCreatedDate: '2025-10-09T10:00:00.000Z',
                        message: 'Changing task state from NeverStarted to Triggered',
                    },
                ],
            });

            const completeTaskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults
                .mockResolvedValueOnce(incompleteTaskInfo)
                .mockResolvedValueOnce(incompleteTaskInfo)
                .mockResolvedValueOnce(incompleteTaskInfo)
                .mockResolvedValueOnce(incompleteTaskInfo)
                .mockResolvedValueOnce(completeTaskInfo);

            mockGetTaskTags.mockResolvedValue([]);

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetExternalProgramTaskExecutionResults).toHaveBeenCalledTimes(5);
            expect(mockGlobals.sleep).toHaveBeenCalledTimes(4);
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalled();
        });

        test('should warn when duration is 0 seconds', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults({
                executionDuration: { hours: 0, minutes: 0, seconds: 0 },
            });

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

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
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // All calls return incomplete data
            const incompleteTaskInfo = createTaskExecutionResults({
                executionDetailsSorted: [
                    {
                        detailCreatedDate: '2025-10-09T10:00:00.000Z',
                        message: 'Changing task state from NeverStarted to Triggered',
                    },
                ],
            });

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(incompleteTaskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGetExternalProgramTaskExecutionResults).toHaveBeenCalledTimes(5);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Unable to get task info for external program task'),
            );
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });
    });

    describe('configuration-based behavior', () => {
        test('should not store in InfluxDB when Butler.influxDb.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return false;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetExternalProgramTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not store in InfluxDB when Butler.influxDb.externalProgramTaskSuccess.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetExternalProgramTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should handle config.has returning false', async () => {
            mockGlobals.config.has.mockReturnValue(false);
            mockGlobals.config.get.mockReturnValue(undefined);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetExternalProgramTaskExecutionResults).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should handle error during task execution results retrieval', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetExternalProgramTaskExecutionResults.mockRejectedValue(new Error('QRS API error'));

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error handling successful external program task: QRS API error'),
            );
        });

        test('should handle error during InfluxDB posting', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);
            mockPostExternalProgramTaskSuccessNotificationInfluxDb.mockImplementation(() => {
                throw new Error('InfluxDB write failed');
            });

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error handling successful external program task: InfluxDB write failed'),
            );
        });

        test('should log stack trace on error', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const error = new Error('Test error');
            mockGetExternalProgramTaskExecutionResults.mockRejectedValue(error);

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Stack trace:'));
        });
    });

    describe('task metadata extraction', () => {
        test('should correctly extract task tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                tags: [
                    { id: '1', name: 'Tag1' },
                    { id: '2', name: 'Tag2' },
                    { id: '3', name: 'Tag3' },
                ],
            });

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tag1'));
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tag2'));
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tag3'));
        });

        test('should handle empty tags array', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [] });

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('[]'));
        });

        test('should handle null tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: null });

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            // Should not throw error
            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle undefined tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = { ...createTaskMetadata() };
            delete taskMetadata.tags;

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            // Should not throw error
            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });

        test('should handle empty custom properties array', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: [] });
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle null custom properties', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: null });
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue(['tag1']);

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should correctly format custom properties', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
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

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
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
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = [
                '/scheduler-externalprogram-success/',
                'prod-server.example.com',
                'Backup Script',
                '',
                'CORP\\backup_user',
                'task-999',
                '',
                '2025-10-09 23:45:12.789',
                'INFO',
                'exec-888',
                'Backup completed successfully',
            ];
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'prod-server.example.com',
                    user: 'CORP/backup_user',
                    taskName: 'Backup Script',
                    taskId: 'task-999',
                    logTimeStamp: '2025-10-09 23:45:12.789',
                    logLevel: 'INFO',
                    executionId: 'exec-888',
                    logMessage: 'Backup completed successfully',
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

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle very long log messages', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const longMessage = 'A'.repeat(10000);
            const msg = createUdpMessage({ logMessage: longMessage });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle empty log message', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage({ logMessage: '' });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle null taskMetadata', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();

            const result = await handleSuccessExternalProgramTask(msg, null);

            expect(result).toBe(true);
        });

        test('should handle undefined taskMetadata', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();

            const result = await handleSuccessExternalProgramTask(msg, undefined);

            expect(result).toBe(true);
        });
    });

    describe('logging', () => {
        test('should log verbose information about the task', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('EXTERNAL PROGRAM TASK SUCCESS'));
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('completed successfully'));
        });

        test('should log when storing to InfluxDB', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskInfo = createTaskExecutionResults();

            mockGetExternalProgramTaskExecutionResults.mockResolvedValue(taskInfo);
            mockGetTaskTags.mockResolvedValue([]);

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('External program info for task ext-success-123'));
        });

        test('should log verbose when not storing to InfluxDB', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleSuccessExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Not storing task info in InfluxDB'));
        });
    });
});
