import { jest } from '@jest/globals';

const mockV1Client = {
    writePoints: jest.fn(),
};

const mockV2WriteApi = {
    writePoints: jest.fn(),
    flush: jest.fn(),
    close: jest.fn(),
};

const mockV2Client = {
    getWriteApi: jest.fn(() => mockV2WriteApi),
};

const mockV3Client = {
    write: jest.fn(),
};

const mockSetInfluxV3Logger = jest.fn();

jest.unstable_mockModule('influx', () => ({
    default: {
        InfluxDB: jest.fn(() => mockV1Client),
    },
}));

jest.unstable_mockModule('@influxdata/influxdb-client', () => ({
    InfluxDB: jest.fn(() => mockV2Client),
    Point: class Point {
        constructor(measurement) {
            this.measurement = measurement;
            this.tags = {};
            this.fields = {};
            this.pointTimestamp = undefined;
        }

        tag(key, value) {
            this.tags[key] = value;
            return this;
        }

        floatField(key, value) {
            this.fields[key] = value;
            return this;
        }

        booleanField(key, value) {
            this.fields[key] = value;
            return this;
        }

        stringField(key, value) {
            this.fields[key] = value;
            return this;
        }

        timestamp(value) {
            this.pointTimestamp = value;
            return this;
        }
    },
}));

jest.unstable_mockModule('@influxdata/influxdb3-client', () => ({
    InfluxDBClient: jest.fn(() => mockV3Client),
    Point: class Point {
        constructor() {
            this.measurement = '';
            this.tags = {};
            this.fields = {};
            this.pointTimestamp = undefined;
        }

        static measurement(name) {
            const point = new Point();
            point.measurement = name;
            return point;
        }

        setTag(key, value) {
            this.tags[key] = value;
            return this;
        }

        setFloatField(key, value) {
            this.fields[key] = value;
            return this;
        }

        setBooleanField(key, value) {
            this.fields[key] = value;
            return this;
        }

        setStringField(key, value) {
            this.fields[key] = value;
            return this;
        }

        setTimestamp(value) {
            this.pointTimestamp = value;
            return this;
        }

        toLineProtocol() {
            return JSON.stringify({
                measurement: this.measurement,
                tags: this.tags,
                fields: this.fields,
                timestamp: this.pointTimestamp,
            });
        }
    },
    setLogger: mockSetInfluxV3Logger,
}));

const { createInfluxDbClient, getInfluxDbV1Config, getInfluxDbVersion } = await import('../client.js');

function createConfig(values) {
    return {
        has: (key) => key in values,
        get: (key) => values[key],
    };
}

describe('lib/influxdb/client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockV1Client.writePoints.mockResolvedValue(undefined);
        mockV2WriteApi.flush.mockResolvedValue(undefined);
        mockV2WriteApi.close.mockResolvedValue(undefined);
        mockV2WriteApi.writePoints.mockImplementation(() => {});
        mockV3Client.write.mockResolvedValue(undefined);
    });

    test('defaults to InfluxDB v1 config when version is omitted', () => {
        const config = createConfig({
            'Butler.influxDb.auth': { enable: true, username: 'legacy-user', password: 'legacy-pass' },
            'Butler.influxDb.dbName': 'legacy-db',
            'Butler.influxDb.retentionPolicy': { name: '30d', duration: '30d' },
        });

        expect(getInfluxDbVersion(config)).toBe(1);
        expect(getInfluxDbV1Config(config)).toEqual({
            auth: { enable: true, username: 'legacy-user', password: 'legacy-pass' },
            dbName: 'legacy-db',
            retentionPolicy: { name: '30d', duration: '30d' },
        });
    });

    test('writes legacy point payloads using the InfluxDB v2 client', async () => {
        const config = createConfig({
            'Butler.influxDb.version': 2,
            'Butler.influxDb.hostIP': 'influx.example.com',
            'Butler.influxDb.hostPort': 8086,
            'Butler.influxDb.v2Config': {
                org: 'my-org',
                bucket: 'butler',
                token: 'secret-token',
            },
        });

        const client = createInfluxDbClient(config);
        const timestamp = new Date('2024-01-15T10:30:00.000Z');

        await client.writePoints([
            {
                measurement: 'reload_task_success',
                tags: { host: 'server1', task: 'reload' },
                fields: { duration_sec: 12.5, success: true, detail: 'ok' },
                timestamp,
            },
        ]);

        expect(mockV2Client.getWriteApi).toHaveBeenCalledWith('my-org', 'butler');
        expect(mockV2WriteApi.writePoints).toHaveBeenCalledWith([
            expect.objectContaining({
                measurement: 'reload_task_success',
                tags: { host: 'server1', task: 'reload' },
                fields: { duration_sec: 12.5, success: true, detail: 'ok' },
                pointTimestamp: timestamp,
            }),
        ]);
        expect(mockV2WriteApi.flush).toHaveBeenCalled();
        expect(mockV2WriteApi.close).not.toHaveBeenCalled();
    });

    test('reuses a single InfluxDB v2 WriteApi across writes', async () => {
        const config = createConfig({
            'Butler.influxDb.version': 2,
            'Butler.influxDb.hostIP': 'influx.example.com',
            'Butler.influxDb.hostPort': 8086,
            'Butler.influxDb.v2Config': {
                org: 'my-org',
                bucket: 'butler',
                token: 'secret-token',
            },
        });

        const client = createInfluxDbClient(config);

        await client.writePoints([
            {
                measurement: 'metric_one',
                tags: { host: 'server1' },
                fields: { duration_sec: 1 },
            },
        ]);
        await client.writePoints([
            {
                measurement: 'metric_two',
                tags: { host: 'server2' },
                fields: { duration_sec: 2 },
            },
        ]);

        expect(mockV2Client.getWriteApi).toHaveBeenCalledTimes(1);
        expect(mockV2WriteApi.writePoints).toHaveBeenCalledTimes(2);
        expect(mockV2WriteApi.flush).toHaveBeenCalledTimes(2);
    });

    test('throws when required InfluxDB v2 config is missing', () => {
        const config = createConfig({
            'Butler.influxDb.version': 2,
            'Butler.influxDb.hostIP': 'influx.example.com',
            'Butler.influxDb.hostPort': 8086,
            'Butler.influxDb.v2Config': {
                bucket: 'butler',
            },
        });

        expect(() => createInfluxDbClient(config)).toThrow('Invalid InfluxDB v2 config: org, bucket and token are required.');
    });

    test('writes legacy point payloads using the InfluxDB v3 client', async () => {
        const config = createConfig({
            'Butler.influxDb.version': 3,
            'Butler.influxDb.hostIP': 'influx.example.com',
            'Butler.influxDb.hostPort': 8181,
            'Butler.influxDb.v3Config': {
                database: 'butler',
                token: 'secret-token',
                writeTimeout: 5000,
            },
        });

        const client = createInfluxDbClient(config);

        await client.writePoints([
            {
                measurement: 'reload_task_failed',
                tags: { host: 'server1' },
                fields: { duration_sec: 9, detail: 'failed' },
            },
        ]);

        expect(mockSetInfluxV3Logger).toHaveBeenCalled();
        expect(mockV3Client.write).toHaveBeenCalledWith(expect.stringContaining('"measurement":"reload_task_failed"'), 'butler');
    });

    test('throws when required InfluxDB v3 config is missing', () => {
        const config = createConfig({
            'Butler.influxDb.version': 3,
            'Butler.influxDb.hostIP': 'influx.example.com',
            'Butler.influxDb.hostPort': 8181,
            'Butler.influxDb.v3Config': {
                writeTimeout: 5000,
            },
        });

        expect(() => createInfluxDbClient(config)).toThrow('Invalid InfluxDB v3 config: database and token are required.');
    });
});
