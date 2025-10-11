import { jest } from '@jest/globals';

describe('success_preload', () => {
    let handleSuccessPreloadTask;
    let mockGlobals;
    let mockGetPreloadTaskExecutionResults;
    let mockGetTaskTags;
    let mockPostPreloadTaskSuccessNotificationInfluxDb;

    // Mock getPreloadTaskExecutionResults
    mockGetPreloadTaskExecutionResults = jest.fn();
    jest.unstable_mockModule('../../../../qrs_util/preload_task_execution_results.js', () => ({
        default: mockGetPreloadTaskExecutionResults,
    }));

    // Mock getTaskTags
    mockGetTaskTags = jest.fn();
    jest.unstable_mockModule('../../../../qrs_util/task_tag_util.js', () => ({
        default: mockGetTaskTags,
    }));

    // Mock postPreloadTaskSuccessNotificationInfluxDb
    mockPostPreloadTaskSuccessNotificationInfluxDb = jest.fn();
    jest.unstable_mockModule('../../../../lib/influxdb/task_success.js', () => ({
        postPreloadTaskSuccessNotificationInfluxDb: mockPostPreloadTaskSuccessNotificationInfluxDb,
    }));

    // Mock globals
    mockGlobals = {
        config: {
            has: jest.fn(() => true),
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.preloadTaskSuccess.enable': true,
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
        const module = await import('../success_preload.js');
        handleSuccessPreloadTask = module.handleSuccessPreloadTask;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper to create a valid UDP message array
    const createUdpMessage = (overrides = {}) => {
        return [
            '/scheduler-task-success/', // msg[0]: Message type
            'server.domain.com', // msg[1]: Host name
            'Preload Task', // msg[2]: Task name
            '', // msg[3]: App name (not used for preload)
            'INTERNAL\\sa_scheduler', // msg[4]: User
            'preload-task-123', // msg[5]: Task ID
            '', // msg[6]: App ID (not used for preload)
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
            taskType: 4, // Preload task type
            tags: [
                { id: 'tag-1', name: 'Production' },
                { id: 'tag-2', name: 'Preload' },
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
            taskName: 'Preload Task',
            executingNodeName: 'Node1',
            executionDetailsSorted: [
                {
                    timestampUTC: '2025-10-08T10:25:00.000Z',
                    timestampLocal1: '2025-10-08 10:25:00',
                    message: 'Task started',
                    detailsType: 1,
                },
                {
                    timestampUTC: '2025-10-08T10:30:00.000Z',
                    timestampLocal1: '2025-10-08 10:30:00',
                    message: 'Changing task state from Started to FinishedSuccess',
                    detailsType: 1,
                },
            ],
            executionDetailsConcatenated: '2025-10-08T10:25:00.000Z\tTask started\n...',
            executionStatusNum: 7,
            executionStatusText: 'FinishedSuccess',
            executionDuration: {
                hours: 0,
                minutes: 5,
                seconds: 30,
            },
            executionStartTime: {
                startTimeUTC: '2025-10-08T10:25:00.000Z',
                startTimeLocal1: '2025-10-08 10:25:00',
            },
            executionStopTime: {
                stopTimeUTC: '2025-10-08T10:30:00.000Z',
                stopTimeLocal1: '2025-10-08 10:30:00',
            },
            ...overrides,
        };
    };

    describe('with InfluxDB enabled', () => {
        test('should successfully process preload task success and store in InfluxDB', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();
            const taskExecutionResults = createTaskExecutionResults();

            mockGetPreloadTaskExecutionResults.mockResolvedValue(taskExecutionResults);
            mockGetTaskTags.mockResolvedValue(['Production', 'Preload']);

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('PRELOAD TASK SUCCESS: Preload task Preload Task'),
            );
            expect(mockGetPreloadTaskExecutionResults).toHaveBeenCalledWith('preload-task-123');
            expect(mockGetTaskTags).toHaveBeenCalledWith('preload-task-123');
            expect(mockPostPreloadTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'server.domain.com',
                    taskId: 'preload-task-123',
                    taskName: 'Preload Task',
                    taskInfo: taskExecutionResults,
                }),
            );
        });

        test('should warn and return false if task info cannot be retrieved', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetPreloadTaskExecutionResults.mockResolvedValue(null);

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGetPreloadTaskExecutionResults).toHaveBeenCalledTimes(1);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unable to get task info for preload task'));
        });
    });

    describe('with InfluxDB disabled', () => {
        beforeEach(() => {
            mockGlobals.config.get = jest.fn((key) => {
                const configMap = {
                    'Butler.influxDb.enable': false,
                    'Butler.influxDb.preloadTaskSuccess.enable': false,
                };
                return configMap[key] !== undefined ? configMap[key] : false;
            });
        });

        test('should process preload task success without storing in InfluxDB', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Not storing task info in InfluxDB'));
            expect(mockGetPreloadTaskExecutionResults).not.toHaveBeenCalled();
            expect(mockPostPreloadTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should handle errors gracefully and return false', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // Enable InfluxDB so the error path is reached
            mockGlobals.config.get = jest.fn((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.preloadTaskSuccess.enable': true,
                };
                return configMap[key] !== undefined ? configMap[key] : false;
            });

            mockGetPreloadTaskExecutionResults.mockRejectedValue(new Error('QRS connection failed'));

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error handling successful preload task'));
        });
    });

    describe('task metadata handling', () => {
        beforeEach(() => {
            // Ensure InfluxDB is enabled for these tests
            mockGlobals.config.get = jest.fn((key) => {
                const configMap = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.preloadTaskSuccess.enable': true,
                    'Butler.influxDb.preloadTaskSuccess.tag.dynamic.useTaskTags': true,
                };
                return configMap[key] !== undefined ? configMap[key] : false;
            });
        });

        test('should extract task tags from metadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                tags: [
                    { id: 'tag-1', name: 'Production' },
                    { id: 'tag-2', name: 'Preload' },
                    { id: 'tag-3', name: 'Critical' },
                ],
            });
            const taskExecutionResults = createTaskExecutionResults();

            mockGetPreloadTaskExecutionResults.mockResolvedValue(taskExecutionResults);
            mockGetTaskTags.mockResolvedValue(['Production', 'Preload', 'Critical']);

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            // Check that the tags were logged (with pretty-print formatting)
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Tags for task preload-task-123'));
        });

        test('should extract custom properties from metadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                customProperties: [
                    { definition: { name: 'team' }, value: 'IT-Ops' },
                    { definition: { name: 'priority' }, value: 'high' },
                    { definition: { name: 'region' }, value: 'EMEA' },
                ],
            });
            const taskExecutionResults = createTaskExecutionResults();

            mockGetPreloadTaskExecutionResults.mockResolvedValue(taskExecutionResults);
            mockGetTaskTags.mockResolvedValue(['Production']);

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostPreloadTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskCustomProperties: [
                        { name: 'team', value: 'IT-Ops' },
                        { name: 'priority', value: 'high' },
                        { name: 'region', value: 'EMEA' },
                    ],
                }),
            );
        });

        test('should handle empty tags and custom properties', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({
                tags: [],
                customProperties: [],
            });
            const taskExecutionResults = createTaskExecutionResults();

            mockGetPreloadTaskExecutionResults.mockResolvedValue(taskExecutionResults);
            mockGetTaskTags.mockResolvedValue([]);

            const result = await handleSuccessPreloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostPreloadTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    qs_taskTags: [],
                    qs_taskCustomProperties: [],
                }),
            );
        });
    });
});
