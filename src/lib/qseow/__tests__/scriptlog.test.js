import { jest } from '@jest/globals';

// Mocks for QRS, axios, https, luxon formatting is not critical here.
const qrsGetMock = jest.fn();
class QrsClientMock {
    constructor() {}
    Get(path) {
        return qrsGetMock(path);
    }
}
jest.unstable_mockModule('../../qrs_client.js', () => ({ default: QrsClientMock }));

const axiosReqMock = jest.fn();
jest.unstable_mockModule('axios', () => ({ default: { request: axiosReqMock } }));

// https.Agent used only for construction
class Agent {
    constructor() {}
}
jest.unstable_mockModule('https', () => ({ default: { Agent } }));

// fs interactions
const fsWrites = { mkdir: [], write: [] };
let fsMkdirBehavior = null; // null = normal, 'error' = throw error
jest.unstable_mockModule('fs', () => ({
    default: {
        mkdirSync: (...args) => {
            if (fsMkdirBehavior === 'error') {
                throw new Error('Permission denied');
            }
            return fsWrites.mkdir.push(args);
        },
        writeFileSync: (...args) => fsWrites.write.push(args),
    },
}));

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), verbose: jest.fn() };
const globalsMock = {
    logger,
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    config: {
        get: (k) => ({ 'Butler.configQRS.host': 'sense.local' })[k] ?? undefined,
    },
    configQRS: {
        host: 'sense.local',
        port: 4242,
        cert: 'CERT',
        key: 'KEY',
        certPaths: { certPath: '/cert', keyPath: '/key' },
    },
    getEngineHttpHeaders: () => ({ 'x-qlik-user': 'foo' }),
    getQRSHttpHeaders: () => ({ 'X-QRS': '1' }),
};
jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

let scriptlog;

beforeAll(async () => {
    scriptlog = await import('../scriptlog.js');
});

beforeEach(() => {
    jest.clearAllMocks();
    fsWrites.mkdir.length = 0;
    fsWrites.write.length = 0;
});

function makeResult1(overrides = {}) {
    return {
        body: {
            name: 'Test Task',
            operational: {
                lastExecutionResult: {
                    id: 'exec-result-1',
                    fileReferenceID: 'ref-1',
                    executingNodeName: 'node1',
                    details: [
                        { detailCreatedDate: '2025-08-24T10:00:00Z', message: 'Started', detailsType: 1 },
                        { detailCreatedDate: '2025-08-24T10:05:00Z', message: 'Done', detailsType: 2 },
                    ],
                    status: 7,
                    scriptLogSize: 123,
                    duration: 60000,
                    startTime: '2025-08-24T10:00:00Z',
                    stopTime: '2025-08-24T10:01:00Z',
                },
            },
        },
        ...overrides,
    };
}

test('getReloadTaskExecutionResults returns structured info', async () => {
    qrsGetMock.mockResolvedValueOnce(makeResult1());
    const res = await scriptlog.getReloadTaskExecutionResults('task-1');
    expect(res.executionStatusText).toBe('FinishedSuccess');
    expect(res.executionDetailsConcatenated).toContain('Started');
    expect(res.executionDuration).toMatchObject({ minutes: 1, seconds: 0 });
});

test('getScriptLog returns head/tail and sizes when fileReference is valid', async () => {
    qrsGetMock.mockResolvedValueOnce(makeResult1()).mockResolvedValueOnce({ body: { value: 'file-uuid' } });
    axiosReqMock.mockResolvedValueOnce({ status: 200, data: 'row1\r\nrow2\r\nrow3\r\nrow4' });
    const res = await scriptlog.getScriptLog('task-1', 2, 2, 3, 2000, 0); // downloadDelayMs=0 for tests
    expect(res.scriptLogHead).toBe('row1\r\nrow2');
    expect(res.scriptLogTail).toBe('row3\r\nrow4');
    expect(res.scriptLogSizeRows).toBe(4);
    expect(res.scriptLogSizeCharacters).toBeGreaterThan(0);
});

test('getScriptLog returns no-log structure when fileReference is all zeros', async () => {
    const res1 = makeResult1();
    res1.body.operational.lastExecutionResult.fileReferenceID = '00000000-0000-0000-0000-000000000000';
    qrsGetMock.mockResolvedValueOnce(res1);
    const res = await scriptlog.getScriptLog('task-1', 1, 1, 1, 2000, 0); // maxRetries=1 to avoid retry, downloadDelayMs=0 for tests
    expect(res.scriptLogFull).toBe('');
    expect(res.scriptLogSize).toBe(0);
});

test('failedTaskStoreLogOnDisk returns false when scriptLog missing/empty and then writes file when present', async () => {
    const rp = {
        logTimeStamp: '2025-08-24 12:34:56',
        appId: 'app1',
        taskId: 't1',
        scriptLog: {},
    };
    globalsMock.config.get = (k) => ({ 'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory': '/tmp/logs' })[k];
    let ok = await scriptlog.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(false);

    rp.scriptLog = { scriptLogFull: ['a', 'b', 'c'] };
    ok = await scriptlog.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(true);
    // mkdirSync called twice (once per invocation) and writeFileSync once (only on success)
    expect(fsWrites.mkdir.length).toBe(2);
    expect(fsWrites.write.length).toBe(1);
});

test('getReloadTaskExecutionResults handles error cases', async () => {
    qrsGetMock.mockRejectedValueOnce(new Error('QRS connection failed'));
    const res = await scriptlog.getReloadTaskExecutionResults('task-1');
    expect(res).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('QRS connection failed'));
});

test('getScriptLog handles error cases', async () => {
    qrsGetMock.mockRejectedValueOnce(new Error('QRS error'));
    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 2000, 0); // downloadDelayMs=0 for tests
    expect(res).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('QRS error'));
});

test('getReloadTaskExecutionResults handles 1753 dates (null dates)', async () => {
    const result = makeResult1();
    result.body.operational.lastExecutionResult.startTime = '1753-01-01T00:00:00.000Z';
    result.body.operational.lastExecutionResult.stopTime = '1753-01-01T00:00:00.000Z';
    result.body.operational.lastExecutionResult.details = [
        { detailCreatedDate: '1753-01-01T00:00:00.000Z', message: 'Old entry', detailsType: 1 },
    ];
    qrsGetMock.mockResolvedValueOnce(result);

    const res = await scriptlog.getReloadTaskExecutionResults('task-1');
    expect(res.executionStartTime.startTimeUTC).toBe('-');
    expect(res.executionStopTime.stopTimeUTC).toBe('-');
    expect(res.executionDetailsSorted[0].timestampUTC).toBe('-');
});

test('getScriptLog handles axios errors', async () => {
    // Provide mocks for all 3 retry attempts - each attempt needs QRS calls for deprecated API + new API fallback
    qrsGetMock
        .mockResolvedValueOnce(makeResult1()) // Attempt 1 - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 1 - scriptlog reference (deprecated)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // Attempt 1 - scriptlog reference (new API)
        .mockResolvedValueOnce(makeResult1()) // Attempt 2 - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 2 - scriptlog reference (deprecated)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // Attempt 2 - scriptlog reference (new API)
        .mockResolvedValueOnce(makeResult1()) // Attempt 3 - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 3 - scriptlog reference (deprecated)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }); // Attempt 3 - scriptlog reference (new API)
    axiosReqMock.mockRejectedValue(new Error('Network error'));

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 10, 0); // 3 retries, 10ms delay, downloadDelayMs=0 for tests
    expect(res).toBe(false);
    expect(logger.error).toHaveBeenCalled(); // Error is logged when all retries fail
});

test('getScriptLog handles empty head/tail line counts', async () => {
    qrsGetMock.mockResolvedValueOnce(makeResult1()).mockResolvedValueOnce({ body: { value: 'file-uuid' } });
    axiosReqMock.mockResolvedValueOnce({ status: 200, data: 'row1\r\nrow2\r\nrow3\r\nrow4' });

    const res = await scriptlog.getScriptLog('task-1', 0, 0, 3, 2000, 0); // downloadDelayMs=0 for tests
    expect(res.scriptLogHead).toBe('');
    expect(res.scriptLogTail).toBe('');
    expect(res.scriptLogHeadCount).toBe(0);
    expect(res.scriptLogTailCount).toBe(0);
});

test('failedTaskStoreLogOnDisk handles empty scriptLogFull array', async () => {
    globalsMock.config.get = (k) => ({ 'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory': '/tmp/logs' })[k];
    const rp = {
        logTimeStamp: '2025-08-24 12:34:56',
        appId: 'app1',
        taskId: 't1',
        scriptLog: { scriptLogFull: [] },
    };

    const ok = await scriptlog.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('but it is empty'));
});

test('failedTaskStoreLogOnDisk handles short script logs with warning', async () => {
    globalsMock.config.get = (k) => ({ 'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory': '/tmp/logs' })[k];
    const rp = {
        logTimeStamp: '2025-08-24 12:34:56',
        appId: 'app1',
        taskId: 't1',
        scriptLog: { scriptLogFull: ['line1', 'line2'] }, // Less than 10 lines
    };

    const ok = await scriptlog.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('but it is very short'));
});

test('failedTaskStoreLogOnDisk handles normal script logs', async () => {
    globalsMock.config.get = (k) => ({ 'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory': '/tmp/logs' })[k];
    const scriptLogFull = Array.from({ length: 15 }, (_, i) => `line${i + 1}`);
    const rp = {
        logTimeStamp: '2025-08-24 12:34:56',
        appId: 'app1',
        taskId: 't1',
        scriptLog: { scriptLogFull },
    };

    const ok = await scriptlog.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(true);
    expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Script log is available and has 15 rows'));
});

test('failedTaskStoreLogOnDisk handles fs errors', async () => {
    globalsMock.config.get = (k) => ({ 'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory': '/tmp/logs' })[k];

    // Configure fs mock to throw an error
    fsMkdirBehavior = 'error';

    const rp = {
        logTimeStamp: '2025-08-24 12:34:56',
        appId: 'app1',
        taskId: 't1',
        scriptLog: { scriptLogFull: ['line1'] },
    };

    const ok = await scriptlog.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));

    // Reset fs mock behavior
    fsMkdirBehavior = null;
});

test('getScriptLog retries on 404 error and eventually succeeds', async () => {
    // Setup: First two calls return 404, third succeeds
    qrsGetMock
        .mockResolvedValueOnce(makeResult1()) // First attempt - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // First attempt - Get scriptlog reference (deprecated API)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // First attempt - Get scriptlog reference (new API fallback)
        .mockResolvedValueOnce(makeResult1()) // Second attempt - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Second attempt - Get scriptlog reference (deprecated API)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // Second attempt - Get scriptlog reference (new API fallback)
        .mockResolvedValueOnce(makeResult1()) // Third attempt - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }); // Third attempt - Get scriptlog reference (deprecated API)

    // Create a proper 404 axios error
    const error404_1 = new Error('Request failed with status code 404');
    error404_1.response = { status: 404, statusText: 'Not Found' };
    error404_1.request = {};

    const error404_2 = new Error('Request failed with status code 404');
    error404_2.response = { status: 404, statusText: 'Not Found' };
    error404_2.request = {};

    const error404_3 = new Error('Request failed with status code 404');
    error404_3.response = { status: 404, statusText: 'Not Found' };
    error404_3.request = {};

    const error404_4 = new Error('Request failed with status code 404');
    error404_4.response = { status: 404, statusText: 'Not Found' };
    error404_4.request = {};

    axiosReqMock
        .mockRejectedValueOnce(error404_1) // First attempt deprecated API fails with 404
        .mockRejectedValueOnce(error404_2) // First attempt new API also fails with 404
        .mockRejectedValueOnce(error404_3) // Second attempt deprecated API fails with 404
        .mockRejectedValueOnce(error404_4) // Second attempt new API also fails with 404
        .mockResolvedValueOnce({ status: 200, data: 'row1\r\nrow2\r\nrow3' }); // Third attempt deprecated API succeeds

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 100, 0); // maxRetries=3, retryDelayMs=100, downloadDelayMs=0 for tests

    // Verify success
    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toEqual(['row1', 'row2', 'row3']);
    expect(res.scriptLogHead).toBe('row1');

    // Verify retry attempts were logged - now with fallback logic we get more warnings
    expect(logger.warn).toHaveBeenCalled(); // Multiple warnings from fallback attempts
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 2 of 3'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 3 of 3'));

    // Verify final success
    expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('[QSEOW] GET SCRIPT LOG: Done getting script log'));
});

test('getScriptLog retries on 404 error and eventually fails after max retries', async () => {
    // Setup: All attempts return 404
    // Each attempt calls qrsGetMock twice for deprecated API, and if that fails, twice more for new API
    qrsGetMock
        .mockResolvedValueOnce(makeResult1()) // Attempt 1 - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 1 - scriptlog reference (deprecated)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // Attempt 1 - scriptlog reference (new API)
        .mockResolvedValueOnce(makeResult1()) // Attempt 2 - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 2 - scriptlog reference (deprecated)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // Attempt 2 - scriptlog reference (new API)
        .mockResolvedValueOnce(makeResult1()) // Attempt 3 - getReloadTaskExecutionResults
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 3 - scriptlog reference (deprecated)
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }); // Attempt 3 - scriptlog reference (new API)

    // Create 404 errors for all attempts (both deprecated and new API)
    const error404 = new Error('Request failed with status code 404');
    error404.response = { status: 404, statusText: 'Not Found' };
    error404.request = {};

    axiosReqMock.mockRejectedValue(error404); // All attempts fail with 404

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 50, 0); // maxRetries=3, retryDelayMs=50, downloadDelayMs=0 for tests

    // Verify failure
    expect(res).toBe(false);

    // Verify all retry attempts were logged - with fallback logic there are more warnings
    expect(logger.warn).toHaveBeenCalled(); // Multiple warnings from fallback attempts
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('All 3 attempts failed'));
});

test('getScriptLog retries when fileReferenceId is all zeros and eventually gets valid reference', async () => {
    // Setup: First two attempts return all-zeros fileReferenceId, third attempt returns valid ID
    const resultWithZeroRef = makeResult1();
    resultWithZeroRef.body.operational.lastExecutionResult.fileReferenceID = '00000000-0000-0000-0000-000000000000';

    qrsGetMock
        .mockResolvedValueOnce(resultWithZeroRef) // First attempt - no fileReference yet
        .mockResolvedValueOnce(resultWithZeroRef) // Second attempt - still no fileReference
        .mockResolvedValueOnce(makeResult1()) // Third attempt - valid fileReference
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }); // Get scriptlog reference

    axiosReqMock.mockResolvedValueOnce({ status: 200, data: 'row1\r\nrow2' });

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 50, 0); // maxRetries=3, retryDelayMs=50, downloadDelayMs=0 for tests

    // Verify success
    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toEqual(['row1', 'row2']);

    // Verify retry attempts were logged
    expect(logger.warn).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 2 of 3'));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 3 of 3'));
});

test('getScriptLog returns empty result when fileReferenceId remains all zeros after all retries', async () => {
    // Setup: All attempts return all-zeros fileReferenceId
    const resultWithZeroRef = makeResult1();
    resultWithZeroRef.body.operational.lastExecutionResult.fileReferenceID = '00000000-0000-0000-0000-000000000000';

    qrsGetMock.mockResolvedValue(resultWithZeroRef);

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 50, 0); // maxRetries=3, retryDelayMs=50, downloadDelayMs=0 for tests

    // Verify empty result (not false, since this is a valid state on the last attempt)
    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toBe('');
    expect(res.scriptLogSize).toBe(0);

    // Verify retry attempts were logged (only 2 warnings, since last attempt returns successfully)
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.verbose).toHaveBeenCalledWith('[QSEOW] GET SCRIPT LOG: No script log available after all retry attempts');
});

test('getScriptLog handles 500 error with retry', async () => {
    // Setup: First attempt returns 500, second succeeds
    qrsGetMock
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } })
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // new API fallback call
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } });

    const error500 = new Error('Request failed with status code 500');
    error500.response = { status: 500, statusText: 'Internal Server Error' };
    error500.request = {};

    axiosReqMock
        .mockRejectedValueOnce(error500) // deprecated API fails
        .mockRejectedValueOnce(error500) // new API also fails
        .mockResolvedValueOnce({ status: 200, data: 'row1\r\nrow2' }); // second attempt succeeds

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 50, 0); // downloadDelayMs=0 for tests

    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toEqual(['row1', 'row2']);
    // With fallback logic, we get warnings about both API attempts
    expect(logger.warn).toHaveBeenCalled();
});

test('getScriptLog handles network error (no response) with retry', async () => {
    // Setup: First attempt has network error, second succeeds
    qrsGetMock
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } })
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // new API fallback call
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } });

    const networkError = new Error('Network timeout');
    networkError.request = {}; // request was made but no response received
    // No response property indicates network-level error

    axiosReqMock
        .mockRejectedValueOnce(networkError) // deprecated API fails
        .mockRejectedValueOnce(networkError) // new API also fails
        .mockResolvedValueOnce({ status: 200, data: 'row1' }); // second attempt succeeds

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 50, 0); // downloadDelayMs=0 for tests

    expect(res).not.toBe(false);
    // With fallback logic, warnings are logged for both API attempts
    expect(logger.warn).toHaveBeenCalled();
});

test('getScriptLog handles request setup error with retry', async () => {
    // Setup: First attempt has request setup error, second succeeds
    qrsGetMock
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } })
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // new API fallback call
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } });

    const setupError = new Error('Invalid configuration');
    // No request or response properties indicates setup error

    axiosReqMock
        .mockRejectedValueOnce(setupError) // deprecated API fails
        .mockRejectedValueOnce(setupError) // new API also fails
        .mockResolvedValueOnce({ status: 200, data: 'row1' }); // second attempt succeeds

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 3, 50, 0); // downloadDelayMs=0 for tests

    expect(res).not.toBe(false);
    // With fallback logic, warnings are logged for both API attempts
    expect(logger.warn).toHaveBeenCalled();
});

// New tests for fallback functionality

test('getScriptLog uses deprecated API successfully without trying fallback', async () => {
    // Setup: Deprecated API succeeds on first attempt
    qrsGetMock.mockResolvedValueOnce(makeResult1()).mockResolvedValueOnce({ body: { value: 'file-uuid' } });

    axiosReqMock.mockResolvedValueOnce({ status: 200, data: 'line1\r\nline2\r\nline3' });

    const res = await scriptlog.getScriptLog('task-1', 2, 1, 1, 50, 0); // maxRetries=1 to avoid retries, downloadDelayMs=0 for tests

    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toEqual(['line1', 'line2', 'line3']);
    expect(res.scriptLogHead).toBe('line1\r\nline2');
    expect(res.scriptLogTail).toBe('line3');

    // Verify deprecated API was used successfully
    expect(logger.debug).toHaveBeenCalledWith('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using deprecated API');
    // Verify fallback was NOT attempted (no "Trying new API as fallback" warning)
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Trying new API as fallback'));
});

test('getScriptLog falls back to new API when deprecated API fails', async () => {
    // Setup: Deprecated API fails, new API succeeds
    qrsGetMock
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // deprecated API scriptlog reference
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }); // new API scriptlog reference

    const deprecatedApiError = new Error('Deprecated API not found');
    deprecatedApiError.response = { status: 404 };

    axiosReqMock
        .mockRejectedValueOnce(deprecatedApiError) // deprecated API fails
        .mockResolvedValueOnce({ status: 200, data: 'line1\r\nline2' }); // new API succeeds

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 1, 50, 0); // maxRetries=1 to test single attempt, downloadDelayMs=0 for tests

    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toEqual(['line1', 'line2']);
    expect(res.scriptLogHead).toBe('line1');

    // Verify fallback was attempted and succeeded
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Deprecated API failed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Trying new API as fallback'));
    expect(logger.debug).toHaveBeenCalledWith('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using new API');
});

test('getScriptLog fails when both deprecated and new API fail', async () => {
    // Setup: Both APIs fail
    qrsGetMock
        .mockResolvedValueOnce(makeResult1())
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // deprecated API scriptlog reference
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }); // new API scriptlog reference

    const apiError = new Error('API error');
    apiError.response = { status: 500 };

    axiosReqMock.mockRejectedValue(apiError); // both APIs fail

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 1, 50, 0); // maxRetries=1, downloadDelayMs=0 for tests

    expect(res).toBe(false);

    // Verify both APIs were attempted
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Deprecated API failed'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Trying new API as fallback'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('New API also failed'));
});

test('getScriptLog falls back to new API when deprecated API fails with retry', async () => {
    // Setup: First attempt both APIs fail, second attempt new API succeeds
    qrsGetMock
        .mockResolvedValueOnce(makeResult1()) // Attempt 1
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 1 - deprecated API
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }) // Attempt 1 - new API fallback
        .mockResolvedValueOnce(makeResult1()) // Attempt 2
        .mockResolvedValueOnce({ body: { value: 'file-uuid' } }) // Attempt 2 - deprecated API
        .mockResolvedValueOnce({ body: { value: 'file-uuid-new' } }); // Attempt 2 - new API fallback

    const deprecatedApiError = new Error('Deprecated API error');
    deprecatedApiError.response = { status: 500 };

    const newApiError = new Error('New API error');
    newApiError.response = { status: 500 };

    axiosReqMock
        .mockRejectedValueOnce(deprecatedApiError) // Attempt 1 - deprecated API fails
        .mockRejectedValueOnce(newApiError) // Attempt 1 - new API fails
        .mockRejectedValueOnce(deprecatedApiError) // Attempt 2 - deprecated API fails
        .mockResolvedValueOnce({ status: 200, data: 'success\r\ndata' }); // Attempt 2 - new API succeeds

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 2, 50, 0); // maxRetries=2, downloadDelayMs=0 for tests

    expect(res).not.toBe(false);
    expect(res.scriptLogFull).toEqual(['success', 'data']);

    // Verify retry happened and new API eventually succeeded
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Retry attempt 2 of 2'));
    expect(logger.debug).toHaveBeenCalledWith('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using new API');
});

test('getScriptLog handles missing executionResultId gracefully', async () => {
    // Setup: Task without executionResultId, deprecated API fails
    const taskWithoutExecResultId = makeResult1();
    delete taskWithoutExecResultId.body.operational.lastExecutionResult.id;

    qrsGetMock.mockResolvedValueOnce(taskWithoutExecResultId).mockResolvedValueOnce({ body: { value: 'file-uuid' } });

    const deprecatedApiError = new Error('Deprecated API not available');
    deprecatedApiError.response = { status: 404 };

    axiosReqMock.mockRejectedValueOnce(deprecatedApiError);

    const res = await scriptlog.getScriptLog('task-1', 1, 1, 1, 50, 0); // maxRetries=1, downloadDelayMs=0 for tests

    expect(res).toBe(false);

    // Verify fallback was attempted but skipped due to missing executionResultId
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Deprecated API failed'));
    expect(logger.warn).toHaveBeenCalledWith('[QSEOW] GET SCRIPT LOG: No executionResultId available for fallback API');
});
