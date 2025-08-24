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
