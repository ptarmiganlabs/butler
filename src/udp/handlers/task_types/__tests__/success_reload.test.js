import { jest } from '@jest/globals';

// Mock globals module
const mockGlobals = {
    logger: {
        verbose: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    config: {
        get: jest.fn(),
        has: jest.fn(),
    },
    sleep: jest.fn((ms) => Promise.resolve()),
    getErrorMessage: jest.fn((err) => err.message || err.toString()),
};

jest.unstable_mockModule('../../../../globals.js', () => ({
    default: mockGlobals,
}));

// Mock dependencies
const mockSendReloadTaskSuccessNotificationEmail = jest.fn();
jest.unstable_mockModule('../../../../lib/qseow/smtp.js', () => ({
    sendReloadTaskSuccessNotificationEmail: mockSendReloadTaskSuccessNotificationEmail,
}));

const mockGetScriptLog = jest.fn();
jest.unstable_mockModule('../../../../lib/qseow/scriptlog.js', () => ({
    getScriptLog: mockGetScriptLog,
}));

const mockGetReloadTaskExecutionResults = jest.fn();
jest.unstable_mockModule('../../../../qrs_util/reload_task_execution_results.js', () => ({
    getReloadTaskExecutionResults: mockGetReloadTaskExecutionResults,
}));

const mockGetTaskTags = jest.fn();
jest.unstable_mockModule('../../../../qrs_util/task_tag_util.js', () => ({
    default: mockGetTaskTags,
}));

const mockGetAppTags = jest.fn();
jest.unstable_mockModule('../../../../qrs_util/app_tag_util.js', () => ({
    default: mockGetAppTags,
}));

const mockGetAppMetadata = jest.fn();
jest.unstable_mockModule('../../../../qrs_util/app_metadata.js', () => ({
    default: mockGetAppMetadata,
}));

const mockIsCustomPropertyValueSet = jest.fn();
jest.unstable_mockModule('../../../../qrs_util/task_cp_util.js', () => ({
    isCustomPropertyValueSet: mockIsCustomPropertyValueSet,
}));

const mockPostReloadTaskSuccessNotificationInfluxDb = jest.fn();
jest.unstable_mockModule('../../../../lib/influxdb/task_success.js', () => ({
    postReloadTaskSuccessNotificationInfluxDb: mockPostReloadTaskSuccessNotificationInfluxDb,
}));

const { handleSuccessReloadTask } = await import('../success_reload.js');

describe('handleSuccessReloadTask', () => {
    const createUdpMessage = (overrides = {}) => {
        const defaults = {
            0: 'RELOAD_TASK_SUCCESS',
            1: 'server1.example.com',
            2: 'Test Reload Task',
            3: 'Test App',
            4: 'DOMAIN\\user1',
            5: 'task-123-reload',
            6: 'app-456',
            7: '2024-01-15T10:30:00.000Z',
            8: 'INFO',
            9: 'exec-789',
            10: overrides.logMessage !== undefined ? overrides.logMessage : 'Reload completed successfully',
        };

        return Object.keys(defaults).reduce((arr, key) => {
            arr[key] = overrides[key] !== undefined ? overrides[key] : defaults[key];
            return arr;
        }, []);
    };

    const createTaskMetadata = (overrides = {}) => ({
        taskType: 0,
        tags: overrides.tags || [
            { id: 'tag1', name: 'Production' },
            { id: 'tag2', name: 'Daily' },
        ],
        customProperties: overrides.customProperties || [
            {
                definition: { name: 'Environment' },
                value: 'Prod',
            },
        ],
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Default config setup - InfluxDB disabled
        mockGlobals.config.get.mockImplementation((key) => {
            const config = {
                'Butler.influxDb.enable': false,
                'Butler.influxDb.reloadTaskSuccess.enable': false,
                'Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable': false,
                'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable': false,
                'Butler.influxDb.reloadTaskSuccess.headScriptLogLines': 15,
                'Butler.influxDb.reloadTaskSuccess.tailScriptLogLines': 25,
                'Butler.emailNotification.enable': false,
                'Butler.emailNotification.reloadTaskSuccess.enable': false,
                'Butler.emailNotification.reloadTaskSuccess.headScriptLogLines': 15,
                'Butler.emailNotification.reloadTaskSuccess.tailScriptLogLines': 25,
            };
            return config[key];
        });

        mockGlobals.config.has.mockReturnValue(true);

        // Default script log mock
        mockGetScriptLog.mockResolvedValue({
            executingNodeName: 'node1',
            executionStatusNum: 4,
            executionStatusText: 'FinishedSuccess',
            executionStartTime: { start: '2024-01-15T10:25:00.000Z' },
            executionStopTime: { stop: '2024-01-15T10:30:00.000Z' },
            executionDuration: { hours: 0, minutes: 5, seconds: 0 },
            executionDetails: 'Task completed successfully',
            executionDetailsConcatenated: 'Task completed successfully',
            scriptLogSize: 1024,
            scriptLogSizeRows: 50,
            scriptLogSizeCharacters: 1024,
            scriptLogFull: ['Starting reload', 'Loading data', 'Processing...', 'Reload completed successfully'],
        });

        // Default app metadata
        mockGetAppMetadata.mockResolvedValue({
            id: 'app-456',
            name: 'Test App',
            tags: [{ name: 'AppTag1' }],
            customProperties: [
                {
                    definition: { name: 'AppProp' },
                    value: 'AppValue',
                },
            ],
        });
    });

    describe('Basic execution without InfluxDB', () => {
        test('should handle successful reload task without storing to InfluxDB', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('RELOAD TASK SUCCESS'));
            expect(mockPostReloadTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });

        test('should return false if app metadata retrieval fails', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetAppMetadata.mockResolvedValueOnce(false);

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Could not get app metadata'));
        });

        test('should return false if app metadata is empty', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetAppMetadata.mockResolvedValueOnce({});

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('App metadata not found or empty'));
        });
    });

    describe('InfluxDB - allReloadTasks enabled', () => {
        beforeEach(() => {
            mockGlobals.config.get.mockImplementation((key) => {
                const config = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable': false,
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags': true,
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags': true,
                    'Butler.emailNotification.enable': false,
                    'Butler.emailNotification.reloadTaskSuccess.enable': false,
                };
                return config[key];
            });

            mockGetReloadTaskExecutionResults.mockResolvedValue({
                executionDetailsSorted: [
                    {
                        message: 'Changing task state from Started to FinishedSuccess',
                    },
                ],
                executionDuration: {
                    hours: 0,
                    minutes: 5,
                    seconds: 30,
                },
            });

            mockGetAppTags.mockResolvedValue(['AppTag1', 'AppTag2']);
            mockGetTaskTags.mockResolvedValue(['TaskTag1', 'TaskTag2']);
        });

        test('should store to InfluxDB when allReloadTasks is enabled', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetReloadTaskExecutionResults).toHaveBeenCalledWith('task-123-reload');
            expect(mockPostReloadTaskSuccessNotificationInfluxDb).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: 'server1.example.com',
                    taskId: 'task-123-reload',
                    taskName: 'Test Reload Task',
                    appId: 'app-456',
                    appName: 'Test App',
                }),
            );
        });

        test('should retry getting task execution results up to 5 times', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // First 3 attempts return incomplete data
            mockGetReloadTaskExecutionResults
                .mockResolvedValueOnce({
                    executionDetailsSorted: [{ message: 'Some other message' }],
                    executionDuration: { hours: 0, minutes: 0, seconds: 0 },
                })
                .mockResolvedValueOnce({
                    executionDetailsSorted: [{ message: 'Still not ready' }],
                    executionDuration: { hours: 0, minutes: 0, seconds: 0 },
                })
                .mockResolvedValueOnce({
                    executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                    executionDuration: { hours: 0, minutes: 1, seconds: 15 },
                });

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGetReloadTaskExecutionResults).toHaveBeenCalledTimes(3);
            expect(mockGlobals.sleep).toHaveBeenCalledTimes(2);
            expect(mockGlobals.sleep).toHaveBeenCalledWith(1000);
        });

        test('should warn when duration is 0 seconds after retry', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetReloadTaskExecutionResults.mockResolvedValue({
                executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                executionDuration: { hours: 0, minutes: 0, seconds: 0 },
            });

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('duration is 0 seconds'));
        });

        test('should return false if unable to get task info after 5 attempts', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // All attempts return incomplete data
            mockGetReloadTaskExecutionResults.mockResolvedValue({
                executionDetailsSorted: [{ message: 'Some other message' }],
                executionDuration: { hours: 0, minutes: 0, seconds: 0 },
            });

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGetReloadTaskExecutionResults).toHaveBeenCalledTimes(5);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Unable to get task info'));
        });

        test('should return false if taskInfo is null', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetReloadTaskExecutionResults.mockResolvedValue(null);

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(false);
        });
    });

    describe('InfluxDB - byCustomProperty enabled', () => {
        beforeEach(() => {
            mockGlobals.config.get.mockImplementation((key) => {
                const config = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable': false,
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName': 'EnableInfluxDB',
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue': 'Yes',
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags': false,
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags': false,
                    'Butler.emailNotification.enable': false,
                    'Butler.emailNotification.reloadTaskSuccess.enable': false,
                };
                return config[key];
            });

            mockGetReloadTaskExecutionResults.mockResolvedValue({
                executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                executionDuration: { hours: 0, minutes: 2, seconds: 45 },
            });

            mockGetAppTags.mockResolvedValue([]);
            mockGetTaskTags.mockResolvedValue([]);
        });

        test('should store to InfluxDB when custom property is set to enabled value', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockIsCustomPropertyValueSet.mockResolvedValueOnce(true);

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockIsCustomPropertyValueSet).toHaveBeenCalledWith('task-123-reload', 'EnableInfluxDB', 'Yes', mockGlobals.logger);
            expect(mockPostReloadTaskSuccessNotificationInfluxDb).toHaveBeenCalled();
        });

        test('should not store to InfluxDB when custom property is not set', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockIsCustomPropertyValueSet.mockResolvedValueOnce(false);

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockPostReloadTaskSuccessNotificationInfluxDb).not.toHaveBeenCalled();
        });
    });

    describe('Email notifications', () => {
        beforeEach(() => {
            mockGlobals.config.get.mockImplementation((key) => {
                const config = {
                    'Butler.influxDb.enable': false,
                    'Butler.influxDb.reloadTaskSuccess.enable': false,
                    'Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable': false,
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable': false,
                    'Butler.emailNotification.enable': true,
                    'Butler.emailNotification.reloadTaskSuccess.enable': true,
                };
                return config[key];
            });
        });

        test('should send email notification when enabled', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockSendReloadTaskSuccessNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    hostName: 'server1.example.com',
                    taskName: 'Test Reload Task',
                    appName: 'Test App',
                    scriptLog: expect.objectContaining({
                        executingNodeName: 'node1',
                        executionStatusNum: 4,
                        executionStatusText: 'FinishedSuccess',
                    }),
                }),
            );
        });

        test('should send email notification with null scriptLog when retrieval fails', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            // Mock script log retrieval failure
            mockGetScriptLog.mockResolvedValueOnce(false);

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve script log'));
            expect(mockSendReloadTaskSuccessNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    scriptLog: null,
                }),
            );
        });

        test('should handle backslashes in user directory/username', async () => {
            const msg = createUdpMessage({ 4: 'DOMAIN\\\\user1' });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            expect(mockSendReloadTaskSuccessNotificationEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: 'DOMAIN\\user1',
                }),
            );
        });
    });

    describe('Metadata extraction', () => {
        test('should extract app tags from metadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetAppMetadata.mockResolvedValueOnce({
                id: 'app-456',
                name: 'Test App',
                tags: [{ name: 'Finance' }, { name: 'Critical' }],
                customProperties: [],
            });

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
            // Verify tags were extracted
            expect(mockGlobals.logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Finance'));
        });

        test('should extract app custom properties from metadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetAppMetadata.mockResolvedValueOnce({
                id: 'app-456',
                name: 'Test App',
                tags: [],
                customProperties: [
                    {
                        definition: { name: 'Department' },
                        value: 'Sales',
                    },
                    {
                        definition: { name: 'Owner' },
                        value: 'JohnDoe',
                    },
                ],
            });

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle null/undefined metadata gracefully', async () => {
            const msg = createUdpMessage();
            const taskMetadata = {
                taskType: 0,
                tags: null,
                customProperties: undefined,
            };

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle empty arrays in metadata', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata({ tags: [], customProperties: [] });

            mockGetAppMetadata.mockResolvedValueOnce({
                id: 'app-456',
                name: 'Test App',
                tags: [],
                customProperties: [],
            });

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });
    });

    describe('Error handling', () => {
        test('should handle error in main try-catch block', async () => {
            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            mockGetAppMetadata.mockRejectedValueOnce(new Error('Metadata fetch error'));

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Error handling successful reload task'));
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('Stack trace'));
        });

        test('should handle error when getting task tags', async () => {
            mockGlobals.config.get.mockImplementation((key) => {
                const config = {
                    'Butler.influxDb.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable': true,
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable': false,
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags': true,
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags': true,
                    'Butler.emailNotification.enable': false,
                    'Butler.emailNotification.reloadTaskSuccess.enable': false,
                };
                return config[key];
            });

            mockGetReloadTaskExecutionResults.mockResolvedValue({
                executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                executionDuration: { hours: 0, minutes: 1, seconds: 0 },
            });

            mockGetTaskTags.mockRejectedValueOnce(new Error('Tag fetch failed'));

            const msg = createUdpMessage();
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        test('should handle empty log message', async () => {
            const msg = createUdpMessage({ logMessage: '' });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle very long task and app names', async () => {
            const longName = 'A'.repeat(500);
            const msg = createUdpMessage({
                2: longName, // task name
                3: longName, // app name
            });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle special characters in names', async () => {
            const msg = createUdpMessage({
                2: 'Task with ÅÄÖ & <special> "chars"',
                3: 'App with 日本語 и русский',
            });
            const taskMetadata = createTaskMetadata();

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });

        test('should handle task metadata with missing tags property', async () => {
            const msg = createUdpMessage();
            const taskMetadata = {
                taskType: 0,
                customProperties: [],
            };

            const result = await handleSuccessReloadTask(msg, taskMetadata);

            expect(result).toBe(true);
        });
    });
});
