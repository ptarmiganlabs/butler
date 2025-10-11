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
        info: jest.fn(),
        debug: jest.fn(),
        silly: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        verbose: jest.fn(),
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

const { postReloadTaskFailureNotificationInfluxDb, postExternalProgramTaskFailureNotificationInfluxDb } = await import(
    '../task_failure.js'
);

describe('InfluxDB Task Failure Notifications', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInflux.writePoints.mockResolvedValue(undefined);

        // Default config
        mockGlobals.config.get.mockImplementation((key) => {
            const config = {
                'Butler.influxDb.tag.static': [{ name: 'env', value: 'production' }],
                'Butler.influxDb.reloadTaskFailure.tag.dynamic.useAppTags': true,
                'Butler.influxDb.reloadTaskFailure.tag.dynamic.useTaskTags': true,
                'Butler.influxDb.reloadTaskFailure.tag.static': [],
                'Butler.influxDb.reloadTaskFailure.tailScriptLogLines': 25,
                'Butler.influxDb.externalProgramTaskFailure.tag.dynamic.useTaskTags': true,
                'Butler.influxDb.externalProgramTaskFailure.tag.static': [],
            };
            return config[key];
        });
    });

    describe('postReloadTaskFailureNotificationInfluxDb', () => {
        const createReloadParams = (overrides = {}) => ({
            host: 'server1.example.com',
            user: 'DOMAIN/user1',
            taskId: 'task-failed-123',
            taskName: 'Failed Reload Task',
            appId: 'app-456',
            appName: 'Failed App',
            logTimeStamp: '2024-01-15T10:30:00.000Z',
            logLevel: 'ERROR',
            executionId: 'exec-failed-789',
            logMessage: 'Reload failed',
            appTags: ['Finance', 'Critical'],
            taskTags: ['Production'],
            scriptLog: {
                executingNodeName: 'Node1',
                executionStatusNum: 8,
                executionStatusText: 'FinishedFail',
                executionStartTime: {},
                executionStopTime: {},
                executionDuration: {
                    hours: 0,
                    minutes: 3,
                    seconds: 45,
                },
                scriptLogSize: 5000,
                scriptLogFull: ['Line 1: Starting reload', 'Line 2: Loading data', 'Line 3: Error occurred'],
                executionDetailsConcatenated: 'Execution details here\n',
            },
            ...overrides,
        });

        test('should post reload task failure to InfluxDB with script log', async () => {
            const params = createReloadParams();

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        measurement: 'reload_task_failed',
                        tags: expect.objectContaining({
                            host: 'server1.example.com',
                            user: 'DOMAIN/user1',
                            task_id: 'task-failed-123',
                            task_name: 'Failed Reload Task',
                            app_id: 'app-456',
                            app_name: 'Failed App',
                            log_level: 'ERROR',
                            task_executingNodeName: 'Node1',
                            task_executionStatusNum: 8,
                            task_exeuctionStatusText: 'FinishedFail',
                        }),
                        fields: expect.objectContaining({
                            log_timestamp: '2024-01-15T10:30:00.000Z',
                            execution_id: 'exec-failed-789',
                            log_message: 'Reload failed',
                            task_scriptLogSize: 5000,
                            task_scriptLogTailCount: 25,
                        }),
                    }),
                ]),
            );
        });

        test('should handle null script log data', async () => {
            const params = createReloadParams({ scriptLog: null });

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Script log data is not available'));

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        tags: expect.objectContaining({
                            task_executingNodeName: 'unknown',
                            task_executionStatusNum: -1,
                            task_exeuctionStatusText: 'Script log not available',
                        }),
                        fields: expect.objectContaining({
                            task_scriptLogSize: 0,
                            task_scriptLogTailCount: 0,
                            scriptLog: 'Script log not available',
                        }),
                    }),
                ]),
            );
        });

        test('should handle undefined script log data', async () => {
            const params = createReloadParams({ scriptLog: undefined });

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockGlobals.logger.warn).toHaveBeenCalled();
            expect(mockInflux.writePoints).toHaveBeenCalled();
        });

        test('should truncate script log to tail lines', async () => {
            const fullLog = Array.from({ length: 100 }, (_, i) => `Log line ${i + 1}`);
            const params = createReloadParams({
                scriptLog: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 8,
                    executionStatusText: 'FinishedFail',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: { hours: 0, minutes: 1, seconds: 0 },
                    scriptLogSize: 10000,
                    scriptLogFull: fullLog,
                    executionDetailsConcatenated: 'Details\n',
                },
            });

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            const scriptLogField = callArgs[0].fields.scriptLog;

            // Should contain last 25 lines
            expect(scriptLogField).toContain('Log line 76');
            expect(scriptLogField).toContain('Log line 100');
            // Check that early lines are not present (use line boundary to avoid matching "Log line 1" in "Log line 100")
            expect(scriptLogField).not.toMatch(/Log line 1\r?\n/);
            expect(scriptLogField).not.toMatch(/Log line 1$/m);
        });

        test('should handle empty script log array', async () => {
            const params = createReloadParams({
                scriptLog: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 8,
                    executionStatusText: 'FinishedFail',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: { hours: 0, minutes: 1, seconds: 0 },
                    scriptLogSize: 0,
                    scriptLogFull: [],
                    executionDetailsConcatenated: 'Details\n',
                },
            });

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
        });

        test('should calculate execution duration correctly', async () => {
            const params = createReloadParams({
                scriptLog: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 8,
                    executionStatusText: 'FinishedFail',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: {
                        hours: 1,
                        minutes: 30,
                        seconds: 25,
                    },
                    scriptLogSize: 1000,
                    scriptLogFull: ['Log line'],
                    executionDetailsConcatenated: 'Details\n',
                },
            });

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        fields: expect.objectContaining({
                            task_executionDuration_sec: 5425, // 1*3600 + 30*60 + 25
                            task_executionDuration_min: expect.closeTo(90.41667, 4),
                            task_executionDuration_h: expect.closeTo(1.50694, 4),
                        }),
                    }),
                ]),
            );
        });

        test('should include app tags when enabled', async () => {
            const params = createReloadParams();

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).toHaveProperty('appTag_Finance', 'true');
            expect(callArgs[0].tags).toHaveProperty('appTag_Critical', 'true');
        });

        test('should not include app tags when disabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.reloadTaskFailure.tag.dynamic.useAppTags') return false;
                if (key === 'Butler.influxDb.tag.static') return [];
                if (key === 'Butler.influxDb.reloadTaskFailure.tag.static') return [];
                if (key === 'Butler.influxDb.reloadTaskFailure.tag.dynamic.useTaskTags') return false;
                if (key === 'Butler.influxDb.reloadTaskFailure.tailScriptLogLines') return 25;
                return undefined;
            });

            const params = createReloadParams();

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('appTag_Finance');
        });

        test('should handle InfluxDB write error', async () => {
            mockInflux.writePoints.mockRejectedValueOnce(new Error('InfluxDB connection failed'));

            const params = createReloadParams();

            postReloadTaskFailureNotificationInfluxDb(params);
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

            postReloadTaskFailureNotificationInfluxDb(params);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('RELOAD TASK FAILED'));
        });
    });

    describe('postExternalProgramTaskFailureNotificationInfluxDb', () => {
        const createExternalProgramParams = (overrides = {}) => ({
            host: 'server2.example.com',
            user: 'DOMAIN/service',
            taskId: 'extprog-failed-789',
            taskName: 'Failed External Program',
            logTimeStamp: '2024-01-15T12:00:00.000Z',
            logLevel: 'ERROR',
            executionId: 'exec-ext-fail-999',
            logMessage: 'External program failed',
            qs_taskTags: ['Automation', 'Critical'],
            ...overrides,
        });

        test('should post external program task failure to InfluxDB', async () => {
            const params = createExternalProgramParams();

            postExternalProgramTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        measurement: 'external_program_task_failed',
                        tags: expect.objectContaining({
                            host: 'server2.example.com',
                            user: 'DOMAIN/service',
                            task_id: 'extprog-failed-789',
                            task_name: 'Failed External Program',
                            log_level: 'ERROR',
                            taskTag_Automation: 'true',
                            taskTag_Critical: 'true',
                        }),
                        fields: expect.objectContaining({
                            log_timestamp: '2024-01-15T12:00:00.000Z',
                            execution_id: 'exec-ext-fail-999',
                            log_message: 'External program failed',
                        }),
                    }),
                ]),
            );
        });

        test('should handle missing task tags', async () => {
            const params = createExternalProgramParams({ qs_taskTags: null });

            postExternalProgramTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('taskTag_Automation');
        });

        test('should not include task tags when disabled', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.influxDb.externalProgramTaskFailure.tag.dynamic.useTaskTags') return false;
                if (key === 'Butler.influxDb.tag.static') return [];
                if (key === 'Butler.influxDb.externalProgramTaskFailure.tag.static') return [];
                return undefined;
            });

            const params = createExternalProgramParams();

            postExternalProgramTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            const callArgs = mockInflux.writePoints.mock.calls[0][0];
            expect(callArgs[0].tags).not.toHaveProperty('taskTag_Automation');
        });

        test('should handle InfluxDB write error', async () => {
            mockInflux.writePoints.mockRejectedValueOnce(new Error('Network timeout'));

            const params = createExternalProgramParams();

            postExternalProgramTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error saving external program task notification to InfluxDB'),
            );
        });

        test('should handle exception during notification', async () => {
            mockGlobals.config.get.mockImplementationOnce(() => {
                throw new Error('Config access error');
            });

            const params = createExternalProgramParams();

            postExternalProgramTaskFailureNotificationInfluxDb(params);

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('EXTERNAL PROGRAM TASK FAILED'));
        });
    });

    describe('Edge cases', () => {
        test('should handle special characters in fields', async () => {
            const params = {
                host: 'server1.example.com',
                user: 'DOMAIN/user1',
                taskId: 'task-special',
                taskName: 'Task with ÅÄÖ & <special> "chars"',
                appId: 'app-special',
                appName: 'App with 日本語',
                logTimeStamp: '2024-01-15T10:00:00.000Z',
                logLevel: 'ERROR',
                executionId: 'exec-special',
                logMessage: 'Error: ÅÄÖ characters',
                appTags: [],
                taskTags: [],
                scriptLog: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 8,
                    executionStatusText: 'FinishedFail',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: { hours: 0, minutes: 0, seconds: 1 },
                    scriptLogSize: 100,
                    scriptLogFull: ['Special: ÅÄÖ'],
                    executionDetailsConcatenated: 'Details with ÅÄÖ\n',
                },
            };

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
        });

        test('should handle very large script logs', async () => {
            const largeLog = Array.from({ length: 10000 }, (_, i) => `Line ${i + 1}: ${'x'.repeat(200)}`);
            const params = {
                host: 'server1.example.com',
                user: 'DOMAIN/user1',
                taskId: 'task-large',
                taskName: 'Large Log Task',
                appId: 'app-large',
                appName: 'Large Log App',
                logTimeStamp: '2024-01-15T10:00:00.000Z',
                logLevel: 'ERROR',
                executionId: 'exec-large',
                logMessage: 'Failed',
                appTags: [],
                taskTags: [],
                scriptLog: {
                    executingNodeName: 'Node1',
                    executionStatusNum: 8,
                    executionStatusText: 'FinishedFail',
                    executionStartTime: {},
                    executionStopTime: {},
                    executionDuration: { hours: 0, minutes: 0, seconds: 1 },
                    scriptLogSize: 2000000,
                    scriptLogFull: largeLog,
                    executionDetailsConcatenated: 'Details\n',
                },
            };

            postReloadTaskFailureNotificationInfluxDb(params);
            await new Promise(process.nextTick);

            expect(mockInflux.writePoints).toHaveBeenCalled();
        });
    });
});
