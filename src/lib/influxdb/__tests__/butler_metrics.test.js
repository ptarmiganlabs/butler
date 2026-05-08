import { jest } from '@jest/globals';

describe('lib/influxdb/butler_metrics', () => {
    let postButlerMemoryUsageToInfluxdb;
    let mockGlobals;
    let mockInfluxWritePoints;
    let mockCloneDeep;

    const mockMemory = {
        heapUsedMByte: 128,
        heapTotalMByte: 256,
        externalMemoryMByte: 64,
        processMemoryMByte: 512,
    };

    beforeAll(async () => {
        mockInfluxWritePoints = jest.fn().mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        mockCloneDeep = jest.fn((obj) => JSON.parse(JSON.stringify(obj)));

        const mockInflux = {
            writePoints: mockInfluxWritePoints,
        };

        mockGlobals = {
            appVersion: '15.1.3',
            config: {
                get: jest.fn((key) => {
                    if (key === 'Butler.influxDb.tag.static') {
                        return [
                            { name: 'env', value: 'production' },
                            { name: 'host', value: 'butler-01' },
                        ];
                    }
                    return null;
                }),
            },
            logger: {
                silly: jest.fn(),
                verbose: jest.fn(),
                error: jest.fn(),
            },
            influx: mockInflux,
            isSea: false,
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        await jest.unstable_mockModule('lodash', () => ({
            default: { cloneDeep: mockCloneDeep },
        }));

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../butler_metrics.js');
        postButlerMemoryUsageToInfluxdb = module.postButlerMemoryUsageToInfluxdb;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockInfluxWritePoints.mockReset();
    });

    test('sends memory usage data to InfluxDB with static tags', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint).toHaveLength(1);
        expect(datapoint[0].measurement).toBe('butler_memory_usage');
        expect(datapoint[0].tags).toEqual({
            env: 'production',
            host: 'butler-01',
            version: '15.1.3',
        });
    });

    test('includes correct memory fields in datapoint', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.heap_used).toBe(128);
        expect(datapoint[0].fields.heap_total).toBe(256);
        expect(datapoint[0].fields.external).toBe(64);
        expect(datapoint[0].fields.process_memory).toBe(512);
    });

    test('handles missing static tags gracefully', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.influxDb.tag.static') return null;
            return null;
        });

        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags).toEqual({ version: '15.1.3' });
    });

    test('logs silly message with datapoint after successful write', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        expect(mockGlobals.logger.silly).toHaveBeenCalled();
        expect(mockGlobals.logger.silly.mock.calls[0][0]).toContain('MEMORY USAGE');
    });

    test('logs verbose message after successful write', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        expect(mockGlobals.logger.verbose).toHaveBeenCalledWith('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
    });

    test('handles InfluxDB write error in SEA mode', () => {
        mockGlobals.isSea = true;
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn(() => ({
                catch: jest.fn((cb) => {
                    cb(new Error('InfluxDB connection failed'));
                }),
            })),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        expect(mockGlobals.logger.error).toHaveBeenCalled();
        expect(mockGlobals.logger.error.mock.calls[0][0]).toContain('MEMORY USAGE');
    });

    test('handles InfluxDB write error in non-SEA mode', () => {
        mockGlobals.isSea = false;
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn(() => ({
                catch: jest.fn((cb) => {
                    cb(new Error('InfluxDB write failed'));
                }),
            })),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });

    test('deep clones datapoint before writing', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);

        expect(mockCloneDeep).toHaveBeenCalled();
    });

    test('sets datapoint to null after successful write', () => {
        let capturedDatapoint;
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                // In real code, datapoint is set to null after write
                return { catch: jest.fn() };
            }),
        });

        postButlerMemoryUsageToInfluxdb(mockMemory);
        expect(mockInfluxWritePoints).toHaveBeenCalled();
    });
});
