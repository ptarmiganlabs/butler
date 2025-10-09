import { jest } from '@jest/globals';

// Mock lodash
jest.unstable_mockModule('lodash', () => ({
    default: {
        cloneDeep: jest.fn((obj) => JSON.parse(JSON.stringify(obj))),
    },
}));

// Mock globals module
const mockInflux = {
    writePoints: jest.fn(),
};

const mockGlobals = {
    logger: {
        verbose: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        silly: jest.fn(),
        error: jest.fn(),
    },
    config: {
        get: jest.fn(),
    },
    influx: mockInflux,
    isSea: false,
    getErrorMessage: jest.fn((err) => err.message || err.toString()),
};

jest.unstable_mockModule('../../../globals.js', () => ({
    default: mockGlobals,
}));

const {
    postReloadTaskSuccessNotificationInfluxDb,
    postUserSyncTaskSuccessNotificationInfluxDb,
    postExternalProgramTaskSuccessNotificationInfluxDb,
} = await import('../task_success.js');

describe('InfluxDB Task Success Notifications', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInflux.writePoints.mockResolvedValue(undefined);

        // Default config
        mockGlobals.config.get.mockImplementation((key) => {
            const config = {
                'Butler.influxDb.tag.static': [
                    { name: 'env', value: 'production' },
                    { name: 'service', value: 'butler' },
                ],
                'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags': true,
                'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags': true,
                'Butler.influxDb.reloadTaskSuccess.tag.static': [{ name: 'category', value: 'reload' }],
                'Butler.influxDb.userSyncTaskSuccess.tag.dynamic.useTaskTags': true,
                'Butler.influxDb.userSyncTaskSuccess.tag.static': [],
                'Butler.influxDb.externalProgramTaskSuccess.tag.dynamic.useTaskTags': true,
                'Butler.influxDb.externalProgramTaskSuccess.tag.static': [],
            };
            return config[key];
        });
    });

    describe('postReloadTaskSuccessNotificationInfluxDb', () => {
        const createReloadParams = (overrides = {}) => ({
            host: 'server1.example.com',
            user: 'DOMAIN/user1',
            taskId: 'task-123',
            taskName: 'Test Reload Task',
            appId: 'app-456',
            appName: 'Test App',
            logTimeStamp: '2024-01-15T10:30:00.000Z',
            logLevel: 'INFO',
            executionId: 'exec-789',
            logMessage: 'Reload completed successfully',
            appTags: ['Finance', 'Daily'],
            taskTags: ['Production', 'Critical'],
            taskInfo: {
                executingNodeName: 'Node1',
                executionStatusNum: 7,
                executionStatusText: 'FinishedSuccess',
                executionStartTime: {
                    startTimeUTC: '2024-01-15T10:00:00.000Z',
                },
                executionStopTime: {
                    stopTimeUTC: '2024-01-15T10:05:30.000Z',
                },
                executionDuration: {
                    hours: 0,
                    minutes: 5,
                    seconds: 30,
                },
            },
            ...overrides,
        });

        test('should post reload task success to InfluxDB with all tags and fields', async () => {
            const params = createReloadParams();

            postReloadTaskSuccessNotificationInfluxDb(params);

            // Wait for async operations
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        measurement: 'reload_task_success',
                        tags: expect.objectContaining({
                            env: 'production',
                            service: 'butler',
                            host: 'server1.example.com',
                            user: 'DOMAIN/user1',
                            task_id: 'task-123',
                            task_name: 'Test Reload Task',
                            app_id: 'app-456',
                            app_name: 'Test App',
                            log_level: 'INFO',
                            task_executingNodeName: 'Node1',
                            task_executionStatusNum: 7,
                            task_exeuctionStatusText: 'FinishedSuccess',
                            appTag_Finance: 'true',
                            appTag_Daily: 'true',
                            taskTag_Production: 'true',
                            taskTag_Critical: 'true',
                            category: 'reload',
                        }),
                        fields: expect.objectContaining({
                            log_timestamp: '2024-01-15T10:30:00.000Z',
                            execution_id: 'exec-789',
                            log_message: 'Reload completed successfully',
                            task_executionDuration_sec: 330, // 5*60 + 30
                            task_executionDuration_min: 5.5, // 5 + 30/60
                        }),
                    }),
                ]),
            );
        });

        test('should calculate execution duration in different units correctly', async () => {
            const params = createReloadParams({
                taskInfo: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 7,
                    executionStatusText: 'FinishedSuccess',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: {
                        hours: 2,
                        minutes: 30,
                        seconds: 45,
                    },
                },
            });

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        fields: expect.objectContaining({
                            task_executionDuration_sec: 9045, // 2*3600 + 30*60 + 45
                            task_executionDuration_min: 150.75, // 2*60 + 30 + 45/60
                            task_executionDuration_h: expect.closeTo(2.5125, 4), // 2 + 30/60 + 45/3600
                        }),
                    }),
                ]),
            );
        });

        test('should handle missing app tags gracefully', async () => {
            const params = createReloadParams({ appTags: null });

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('appTag_Finance');
        });

        test('should handle missing task tags gracefully', async () => {
            const params = createReloadParams({ taskTags: undefined });

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('taskTag_Production');
        });

        test('should not include app tags when config disables them', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags') return false;
                if (key === 'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags') return true;
                if (key === 'Butler.influxDb.tag.static') return [];
                if (key === 'Butler.influxDb.reloadTaskSuccess.tag.static') return [];
                return undefined;
            });

            const params = createReloadParams();

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('appTag_Finance');
        });

        test('should handle InfluxDB write error', async () => {
            mockInflux.writePoints.mockRejectedValueOnce(new Error('Connection failed'));

            const params = createReloadParams();

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error saving reload task notification to InfluxDB'),
            );
        });

        test('should handle exception in try-catch block', async () => {
            mockGlobals.config.get.mockImplementationOnce(() => {
                throw new Error('Config error');
            });

            const params = createReloadParams();

            postReloadTaskSuccessNotificationInfluxDb(params);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('RELOAD TASK SUCCESS'));
        });
    });

    describe('postUserSyncTaskSuccessNotificationInfluxDb', () => {
        const createUserSyncParams = (overrides = {}) => ({
            host: 'server1.example.com',
            user: 'DOMAIN/admin',
            taskId: 'usersync-123',
            taskName: 'User Directory Sync',
            logTimeStamp: '2024-01-15T11:00:00.000Z',
            logLevel: 'INFO',
            executionId: 'exec-usersync-456',
            logMessage: 'User sync completed',
            taskTags: ['SystemTask', 'Hourly'],
            taskInfo: {
                executingNodeName: 'Node2',
                executionStatusNum: 7,
                executionStatusText: 'FinishedSuccess',
                executionStartTime: {},
                executionStopTime: {},
                executionDuration: {
                    hours: 0,
                    minutes: 2,
                    seconds: 15,
                },
            },
            ...overrides,
        });

        test('should post user sync task success to InfluxDB', async () => {
            const params = createUserSyncParams();

            postUserSyncTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        measurement: 'user_sync_task_success',
                        tags: expect.objectContaining({
                            host: 'server1.example.com',
                            user: 'DOMAIN/admin',
                            task_id: 'usersync-123',
                            task_name: 'User Directory Sync',
                            taskTag_SystemTask: 'true',
                            taskTag_Hourly: 'true',
                        }),
                        fields: expect.objectContaining({
                            log_timestamp: '2024-01-15T11:00:00.000Z',
                            execution_id: 'exec-usersync-456',
                            log_message: 'User sync completed',
                            task_executionDuration_sec: 135,
                        }),
                    }),
                ]),
            );
        });

        test('should handle user sync with no task tags', async () => {
            const params = createUserSyncParams({ taskTags: null });

            postUserSyncTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
        });

        test('should handle InfluxDB write error for user sync', async () => {
            mockInflux.writePoints.mockRejectedValueOnce(new Error('Network error'));

            const params = createUserSyncParams();

            postUserSyncTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error saving user sync task notification to InfluxDB'),
            );
        });
    });

    describe('postExternalProgramTaskSuccessNotificationInfluxDb', () => {
        const createExternalProgramParams = (overrides = {}) => ({
            host: 'server2.example.com',
            user: 'DOMAIN/service',
            taskId: 'extprog-789',
            taskName: 'External Program Task',
            logTimeStamp: '2024-01-15T12:00:00.000Z',
            logLevel: 'INFO',
            executionId: 'exec-ext-999',
            logMessage: 'External program completed',
            taskTags: ['Automation', 'Integration'],
            taskInfo: {
                executingNodeName: 'Node3',
                executionStatusNum: 7,
                executionStatusText: 'FinishedSuccess',
                executionStartTime: {},
                executionStopTime: {},
                executionDuration: {
                    hours: 1,
                    minutes: 15,
                    seconds: 42,
                },
            },
            ...overrides,
        });

        test('should post external program task success to InfluxDB', async () => {
            const params = createExternalProgramParams();

            postExternalProgramTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        measurement: 'external_program_task_success',
                        tags: expect.objectContaining({
                            host: 'server2.example.com',
                            user: 'DOMAIN/service',
                            task_id: 'extprog-789',
                            task_name: 'External Program Task',
                            taskTag_Automation: 'true',
                            taskTag_Integration: 'true',
                        }),
                        fields: expect.objectContaining({
                            log_timestamp: '2024-01-15T12:00:00.000Z',
                            execution_id: 'exec-ext-999',
                            log_message: 'External program completed',
                            task_executionDuration_sec: 4542, // 1*3600 + 15*60 + 42
                        }),
                    }),
                ]),
            );
        });

        test('should handle external program with empty task tags array', async () => {
            const params = createExternalProgramParams({ taskTags: [] });

            postExternalProgramTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
        });

        test('should not include task tags when config disables them', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.tag.dynamic.useTaskTags') return false;
                if (key === 'Butler.influxDb.tag.static') return [];
                if (key === 'Butler.influxDb.externalProgramTaskSuccess.tag.static') return [];
                return undefined;
            });

            const params = createExternalProgramParams();

            postExternalProgramTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('taskTag_Automation');
        });

        test('should handle exception during external program notification', async () => {
            const params = createExternalProgramParams();

            mockGlobals.config.get.mockImplementationOnce(() => {
                throw new Error('Config access error');
            });

            postExternalProgramTaskSuccessNotificationInfluxDb(params);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('EXTERNAL PROGRAM TASK SUCCESS'));
        });
    });

    describe('Edge cases and special scenarios', () => {
        test('should handle zero duration correctly', async () => {
            const params = {
                host: 'server1.example.com',
                user: 'DOMAIN/user1',
                taskId: 'task-zero',
                taskName: 'Instant Task',
                appId: 'app-zero',
                appName: 'Instant App',
                logTimeStamp: '2024-01-15T10:00:00.000Z',
                logLevel: 'INFO',
                executionId: 'exec-zero',
                logMessage: 'Done',
                appTags: [],
                taskTags: [],
                taskInfo: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 7,
                    executionStatusText: 'FinishedSuccess',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: {
                        hours: 0,
                        minutes: 0,
                        seconds: 0,
                    },
                },
            };

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        fields: expect.objectContaining({
                            task_executionDuration_sec: 0,
                            task_executionDuration_min: 0,
                            task_executionDuration_h: 0,
                        }),
                    }),
                ]),
            );
        });

        test('should handle special characters in task/app names', async () => {
            const params = {
                host: 'server1.example.com',
                user: 'DOMAIN/user1',
                taskId: 'task-special',
                taskName: 'Task with ÅÄÖ & <special> "chars"',
                appId: 'app-special',
                appName: 'App with 日本語',
                logTimeStamp: '2024-01-15T10:00:00.000Z',
                logLevel: 'INFO',
                executionId: 'exec-special',
                logMessage: 'Special chars: ÅÄÖ',
                appTags: [],
                taskTags: [],
                taskInfo: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 7,
                    executionStatusText: 'FinishedSuccess',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: { hours: 0, minutes: 0, seconds: 1 },
                },
            };

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
        });

        test('should handle very long tag lists', async () => {
            const manyTags = Array.from({ length: 100 }, (_, i) => `Tag${i}`);
            const params = {
                host: 'server1.example.com',
                user: 'DOMAIN/user1',
                taskId: 'task-many-tags',
                taskName: 'Many Tags Task',
                appId: 'app-many-tags',
                appName: 'Many Tags App',
                logTimeStamp: '2024-01-15T10:00:00.000Z',
                logLevel: 'INFO',
                executionId: 'exec-many-tags',
                logMessage: 'Done',
                appTags: manyTags,
                taskTags: manyTags,
                taskInfo: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 7,
                    executionStatusText: 'FinishedSuccess',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: { hours: 0, minutes: 0, seconds: 1 },
                },
            };

            postReloadTaskSuccessNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(Object.keys(callArgs[0].tags).filter((k) => k.startsWith('appTag_'))).toHaveLength(100);
        });
    });
});
