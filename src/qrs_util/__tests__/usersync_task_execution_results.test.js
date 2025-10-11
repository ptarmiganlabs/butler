import { jest } from '@jest/globals';

// Mock globals module
const mockGlobals = {
    logger: {
        debug: jest.fn(),
        verbose: jest.fn(),
        error: jest.fn(),
    },
    config: {
        get: jest.fn(),
    },
    configQRS: {
        certPaths: {
            certPath: '/path/to/cert.pem',
            keyPath: '/path/to/key.pem',
        },
    },
    getQRSHttpHeaders: jest.fn(() => ({
        'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
    })),
    getErrorMessage: jest.fn((err) => err.message || err.toString()),
};

jest.unstable_mockModule('../../globals.js', () => ({
    default: mockGlobals,
}));

// Mock QrsClient
const mockQrsClient = {
    Get: jest.fn(),
};

jest.unstable_mockModule('../../lib/qrs_client.js', () => ({
    default: jest.fn(() => mockQrsClient),
}));

const { getUserSyncTaskExecutionResults } = await import('../usersync_task_execution_results.js');
const QrsClient = (await import('../../lib/qrs_client.js')).default;

describe('getUserSyncTaskExecutionResults', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default config mock
        mockGlobals.config.get.mockImplementation((key) => {
            const config = {
                'Butler.configQRS.host': 'qlik-server.com',
                'Butler.configQRS.port': 4242,
            };
            return config[key];
        });
    });

    describe('Successful execution', () => {
        test('should retrieve user sync task execution results successfully', async () => {
            const userSyncTaskId = 'task-123';
            const mockResponse = {
                body: {
                    name: 'Test User Sync Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-456',
                            executingNodeName: 'Node1',
                            status: 7, // FinishedSuccess
                            duration: 120000, // 2 minutes in milliseconds
                            startTime: '2024-01-15T10:30:00.000Z',
                            stopTime: '2024-01-15T10:32:00.000Z',
                            details: [
                                {
                                    detailCreatedDate: '2024-01-15T10:30:00.000Z',
                                    message: 'Starting user sync',
                                    detailsType: 'Info',
                                },
                                {
                                    detailCreatedDate: '2024-01-15T10:32:00.000Z',
                                    message: 'User sync completed',
                                    detailsType: 'Info',
                                },
                            ],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result).toBeDefined();
            expect(result.executionResultId).toBe('exec-456');
            expect(result.taskName).toBe('Test User Sync Task');
            expect(result.executingNodeName).toBe('Node1');
            expect(result.executionStatusNum).toBe(7);
            expect(result.executionStatusText).toBe('FinishedSuccess');
            expect(result.executionDetailsSorted).toHaveLength(2);
            expect(result.executionDuration).toBeDefined();
            expect(result.executionDuration.minutes).toBe(2);
            expect(mockQrsClient.Get).toHaveBeenCalledWith(`usersynctask/${userSyncTaskId}`);
        });

        test('should handle task with 1753 start time (never started)', async () => {
            const userSyncTaskId = 'task-789';
            const mockResponse = {
                body: {
                    name: 'Never Run Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-999',
                            executingNodeName: 'Node1',
                            status: 0, // NeverStarted
                            duration: 0,
                            startTime: '1753-01-01T00:00:00.000Z',
                            stopTime: '1753-01-01T00:00:00.000Z',
                            details: [],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result).toBeDefined();
            expect(result.executionStartTime.startTimeUTC).toBe('-');
            expect(result.executionStartTime.startTimeLocal1).toBe('-');
            expect(result.executionStopTime.stopTimeUTC).toBe('-');
            expect(result.executionStopTime.stopTimeLocal1).toBe('-');
        });

        test('should sort execution details chronologically', async () => {
            const userSyncTaskId = 'task-sort';
            const mockResponse = {
                body: {
                    name: 'Sort Test Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-sort',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 60000,
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:01:00.000Z',
                            details: [
                                {
                                    detailCreatedDate: '2024-01-15T10:00:30.000Z',
                                    message: 'Middle event',
                                    detailsType: 'Info',
                                },
                                {
                                    detailCreatedDate: '2024-01-15T10:00:00.000Z',
                                    message: 'First event',
                                    detailsType: 'Info',
                                },
                                {
                                    detailCreatedDate: '2024-01-15T10:01:00.000Z',
                                    message: 'Last event',
                                    detailsType: 'Info',
                                },
                            ],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result.executionDetailsSorted).toHaveLength(3);
            expect(result.executionDetailsSorted[0].message).toBe('First event');
            expect(result.executionDetailsSorted[1].message).toBe('Middle event');
            expect(result.executionDetailsSorted[2].message).toBe('Last event');
        });

        test('should concatenate execution details into single string', async () => {
            const userSyncTaskId = 'task-concat';
            const mockResponse = {
                body: {
                    name: 'Concat Test Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-concat',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 30000,
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:00:30.000Z',
                            details: [
                                {
                                    detailCreatedDate: '2024-01-15T10:00:00.000Z',
                                    message: 'Step 1',
                                    detailsType: 'Info',
                                },
                                {
                                    detailCreatedDate: '2024-01-15T10:00:30.000Z',
                                    message: 'Step 2',
                                    detailsType: 'Info',
                                },
                            ],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result.executionDetailsConcatenated).toContain('Step 1');
            expect(result.executionDetailsConcatenated).toContain('Step 2');
            expect(result.executionDetailsConcatenated).toContain('2024-01-15T10:00:00.000Z');
        });

        test('should handle execution details with 1753 dates', async () => {
            const userSyncTaskId = 'task-1753-details';
            const mockResponse = {
                body: {
                    name: 'Old Date Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-old',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 60000,
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:01:00.000Z',
                            details: [
                                {
                                    detailCreatedDate: '1753-01-01T00:00:00.000Z',
                                    message: 'Old timestamp event',
                                    detailsType: 'Info',
                                },
                            ],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result.executionDetailsSorted[0].timestampUTC).toBe('-');
            expect(result.executionDetailsSorted[0].timestampLocal1).toBe('-');
            expect(result.executionDetailsSorted[0].message).toBe('Old timestamp event');
        });

        test('should handle different task statuses', async () => {
            const statusTests = [
                { num: 0, text: 'NeverStarted' },
                { num: 1, text: 'Triggered' },
                { num: 4, text: 'AbortInitiated' },
                { num: 8, text: 'FinishedFail' },
                { num: 11, text: 'Error' },
            ];

            for (const status of statusTests) {
                jest.clearAllMocks();
                const mockResponse = {
                    body: {
                        name: `Task Status ${status.text}`,
                        operational: {
                            lastExecutionResult: {
                                id: `exec-${status.num}`,
                                executingNodeName: 'Node1',
                                status: status.num,
                                duration: 0,
                                startTime: '2024-01-15T10:00:00.000Z',
                                stopTime: '2024-01-15T10:00:00.000Z',
                                details: [],
                            },
                        },
                    },
                };

                mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

                const result = await getUserSyncTaskExecutionResults(`task-${status.num}`);

                expect(result.executionStatusNum).toBe(status.num);
                expect(result.executionStatusText).toBe(status.text);
            }
        });
    });

    describe('Error handling', () => {
        test('should return false on QRS API error', async () => {
            const userSyncTaskId = 'task-error';
            const error = new Error('QRS API connection failed');

            mockQrsClient.Get.mockRejectedValueOnce(error);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('GET USER SYNC TASK EXECUTION RESULTS'));
        });

        test('should handle network timeout error', async () => {
            const userSyncTaskId = 'task-timeout';
            const error = new Error('Network timeout');

            mockQrsClient.Get.mockRejectedValueOnce(error);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });

        test('should handle invalid response structure', async () => {
            const userSyncTaskId = 'task-invalid';
            const mockResponse = {
                body: {
                    // Missing operational property
                    name: 'Invalid Task',
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        test('should handle empty execution details array', async () => {
            const userSyncTaskId = 'task-empty-details';
            const mockResponse = {
                body: {
                    name: 'Empty Details Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-empty',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 0,
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:00:00.000Z',
                            details: [],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result).toBeDefined();
            expect(result.executionDetailsSorted).toEqual([]);
            expect(result.executionDetailsConcatenated).toBe('');
        });

        test('should handle very long task duration', async () => {
            const userSyncTaskId = 'task-long-duration';
            const mockResponse = {
                body: {
                    name: 'Long Duration Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-long',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 7200000, // 2 hours
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T12:00:00.000Z',
                            details: [],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result.executionDuration.hours).toBe(2);
            expect(result.executionDuration.minutes).toBe(0);
            expect(result.executionDuration.seconds).toBe(0);
        });

        test('should handle task with special characters in name', async () => {
            const userSyncTaskId = 'task-special';
            const mockResponse = {
                body: {
                    name: 'Task with ÅÄÖ & <special> "chars"',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-special',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 1000,
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:00:01.000Z',
                            details: [],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(result.taskName).toBe('Task with ÅÄÖ & <special> "chars"');
        });

        test('should floor execution duration seconds', async () => {
            const userSyncTaskId = 'task-floor';
            const mockResponse = {
                body: {
                    name: 'Floor Test Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-floor',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 1999, // 1.999 seconds
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:00:01.999Z',
                            details: [],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            const result = await getUserSyncTaskExecutionResults(userSyncTaskId);

            // Seconds should be floored
            expect(Number.isInteger(result.executionDuration.seconds)).toBe(true);
        });
    });

    describe('Logging', () => {
        test('should log debug information during execution', async () => {
            const userSyncTaskId = 'task-logging';
            const mockResponse = {
                body: {
                    name: 'Logging Test Task',
                    operational: {
                        lastExecutionResult: {
                            id: 'exec-log',
                            executingNodeName: 'Node1',
                            status: 7,
                            duration: 1000,
                            startTime: '2024-01-15T10:00:00.000Z',
                            stopTime: '2024-01-15T10:00:01.000Z',
                            details: [],
                        },
                    },
                },
            };

            mockQrsClient.Get.mockResolvedValueOnce(mockResponse);

            await getUserSyncTaskExecutionResults(userSyncTaskId);

            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(expect.stringContaining('userSyncTaskId'));
            expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        });
    });
});
