import { jest } from '@jest/globals';

describe('externalprogram_task_execution_results', () => {
    let getExternalProgramTaskExecutionResults;
    let mockQrsClient;
    let mockGlobals;

    beforeEach(async () => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock QrsClient
        mockQrsClient = {
            Get: jest.fn(),
        };

        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({
            default: jest.fn(() => mockQrsClient),
        }));

        // Mock globals
        mockGlobals = {
            config: {
                get: jest.fn((key) => {
                    const configMap = {
                        'Butler.configQRS.host': 'qlik-server.example.com',
                        'Butler.configQRS.port': 4242,
                    };
                    return configMap[key];
                }),
            },
            configQRS: {
                certPaths: {
                    certPath: '/path/to/cert.pem',
                    keyPath: '/path/to/key.pem',
                },
            },
            getQRSHttpHeaders: jest.fn(() => ({
                'X-Qlik-User': 'UserDirectory=INTERNAL;UserId=sa_api',
            })),
            logger: {
                verbose: jest.fn(),
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            },
        };

        await jest.unstable_mockModule('../../globals.js', () => ({
            default: mockGlobals,
        }));

        // Import the module under test
        const module = await import('../externalprogram_task_execution_results.js');
        getExternalProgramTaskExecutionResults = module.default;
    });

    afterEach(() => {
        jest.resetModules();
    });

    const createMockQrsResponse = (overrides = {}) => ({
        body: {
            id: overrides.taskId || 'task-123',
            name: overrides.taskName || 'External Program Task',
            operational: {
                lastExecutionResult: {
                    id: overrides.executionResultId || 'exec-456',
                    executingNodeName: overrides.executingNodeName || 'node1.example.com',
                    status: overrides.status !== undefined ? overrides.status : 7, // 7 = FinishedSuccess
                    duration: overrides.duration !== undefined ? overrides.duration : 125000, // 2 minutes 5 seconds
                    startTime: overrides.startTime || '2025-10-09T10:00:00.000Z',
                    stopTime: overrides.stopTime || '2025-10-09T10:02:05.000Z',
                    details: overrides.details || [
                        {
                            detailCreatedDate: '2025-10-09T10:00:00.000Z',
                            message: 'Changing task state from NeverStarted to Triggered',
                        },
                        {
                            detailCreatedDate: '2025-10-09T10:00:01.000Z',
                            message: 'Changing task state from Triggered to Started',
                        },
                        {
                            detailCreatedDate: '2025-10-09T10:02:05.000Z',
                            message: 'Changing task state from Started to FinishedSuccess',
                        },
                    ],
                    ...overrides.lastExecutionResult,
                },
            },
        },
    });

    describe('successful execution', () => {
        test('should retrieve and format external program task execution results', async () => {
            const mockResponse = createMockQrsResponse();
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result).toBeDefined();
            expect(result.executionResultId).toBe('exec-456');
            expect(result.taskName).toBe('External Program Task');
            expect(result.executingNodeName).toBe('node1.example.com');
            expect(result.executionStatusNum).toBe(7);
            expect(result.executionStatusText).toBe('FinishedSuccess');
            expect(mockQrsClient.Get).toHaveBeenCalledWith('externalprogramtask/task-123');
        });

        test('should sort execution details chronologically', async () => {
            const mockResponse = createMockQrsResponse({
                details: [
                    {
                        detailCreatedDate: '2025-10-09T10:02:05.000Z',
                        message: 'Third message',
                    },
                    {
                        detailCreatedDate: '2025-10-09T10:00:00.000Z',
                        message: 'First message',
                    },
                    {
                        detailCreatedDate: '2025-10-09T10:01:00.000Z',
                        message: 'Second message',
                    },
                ],
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDetailsSorted).toHaveLength(3);
            expect(result.executionDetailsSorted[0].message).toBe('First message');
            expect(result.executionDetailsSorted[1].message).toBe('Second message');
            expect(result.executionDetailsSorted[2].message).toBe('Third message');
        });

        test('should concatenate execution details into a single string', async () => {
            const mockResponse = createMockQrsResponse();
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDetailsConcatenated).toContain('Changing task state from NeverStarted to Triggered');
            expect(result.executionDetailsConcatenated).toContain('Changing task state from Triggered to Started');
            expect(result.executionDetailsConcatenated).toContain('Changing task state from Started to FinishedSuccess');
            expect(result.executionDetailsConcatenated).toMatch(/2025-10-09T10:00:00.000Z\t/);
        });

        test('should calculate execution duration correctly', async () => {
            const mockResponse = createMockQrsResponse({
                duration: 185000, // 3 minutes 5 seconds = 185000 ms
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDuration).toBeDefined();
            expect(result.executionDuration.hours).toBe(0);
            expect(result.executionDuration.minutes).toBe(3);
            expect(result.executionDuration.seconds).toBe(5);
        });

        test('should floor seconds in execution duration', async () => {
            const mockResponse = createMockQrsResponse({
                duration: 5999, // 5.999 seconds
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDuration.seconds).toBe(5);
        });

        test('should handle long duration (hours)', async () => {
            const mockResponse = createMockQrsResponse({
                duration: 7384000, // 2 hours 3 minutes 4 seconds
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDuration.hours).toBe(2);
            expect(result.executionDuration.minutes).toBe(3);
            expect(result.executionDuration.seconds).toBe(4);
        });

        test('should parse start and stop times correctly', async () => {
            const mockResponse = createMockQrsResponse({
                startTime: '2025-10-09T14:30:00.000Z',
                stopTime: '2025-10-09T14:35:00.000Z',
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionStartTime).toBeDefined();
            expect(result.executionStopTime).toBeDefined();
            expect(result.executionStartTime.year).toBe(2025);
            expect(result.executionStartTime.month).toBe(10);
            expect(result.executionStartTime.day).toBe(9);
            expect(result.executionStopTime.year).toBe(2025);
        });

        test('should handle different task statuses', async () => {
            const testCases = [
                { status: 0, expected: 'NeverStarted' },
                { status: 1, expected: 'Triggered' },
                { status: 2, expected: 'Started' },
                { status: 3, expected: 'Queued' },
                { status: 4, expected: 'AbortInitiated' },
                { status: 5, expected: 'Aborting' },
                { status: 6, expected: 'Aborted' },
                { status: 7, expected: 'FinishedSuccess' },
                { status: 8, expected: 'FinishedFail' },
                { status: 9, expected: 'Skipped' },
                { status: 10, expected: 'Retry' },
                { status: 11, expected: 'Error' },
                { status: 12, expected: 'Reset' },
            ];

            for (const testCase of testCases) {
                const mockResponse = createMockQrsResponse({ status: testCase.status });
                mockQrsClient.Get.mockResolvedValue(mockResponse);

                const result = await getExternalProgramTaskExecutionResults('task-123');

                expect(result.executionStatusNum).toBe(testCase.status);
                expect(result.executionStatusText).toBe(testCase.expected);
            }
        });
    });

    describe('error handling', () => {
        test('should return false when QRS API call fails', async () => {
            mockQrsClient.Get.mockRejectedValue(new Error('QRS API error'));

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error getting external program task execution results: QRS API error'),
            );
        });

        test('should handle error without message property', async () => {
            const errorWithoutMessage = { code: 'ECONNREFUSED', errno: -111 };
            mockQrsClient.Get.mockRejectedValue(errorWithoutMessage);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error getting external program task execution results:'),
            );
        });

        test('should handle network timeout', async () => {
            mockQrsClient.Get.mockRejectedValue(new Error('ETIMEDOUT'));

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result).toBe(false);
        });

        test('should handle invalid task ID', async () => {
            mockQrsClient.Get.mockRejectedValue(new Error('Task not found'));

            const result = await getExternalProgramTaskExecutionResults('invalid-id');

            expect(result).toBe(false);
        });
    });

    describe('edge cases', () => {
        test('should handle empty execution details array', async () => {
            const mockResponse = createMockQrsResponse({
                details: [],
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDetailsSorted).toEqual([]);
            expect(result.executionDetailsConcatenated).toBe('');
        });

        test('should handle single execution detail', async () => {
            const mockResponse = createMockQrsResponse({
                details: [
                    {
                        detailCreatedDate: '2025-10-09T10:00:00.000Z',
                        message: 'Single message',
                    },
                ],
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDetailsSorted).toHaveLength(1);
            expect(result.executionDetailsConcatenated).toContain('Single message');
        });

        test('should handle zero duration', async () => {
            const mockResponse = createMockQrsResponse({
                duration: 0,
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDuration.hours).toBe(0);
            expect(result.executionDuration.minutes).toBe(0);
            expect(result.executionDuration.seconds).toBe(0);
        });

        test('should handle execution details with identical timestamps', async () => {
            const mockResponse = createMockQrsResponse({
                details: [
                    {
                        detailCreatedDate: '2025-10-09T10:00:00.000Z',
                        message: 'Message A',
                    },
                    {
                        detailCreatedDate: '2025-10-09T10:00:00.000Z',
                        message: 'Message B',
                    },
                ],
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.executionDetailsSorted).toHaveLength(2);
            // Both messages should be preserved
            expect(result.executionDetailsConcatenated).toContain('Message A');
            expect(result.executionDetailsConcatenated).toContain('Message B');
        });

        test('should handle task with special characters in name', async () => {
            const mockResponse = createMockQrsResponse({
                taskName: 'Task with "quotes" & <special> chars',
            });
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const result = await getExternalProgramTaskExecutionResults('task-123');

            expect(result.taskName).toBe('Task with "quotes" & <special> chars');
        });
    });

    describe('QRS client configuration', () => {
        test('should configure QRS client with correct parameters', async () => {
            const mockResponse = createMockQrsResponse();
            mockQrsClient.Get.mockResolvedValue(mockResponse);

            const QrsClientMock = (await import('../../lib/qrs_client.js')).default;

            await getExternalProgramTaskExecutionResults('task-123');

            expect(QrsClientMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    hostname: 'qlik-server.example.com',
                    portNumber: 4242,
                    certificates: {
                        certFile: '/path/to/cert.pem',
                        keyFile: '/path/to/key.pem',
                    },
                    headers: expect.objectContaining({
                        'X-Qlik-User': 'UserDirectory=INTERNAL;UserId=sa_api',
                    }),
                }),
            );
        });
    });
});
