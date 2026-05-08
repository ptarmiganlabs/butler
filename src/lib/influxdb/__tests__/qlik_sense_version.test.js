import { jest } from '@jest/globals';

describe('lib/influxdb/qlik_sense_version', () => {
    let postQlikSenseVersionToInfluxDB;
    let mockLogger;
    let mockInfluxWritePoints;
    let mockCloneDeep;

    const mockVersion = {
        contentHash: 'abc123def456',
        senseId: 'sense-001',
        version: '15.1.3',
        deploymentType: 'OnPremise',
        releaseLabel: 'January 2024',
        deprecatedProductVersion: '15.0.0',
        productName: 'Qlik Sense',
        copyrightYearRange: '2024',
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

        mockLogger = {
            verbose: jest.fn(),
            silly: jest.fn(),
            error: jest.fn(),
        };

        const mockGlobals = {
            config: {
                get: jest.fn((key) => {
                    if (key === 'Butler.influxDb.tag.static') {
                        return [
                            { name: 'env', value: 'production' },
                        ];
                    }
                    if (key === 'Butler.qlikSenseVersion.versionMonitor.destination.influxDb.tag.static') {
                        return [
                            { name: 'monitor', value: 'version' },
                        ];
                    }
                    return null;
                }),
            },
            logger: mockLogger,
            influx: mockInflux,
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        await jest.unstable_mockModule('lodash', () => ({
            default: { cloneDeep: mockCloneDeep },
        }));

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../qlik_sense_version.js');
        postQlikSenseVersionToInfluxDB = module.postQlikSenseVersionToInfluxDB;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sends Qlik Sense version to InfluxDB', async () => {
        await postQlikSenseVersionToInfluxDB(mockVersion);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint).toHaveLength(1);
        expect(datapoint[0].measurement).toBe('qlik_sense_version');
    });

    test('includes correct tags in datapoint', async () => {
        await postQlikSenseVersionToInfluxDB(mockVersion);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.env).toBe('production');
        expect(datapoint[0].tags.monitor).toBe('version');
    });

    test('includes correct fields in datapoint', async () => {
        await postQlikSenseVersionToInfluxDB(mockVersion);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.content_hash).toBe('abc123def456');
        expect(datapoint[0].fields.sense_id).toBe('sense-001');
        expect(datapoint[0].fields.version).toBe('15.1.3');
        expect(datapoint[0].fields.deployment_type).toBe('OnPremise');
        expect(datapoint[0].fields.release_label).toBe('January 2024');
        expect(datapoint[0].fields.deprecated_product_version).toBe('15.0.0');
        expect(datapoint[0].fields.product_name).toBe('Qlik Sense');
        expect(datapoint[0].fields.copyright_year_range).toBe('2024');
    });

    test('applies both static and feature-specific tags', async () => {
        await postQlikSenseVersionToInfluxDB(mockVersion);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.env).toBe('production');
        expect(datapoint[0].tags.monitor).toBe('version');
    });

    test('logs verbose message on send', async () => {
        await postQlikSenseVersionToInfluxDB(mockVersion);

        expect(mockLogger.verbose).toHaveBeenCalledWith(
            expect.stringContaining('Sent Qlik Sense version to InfluxDB')
        );
    });

    test('logs silly message with datapoint', async () => {
        await postQlikSenseVersionToInfluxDB(mockVersion);

        expect(mockLogger.silly).toHaveBeenCalled();
        expect(mockLogger.silly.mock.calls[0][0]).toContain('Influxdb datapoint');
    });

    test('handles InfluxDB write error', async () => {
        mockInfluxWritePoints.mockReturnValue({
            then: (onSuccess, onReject) => {
                onReject(new Error('InfluxDB connection failed'));
                return { catch: () => {} };
            },
        });

        await postQlikSenseVersionToInfluxDB(mockVersion);

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error.mock.calls[0][0]).toContain('Error sending to InfluxDB');
    }, 10000);

    test('deep clones tags before using', async () => {
        mockInfluxWritePoints.mockReturnValue({
            then: (onSuccess) => {
                onSuccess();
                return { catch: () => {} };
            },
        });

        await postQlikSenseVersionToInfluxDB(mockVersion);

        expect(mockCloneDeep).toHaveBeenCalled();
    }, 10000);

    test('handles missing static tags gracefully', async () => {
        mockInfluxWritePoints.mockReturnValue({
            then: (onSuccess) => {
                onSuccess();
                return { catch: () => {} };
            },
        });

        await postQlikSenseVersionToInfluxDB(mockVersion);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
    }, 10000);
});
