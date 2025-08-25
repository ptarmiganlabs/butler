import { jest } from '@jest/globals';

// Mocks for QRS, axios, https, luxon formatting is not critical here.
const qrsGetMock = jest.fn();
class QrsInteractMock {
    constructor() {}
    Get(path) {
        return qrsGetMock(path);
    }
}
jest.unstable_mockModule('qrs-interact', () => ({ default: QrsInteractMock }));

const axiosReqMock = jest.fn();
jest.unstable_mockModule('axios', () => ({ default: { request: axiosReqMock } }));

// https.Agent used only for construction
class Agent {
    constructor() {}
}
jest.unstable_mockModule('https', () => ({ default: { Agent } }));

// fs interactions
const fsWrites = { mkdir: [], write: [] };
jest.unstable_mockModule('fs', () => ({
    default: {
        mkdirSync: (...args) => fsWrites.mkdir.push(args),
        writeFileSync: (...args) => fsWrites.write.push(args),
    },
}));

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), verbose: jest.fn() };
const globalsMock = {
    logger,
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
            operational: {
                lastExecutionResult: {
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
    const res = await scriptlog.getScriptLog('task-1', 2, 2);
    expect(res.scriptLogHead).toBe('row1\r\nrow2');
    expect(res.scriptLogTail).toBe('row3\r\nrow4');
    expect(res.scriptLogSizeRows).toBe(4);
    expect(res.scriptLogSizeCharacters).toBeGreaterThan(0);
});

test('getScriptLog returns no-log structure when fileReference is all zeros', async () => {
    const res1 = makeResult1();
    res1.body.operational.lastExecutionResult.fileReferenceID = '00000000-0000-0000-0000-000000000000';
    qrsGetMock.mockResolvedValueOnce(res1);
    const res = await scriptlog.getScriptLog('task-1', 1, 1);
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
    const res = await scriptlog.getScriptLog('task-1', 1, 1);
    expect(res).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('QRS error'));
});

test('getReloadTaskExecutionResults handles 1753 dates (null dates)', async () => {
    const result = makeResult1();
    result.body.operational.lastExecutionResult.startTime = '1753-01-01T00:00:00.000Z';
    result.body.operational.lastExecutionResult.stopTime = '1753-01-01T00:00:00.000Z';
    result.body.operational.lastExecutionResult.details = [
        { detailCreatedDate: '1753-01-01T00:00:00.000Z', message: 'Old entry', detailsType: 1 }
    ];
    qrsGetMock.mockResolvedValueOnce(result);
    
    const res = await scriptlog.getReloadTaskExecutionResults('task-1');
    expect(res.executionStartTime.startTimeUTC).toBe('-');
    expect(res.executionStopTime.stopTimeUTC).toBe('-');
    expect(res.executionDetailsSorted[0].timestampUTC).toBe('-');
});

test('getScriptLog handles axios errors', async () => {
    qrsGetMock.mockResolvedValueOnce(makeResult1()).mockResolvedValueOnce({ body: { value: 'file-uuid' } });
    axiosReqMock.mockRejectedValueOnce(new Error('Network error'));
    
    const res = await scriptlog.getScriptLog('task-1', 1, 1);
    expect(res).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
});

test('getScriptLog handles empty head/tail line counts', async () => {
    qrsGetMock.mockResolvedValueOnce(makeResult1()).mockResolvedValueOnce({ body: { value: 'file-uuid' } });
    axiosReqMock.mockResolvedValueOnce({ status: 200, data: 'row1\r\nrow2\r\nrow3\r\nrow4' });
    
    const res = await scriptlog.getScriptLog('task-1', 0, 0);
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
    
    // Mock fs.mkdirSync to throw an error
    const originalMkdir = fsWrites.mkdir;
    jest.unstable_mockModule('fs', () => ({
        default: {
            mkdirSync: () => { throw new Error('Permission denied'); },
            writeFileSync: (...args) => fsWrites.write.push(args),
        },
    }));
    
    // Re-import to get the module with the new mock
    const scriptlogNew = await import('../scriptlog.js');
    
    const rp = {
        logTimeStamp: '2025-08-24 12:34:56',
        appId: 'app1',
        taskId: 't1',
        scriptLog: { scriptLogFull: ['line1'] },
    };
    
    const ok = await scriptlogNew.failedTaskStoreLogOnDisk(rp);
    expect(ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));
    
    // Restore original mock
    jest.unstable_mockModule('fs', () => ({
        default: {
            mkdirSync: (...args) => originalMkdir.push(args),
            writeFileSync: (...args) => fsWrites.write.push(args),
        },
    }));
});
