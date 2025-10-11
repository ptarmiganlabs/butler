import { jest } from '@jest/globals';

describe('failed_distribute', () => {
    let handleFailedDistributeTask;
    let mockGlobals;
    let mockPostDistributeTaskFailureNotificationInfluxDb;
    let mockSendDistributeTaskFailureNotificationEmail;
    let mockGetDistributeTaskExecutionResults;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mock InfluxDB posting function
        mockPostDistributeTaskFailureNotificationInfluxDb = jest.fn();
        await jest.unstable_mockModule('../../../../lib/influxdb/task_failure.js', () => ({
            postDistributeTaskFailureNotificationInfluxDb: mockPostDistributeTaskFailureNotificationInfluxDb,
        }));

        // Mock email notification function
        mockSendDistributeTaskFailureNotificationEmail = jest.fn();
        await jest.unstable_mockModule('../../../../lib/qseow/smtp/distribute-task-failed.js', () => ({
            sendDistributeTaskFailureNotificationEmail: mockSendDistributeTaskFailureNotificationEmail,
        }));

        // Mock distribute task execution results
        mockGetDistributeTaskExecutionResults = jest.fn().mockResolvedValue({
            executionStatusNum: 8,
            executionStatusText: 'FinishedFail',
            executionDetailsSorted: [
                { timestampLocal1: '2025-10-09 10:00:00', message: 'Task started' },
                { timestampLocal1: '2025-10-09 10:01:00', message: 'Distribution failed' },
            ],
            executionDetailsConcatenated: 'Task started\nDistribution failed',
            executionDuration: { hours: 0, minutes: 1, seconds: 0 },
            executionStartTime: { startTimeLocal1: '2025-10-09 10:00:00' },
            executionStopTime: { stopTimeLocal1: '2025-10-09 10:01:00' },
            executingNodeName: 'Node1',
        });
        await jest.unstable_mockModule('../../../../qrs_util/distribute_task_execution_results.js', () => ({
            default: mockGetDistributeTaskExecutionResults,
        }));

        // Mock globals
        mockGlobals = {
            config: {
                has: jest.fn(() => true),
                get: jest.fn((key) => {
                    const configMap = {
                        'Butler.influxDb.enable': true,
                        'Butler.influxDb.distributeTaskFailure.enable': true,
                        'Butler.emailNotification.enable': false,
                        'Butler.emailNotification.distributeTaskFailure.enable': false,
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
        };

        await jest.unstable_mockModule('../../../../globals.js', () => ({
            default: mockGlobals,
        }));

        // Import the module under test
        const module = await import('../failed_distribute.js');
        handleFailedDistributeTask = module.handleFailedDistributeTask;
    });

    afterEach(() => {
        jest.resetModules();
    });

    const createUdpMessage = (overrides = {}) => [
        overrides.messageType || '/scheduler-distribute-failed/',
        overrides.host || 'server.domain.com',
        overrides.taskName || 'Distribute Task',
        overrides.appName || '', // Distribute tasks don't have apps
        overrides.user || 'INTERNAL\\sa_scheduler',
        overrides.taskId || 'dist-task-123',
        overrides.appId || '', // Distribute tasks don't have apps
        overrides.logTimeStamp || '2025-10-09 10:30:45.123',
        overrides.logLevel || 'ERROR',
        overrides.executionId || 'exec-456',
        overrides.logMessage !== undefined ? overrides.logMessage : 'Distribution failed with error',
    ];

    const createTaskMetadata = (overrides = {}) => ({
        id: overrides.taskId || 'dist-task-123',
        name: overrides.taskName || 'Distribute Task',
        taskType: overrides.taskType || 3, // 3 = Distribute
        enabled: overrides.enabled !== undefined ? overrides.enabled : true,
        tags:
            overrides.tags !== undefined
                ? overrides.tags
                : [
                      { id: 'tag-1', name: 'Production' },
                      { id: 'tag-2', name: 'Critical' },
                  ],
        customProperties:
            overrides.customProperties !== undefined
                ? overrides.customProperties
                : [
                      { definition: { name: 'environment' }, value: 'production' },
                      { definition: { name: 'team' }, value: 'ops' },
                  ],
    });

    describe('successful processing', () => {
        test('should handle distribute task failure and post to InfluxDB', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'server.domain.com',
                user: 'INTERNAL/sa_scheduler',
                taskName: 'Distribute Task',
                taskId: 'dist-task-123',
                logTimeStamp: '2025-10-09 10:30:45.123',
                logLevel: 'ERROR',
                executionId: 'exec-456',
                logMessage: 'Distribution failed with error',
                qs_taskTags: ['Production', 'Critical'],
                qs_taskCustomProperties: [
                    { name: 'environment', value: 'production' },
                    { name: 'team', value: 'ops' },
                ],
                qs_taskMetadata: taskMetadata,
            });
        });

        test('should convert backslashes to forward slashes in user field', async () => {
            const msg = createUdpMessage({
                user: 'DOMAIN\\username',
            });
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'DOMAIN/username',
                }),
            );
        });

        test('should log verbose information about the failure', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Distribute task failed'));
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tags for task dist-task-123'));
        });

        test('should handle task with no tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [] });

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle task with no custom properties', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: [] });

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should not post to InfluxDB when Butler.influxDb.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return false;
                return true;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not post to InfluxDB when Butler.influxDb.distributeTaskFailure.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskFailure.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not post to InfluxDB when config.has returns false for enable', async () => {
            mockGlobals.config.has.mockReturnValue(false);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should handle errors gracefully', async () => {
            mockPostDistributeTaskFailureNotificationInfluxDb.mockImplementation(() => {
                throw new Error('InfluxDB error');
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await expect(handleFailedDistributeTask(msg, taskMetadata)).resolves.not.toThrow();

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error handling failed distribute task'));
        });

        test('should handle error when getErrorMessage is called', async () => {
            mockPostDistributeTaskFailureNotificationInfluxDb.mockImplementation(() => {
                throw new Error('Test error');
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGlobals.getErrorMessage).toHaveBeenCalled();
        });

        test('should handle undefined taskMetadata gracefully', async () => {
            const msg = createUdpMessage();

            await handleFailedDistributeTask(msg, undefined);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                    qs_taskCustomProperties: [],
                    qs_taskMetadata: undefined,
                }),
            );
        });

        test('should handle null taskMetadata gracefully', async () => {
            const msg = createUdpMessage();

            await handleFailedDistributeTask(msg, null);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                    qs_taskCustomProperties: [],
                    qs_taskMetadata: null,
                }),
            );
        });
    });

    describe('edge cases', () => {
        test('should handle UDP message with special characters', async () => {
            const msg = createUdpMessage({
                taskName: 'Task with "quotes" & <special> chars',
                logMessage: 'Error: Command "test.exe" failed with code 1',
            });
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskName: 'Task with "quotes" & <special> chars',
                    logMessage: 'Error: Command "test.exe" failed with code 1',
                }),
            );
        });

        test('should handle different log levels', async () => {
            const logLevels = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

            for (const logLevel of logLevels) {
                const msg = createUdpMessage({ logLevel });
                const taskMetadata = createTaskMetadata();

                await handleFailedDistributeTask(msg, taskMetadata);

                expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                    expect.objectContaining({
                        logLevel,
                    }),
                );
            }
        });

        test('should handle empty log message', async () => {
            const msg = createUdpMessage({ logMessage: '' });
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    logMessage: '',
                }),
            );
        });

        test('should handle very long log message', async () => {
            const longMessage = 'A'.repeat(10000);
            const msg = createUdpMessage({ logMessage: longMessage });
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    logMessage: longMessage,
                }),
            );
        });

        test('should handle null tags in taskMetadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: null });

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle null custom properties in taskMetadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: null });

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle custom properties with special characters', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                customProperties: [
                    { definition: { name: 'email' }, value: 'user@example.com' },
                    { definition: { name: 'path' }, value: 'C:\\Program Files\\App' },
                ],
            });

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [
                        { name: 'email', value: 'user@example.com' },
                        { name: 'path', value: 'C:\\Program Files\\App' },
                    ],
                }),
            );
        });
    });

    describe('UDP message field extraction', () => {
        test('should correctly extract all fields from UDP message', async () => {
            const msg = [
                '/scheduler-distribute-failed/',
                'prod-server.example.com',
                'Nightly Distribution Script',
                '',
                'CORP\\admin_user',
                'abc-123-def-456',
                '',
                '2025-10-09 14:22:33.456',
                'FATAL',
                'exec-999',
                'Distribution failed: Target stream not accessible',
            ];
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'prod-server.example.com',
                    user: 'CORP/admin_user',
                    taskName: 'Nightly Distribution Script',
                    taskId: 'abc-123-def-456',
                    logTimeStamp: '2025-10-09 14:22:33.456',
                    logLevel: 'FATAL',
                    executionId: 'exec-999',
                    logMessage: 'Distribution failed: Target stream not accessible',
                }),
            );
        });
    });

    describe('InfluxDB integration', () => {
        test('should only post to InfluxDB when both enable flags are true', async () => {
            mockGlobals.config.has.mockReturnValue(true);
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.distributeTaskFailure.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).toHaveBeenCalledTimes(1);
        });

        test('should handle missing InfluxDB configuration gracefully', async () => {
            mockGlobals.config.has.mockImplementation((key) => {
                if (key.includes('influxDb')) return false;
                return true;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockPostDistributeTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });
    });

    describe('logging', () => {
        test('should log task failure information', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('Distribute task'));
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(expect.stringContaining('failed'));
        });

        test('should log error with stack trace when exception occurs', async () => {
            const testError = new Error('Test error');
            testError.stack = 'Error stack trace';

            mockPostDistributeTaskFailureNotificationInfluxDb.mockImplementation(() => {
                throw testError;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error handling failed distribute task'));
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Stack trace'));
        });
    });

    describe('email notifications', () => {
        test('should send email when email notifications are enabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.distributeTaskFailure.enable': true,
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.distributeTaskFailure.enable': true,
                };
                return configMap[key];
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGetDistributeTaskExecutionResults).toHaveBeenCalledWith('dist-task-123', taskMetadata);
            expect(mockSendDistributeTaskFailureNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    hostName: 'server.domain.com',
                    user: 'INTERNAL\\sa_scheduler',
                    taskName: 'Distribute Task',
                    taskId: 'dist-task-123',
                    executionStatusNum: 8,
                    executionStatusText: 'FinishedFail',
                }),
            );
        });

        test('should not send email when Butler.emailNotification.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.distributeTaskFailure.enable': true,
                    'Butler.emailNotification.enable': false,
                    'Butler.emailNotification.distributeTaskFailure.enable': true,
                };
                return configMap[key];
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGetDistributeTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockSendDistributeTaskFailureNotificationEmail).not.toHaveBeenCalled();
        });

        test('should not send email when distributeTaskFailure.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.distributeTaskFailure.enable': true,
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.distributeTaskFailure.enable': false,
                };
                return configMap[key];
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGetDistributeTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockSendDistributeTaskFailureNotificationEmail).not.toHaveBeenCalled();
        });

        test('should include execution details in email params', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.distributeTaskFailure.enable': true,
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.distributeTaskFailure.enable': true,
                };
                return configMap[key];
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockSendDistributeTaskFailureNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionDetails: expect.arrayContaining([
                        expect.objectContaining({ message: 'Task started' }),
                        expect.objectContaining({ message: 'Distribution failed' }),
                    ]),
                    executionDuration: { hours: 0, minutes: 1, seconds: 0 },
                    executingNodeName: 'Node1',
                }),
            );
        });

        test('should not send email if task execution results are undefined', async () => {
            mockGetDistributeTaskExecutionResults.mockResolvedValue(undefined);
            mockGlobals.config.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.distributeTaskFailure.enable': true,
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.distributeTaskFailure.enable': true,
                };
                return configMap[key];
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedDistributeTask(msg, taskMetadata);

            expect(mockGetDistributeTaskExecutionResults).toHaveBeenCalled();
            expect(mockSendDistributeTaskFailureNotificationEmail).not.toHaveBeenCalled();
        });
    });
});
