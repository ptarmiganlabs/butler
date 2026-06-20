import { jest } from '@jest/globals';

// Mock later to run callback immediately
jest.unstable_mockModule('@breejs/later', () => ({
    default: {
        parse: { text: jest.fn().mockReturnValue({}) },
        setInterval: jest.fn((cb) => cb()),
    },
}));

// Mock axios to return version info
const axiosMock = jest.fn().mockResolvedValue({
    status: 200,
    data: {
        productName: 'Qlik Sense',
        deploymentType: 'Windows',
        version: '2024.10',
        releaseLabel: 'May 2024',
    },
});
jest.unstable_mockModule('axios', () => ({ default: axiosMock }));

// Globals and influx poster
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), error: jest.fn() };
const cfg = new Map();
const globalsMock = {
    config: {
        get: (k) => cfg.get(k),
    },
    configQRS: { cert: 'CERT', key: 'KEY' },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};
jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

const postInflux = jest.fn().mockResolvedValue(true);
// qliksense_version.js imports from '../influxdb/qlik_sense_version.js' relative to src/lib/qseow,
// which resolves to src/lib/influxdb/qlik_sense_version.js. From this test file's location, that is ../../influxdb/qlik_sense_version.js
jest.unstable_mockModule('../../influxdb/qlik_sense_version.js', () => ({ postQlikSenseVersionToInfluxDB: postInflux }));

let setupQlikSenseVersionMonitor;

beforeAll(async () => {
    const mod = await import('../qliksense_version.js');
    ({ setupQlikSenseVersionMonitor } = mod);
});

beforeEach(() => {
    jest.clearAllMocks();
    cfg.clear();
    globalsMock.isSea = false;
    cfg.set('Butler.qlikSenseVersion.versionMonitor.enable', true);
    cfg.set('Butler.qlikSenseVersion.versionMonitor.frequency', 'every 1 min');
    cfg.set('Butler.qlikSenseVersion.versionMonitor.host', 'sense-host');
    cfg.set('Butler.qlikSenseVersion.versionMonitor.rejectUnauthorized', false);
    cfg.set('Butler.influxDb.enable', true);
    cfg.set('Butler.qlikSenseVersion.versionMonitor.destination.influxDb.enable', true);
    axiosMock.mockResolvedValue({
        status: 200,
        data: {
            productName: 'Qlik Sense',
            deploymentType: 'Windows',
            version: '2024.10',
            releaseLabel: 'May 2024',
        },
    });
});

test('setupQlikSenseVersionMonitor triggers axios call and posts to influx', async () => {
    await setupQlikSenseVersionMonitor({ get: (k) => cfg.get(k) }, logger);
    await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    // One immediate call due to our mocked later.setInterval invoking callback
    expect(axiosMock).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Qlik Sense product name: Qlik Sense'));
    // With mocked later.setInterval calling back immediately + the initial call, we expect two posts
    expect(postInflux).toHaveBeenCalledTimes(2);
});

test('setupQlikSenseVersionMonitor logs contextual information for unexpected HTTP responses', async () => {
    axiosMock.mockResolvedValue({
        status: 503,
        statusText: 'Service Unavailable',
        data: { message: 'Upstream unavailable' },
    });

    await setupQlikSenseVersionMonitor({ get: (k) => cfg.get(k) }, logger);
    await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Unexpected HTTP response'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('endpoint: /v1/systeminfo'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('status: 503'));
    expect(postInflux).not.toHaveBeenCalled();
});

test('setupQlikSenseVersionMonitor logs contextual information for thrown axios errors', async () => {
    const error = new Error('Network timeout');
    error.code = 'ECONNABORTED';
    error.config = {
        method: 'get',
        timeout: 5000,
        baseURL: 'https://sense-host:9032',
        url: '/v1/systeminfo',
    };
    axiosMock.mockRejectedValue(error);

    await setupQlikSenseVersionMonitor({ get: (k) => cfg.get(k) }, logger);
    await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('endpoint: /v1/systeminfo'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('host: sense-host'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('code: ECONNABORTED'));
});
