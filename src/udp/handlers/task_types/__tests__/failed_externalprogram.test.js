import { jest } from '@jest/globals';

describe('failed_externalprogram', () => {
    let handleFailedExternalProgramTask;
    let mockGlobals;
    let mockPostExternalProgramTaskFailureNotificationInfluxDb;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Mock InfluxDB posting function
        mockPostExternalProgramTaskFailureNotificationInfluxDb = jest.fn();
        await jest.unstable_mockModule('../../../../lib/influxdb/task_failure.js', () => ({
            postExternalProgramTaskFailureNotificationInfluxDb: mockPostExternalProgramTaskFailureNotificationInfluxDb,
        }));

        // Mock globals
        mockGlobals = {
            config: {
                get: jest.fn((key) => {
                    const configMap = {
                        'Butler.influxDb.enable': true,
                        'Butler.influxDb.externalProgramTaskFailure.enable': true,
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
        const module = await import('../failed_externalprogram.js');
        handleFailedExternalProgramTask = module.handleFailedExternalProgramTask;
    });

    afterEach(() => {
        jest.resetModules();
    });

    const createUdpMessage = (overrides = {}) => [
        overrides.messageType || '/scheduler-externalprogram-failed/',
        overrides.host || 'server.domain.com',
        overrides.taskName || 'External Program Task',
        overrides.appName || '', // External programs don't have apps
        overrides.user || 'INTERNAL\\sa_scheduler',
        overrides.taskId || 'ext-task-123',
        overrides.appId || '', // External programs don't have apps
        overrides.logTimeStamp || '2025-10-09 10:30:45.123',
        overrides.logLevel || 'ERROR',
        overrides.executionId || 'exec-456',
        overrides.logMessage !== undefined ? overrides.logMessage : 'External program failed with exit code 1',
    ];

    const createTaskMetadata = (overrides = {}) => ({
        id: overrides.taskId || 'ext-task-123',
        name: overrides.taskName || 'External Program Task',
        taskType: overrides.taskType || 1, // 1 = ExternalProgram
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
        test('should handle external program task failure and post to InfluxDB', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'server.domain.com',
                user: 'INTERNAL/sa_scheduler',
                taskName: 'External Program Task',
                taskId: 'ext-task-123',
                logTimeStamp: '2025-10-09 10:30:45.123',
                logLevel: 'ERROR',
                executionId: 'exec-456',
                logMessage: 'External program failed with exit code 1',
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

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'DOMAIN/username',
                }),
            );
        });

        test('should log verbose information about the failure', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('External program task failed'));
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tags for task ext-task-123'));
        });

        test('should handle task with no tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [] });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle task with null tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: null });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle task with undefined tags', async () => {
            const msg = createUdpMessage();
            const taskMetadata = { ...createTaskMetadata() };
            delete taskMetadata.tags;

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                }),
            );
        });

        test('should handle task with no custom properties', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: [] });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle task with null custom properties', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ customProperties: null });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle task with undefined custom properties', async () => {
            const msg = createUdpMessage();
            const taskMetadata = { ...createTaskMetadata() };
            delete taskMetadata.customProperties;

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [],
                }),
            );
        });

        test('should handle multiple tags correctly', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                tags: [
                    { id: '1', name: 'Tag1' },
                    { id: '2', name: 'Tag2' },
                    { id: '3', name: 'Tag3' },
                ],
            });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: ['Tag1', 'Tag2', 'Tag3'],
                }),
            );
        });

        test('should handle multiple custom properties correctly', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                customProperties: [
                    { definition: { name: 'prop1' }, value: 'value1' },
                    { definition: { name: 'prop2' }, value: 'value2' },
                    { definition: { name: 'prop3' }, value: 'value3' },
                ],
            });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [
                        { name: 'prop1', value: 'value1' },
                        { name: 'prop2', value: 'value2' },
                        { name: 'prop3', value: 'value3' },
                    ],
                }),
            );
        });
    });

    describe('configuration-based behavior', () => {
        test('should not post to InfluxDB when Butler.influxDb.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return false;
                if (key === 'Butler.influxDb.externalProgramTaskFailure.enable') return true;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not post to InfluxDB when Butler.influxDb.externalProgramTaskFailure.enable is false', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.enable') return true;
                if (key === 'Butler.influxDb.externalProgramTaskFailure.enable') return false;
                return false;
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should not post to InfluxDB when both flags are false', async () => {
            mockGlobals.config.get.mockImplementation(() => false);

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should catch and log errors during processing', async () => {
            mockPostExternalProgramTaskFailureNotificationInfluxDb.mockImplementation(() => {
                throw new Error('InfluxDB write failed');
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error handling failed external program task: InfluxDB write failed'),
            );
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Stack trace:'));
        });

        test('should handle error when getErrorMessage is called', async () => {
            mockPostExternalProgramTaskFailureNotificationInfluxDb.mockImplementation(() => {
                throw new Error('Test error');
            });

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockGlobals.getErrorMessage).toHaveBeenCalled();
        });

        test('should handle undefined taskMetadata gracefully', async () => {
            const msg = createUdpMessage();

            await handleFailedExternalProgramTask(msg, undefined);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                    qs_taskCustomProperties: [],
                    qs_taskMetadata: undefined,
                }),
            );
        });

        test('should handle null taskMetadata gracefully', async () => {
            const msg = createUdpMessage();

            await handleFailedExternalProgramTask(msg, null);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
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

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
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

                await handleFailedExternalProgramTask(msg, taskMetadata);

                expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                    expect.objectContaining({
                        logLevel,
                    }),
                );
            }
        });

        test('should handle empty log message', async () => {
            const msg = createUdpMessage({ logMessage: '' });
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    logMessage: '',
                }),
            );
        });

        test('should handle very long log message', async () => {
            const longMessage = 'A'.repeat(10000);
            const msg = createUdpMessage({ logMessage: longMessage });
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    logMessage: longMessage,
                }),
            );
        });

        test('should handle task with tags containing special characters', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                tags: [
                    { id: '1', name: 'Tag with spaces' },
                    { id: '2', name: 'Tag-with-dashes' },
                    { id: '3', name: 'Tag_with_underscores' },
                ],
            });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: ['Tag with spaces', 'Tag-with-dashes', 'Tag_with_underscores'],
                }),
            );
        });

        test('should handle custom properties with special characters in values', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                customProperties: [
                    { definition: { name: 'email' }, value: 'user@example.com' },
                    { definition: { name: 'path' }, value: 'C:\\Program Files\\App' },
                ],
            });

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith(
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
                '/scheduler-externalprogram-failed/',
                'prod-server.example.com',
                'Nightly Backup Script',
                '',
                'CORP\\admin_user',
                'abc-123-def-456',
                '',
                '2025-10-09 23:45:12.789',
                'FATAL',
                'exec-999',
                'Script terminated unexpectedly: Access denied',
            ];
            const taskMetadata = createTaskMetadata();

            await handleFailedExternalProgramTask(msg, taskMetadata);

            expect(mockPostExternalProgramTaskFailureNotificationInfluxDb).toHaveBeenCalledWith({
                host: 'prod-server.example.com',
                user: 'CORP/admin_user',
                taskName: 'Nightly Backup Script',
                taskId: 'abc-123-def-456',
                logTimeStamp: '2025-10-09 23:45:12.789',
                logLevel: 'FATAL',
                executionId: 'exec-999',
                logMessage: 'Script terminated unexpectedly: Access denied',
                qs_taskTags: ['Production', 'Critical'],
                qs_taskCustomProperties: [
                    { name: 'environment', value: 'production' },
                    { name: 'team', value: 'ops' },
                ],
                qs_taskMetadata: taskMetadata,
            });
        });
    });
});
