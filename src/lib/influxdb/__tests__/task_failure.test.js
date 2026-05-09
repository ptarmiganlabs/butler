import { jest } from '@jest/globals';

describe('lib/influxdb/task_failure', () => {
    let postReloadTaskFailureNotificationInfluxDb;
    let mockLogger;
    let mockInfluxWritePoints;
    let mockCloneDeep;

    const mockReloadParams = {
        host: 'sense-server-01',
        user: 'DOMAIN\\testuser',
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        taskName: 'Test Reload Task',
        appId: 'app-001',
        appName: 'Test App',
        logTimeStamp: '2024-01-15T10:30:00.000Z',
        logLevel: 'ERROR',
        executionId: 'exec-123',
        logMessage: 'Task failed with error',
        scriptLog: null,
        appTags: ['team', 'engineering'],
        taskTags: ['priority', 'high'],
    };

    beforeAll(async () => {
        mockInfluxWritePoints = jest.fn().mockReturnValue({
            then: (cb) => {
                cb();
                return { catch: () => {} };
            },
        });

        mockCloneDeep = jest.fn((obj) => JSON.parse(JSON.stringify(obj)));

        const mockInflux = {
            writePoints: mockInfluxWritePoints,
        };

        mockLogger = {
            info: jest.fn(),
            verbose: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            silly: jest.fn(),
            error: jest.fn(),
        };

        const mockGlobals = {
            config: {
                get: jest.fn((key) => {
                    if (key === 'Butler.influxDb.tag.static') {
                        return [{ name: 'env', value: 'production' }];
                    }
                    if (key === 'Butler.influxDb.reloadTaskFailure.tailScriptLogLines') return 100;
                    if (key === 'Butler.influxDb.reloadTaskFailure.tag.dynamic.useAppTags') return true;
                    if (key === 'Butler.influxDb.reloadTaskFailure.tag.dynamic.useTaskTags') return true;
                    return null;
                }),
            },
            logger: mockLogger,
            influx: mockInflux,
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        await jest.unstable_mockModule('lodash', () => ({
            default: { cloneDeep: mockCloneDeep },
        }));

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../task_failure.js');
        postReloadTaskFailureNotificationInfluxDb = module.postReloadTaskFailureNotificationInfluxDb;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sends task failure data to InfluxDB', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint).toHaveLength(1);
        expect(datapoint[0].measurement).toBe('reload_task_failed');
    });

    test('includes correct tags', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.host).toBe('sense-server-01');
        expect(datapoint[0].tags.user).toBe('DOMAIN\\testuser');
        expect(datapoint[0].tags.task_id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(datapoint[0].tags.task_name).toBe('Test Reload Task');
        expect(datapoint[0].tags.env).toBe('production');
    });

    test('includes dynamic app and task tags', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.appTag_team).toBe('true');
        expect(datapoint[0].tags.appTag_engineering).toBe('true');
        expect(datapoint[0].tags.taskTag_priority).toBe('true');
        expect(datapoint[0].tags.taskTag_high).toBe('true');
    });

    test('includes correct fields', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.log_timestamp).toBe('2024-01-15T10:30:00.000Z');
        expect(datapoint[0].fields.execution_id).toBe('exec-123');
        expect(datapoint[0].fields.log_message).toBe('Task failed with error');
    });

    test('handles missing script log gracefully', () => {
        const paramsNoScript = { ...mockReloadParams, scriptLog: null };
        postReloadTaskFailureNotificationInfluxDb(paramsNoScript);

        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Script log data is not available')
        );

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.task_executingNodeName).toBe('unknown');
        expect(datapoint[0].fields.task_scriptLogSize).toBe(0);
    });

    test('includes script log details when available', () => {
        const paramsWithScript = {
            ...mockReloadParams,
            scriptLog: {
                executingNodeName: 'node1',
                executionStatusNum: 8,
                executionStatusText: 'FinishedFail',
                executionDuration: { hours: 0, minutes: 1, seconds: 30 },
                executionStartTime: { hour: 10, minute: 30 },
                executionStopTime: { hour: 10, minute: 31 },
                scriptLogFull: ['line1', 'line2'],
                scriptLogTailCount: 2,
                scriptLogSize: 2,
                executionDetailsConcatenated: 'Test execution details',
            },
        };

        postReloadTaskFailureNotificationInfluxDb(paramsWithScript);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.task_executingNodeName).toBe('node1');
        expect(datapoint[0].tags.task_executionStatusNum).toBe(8);
        expect(datapoint[0].fields.task_scriptLogSize).toBe(2);
    });

    test('logs verbose message on success', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        expect(mockLogger.verbose).toHaveBeenCalledWith(
            expect.stringContaining('RELOAD TASK FAILED: Sent reload task notification to InfluxDB')
        );
    });

    test('logs silly message with datapoint', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        expect(mockLogger.silly).toHaveBeenCalled();
        expect(mockLogger.silly.mock.calls[0][0]).toContain('Influxdb datapoint');
    });

    test('handles InfluxDB write error', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn(() => ({
                catch: jest.fn((cb) => {
                    cb(new Error('InfluxDB write failed'));
                }),
            })),
        });

        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error.mock.calls[0][0]).toContain('Error saving reload task notification to InfluxDB');
    });

    test('deep clones datapoint before writing', () => {
        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        expect(mockCloneDeep).toHaveBeenCalled();
    });

    test('handles missing static tags gracefully', () => {
        const mockGlobals = {
            config: {
                get: jest.fn(() => null),
            },
            logger: mockLogger,
            influx: { writePoints: mockInfluxWritePoints },
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        postReloadTaskFailureNotificationInfluxDb(mockReloadParams);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
    });
});
