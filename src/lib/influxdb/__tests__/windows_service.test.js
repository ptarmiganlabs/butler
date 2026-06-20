import { jest } from '@jest/globals';

describe('lib/influxdb/windows_service', () => {
    let postWindowsServiceStatusToInfluxDB;
    let mockLogger;
    let mockInfluxWritePoints;
    let mockCloneDeep;

    const mockServiceStatus = {
        host: 'sense-server-01',
        serviceName: 'QlikSenseService',
        serviceFriendlyName: 'Qlik Sense Service',
        serviceStatus: 'RUNNING',
        serviceDetails: {
            displayName: 'Qlik Sense Service',
            startType: 'Automatic',
        },
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
                        return [{ name: 'env', value: 'production' }];
                    }
                    return null;
                }),
            },
            logger: mockLogger,
            influx: mockInflux,
            isSea: false,
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
        };

        await jest.unstable_mockModule('lodash', () => ({
            default: { cloneDeep: mockCloneDeep },
        }));

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../windows_service.js');
        postWindowsServiceStatusToInfluxDB = module.postWindowsServiceStatusToInfluxDB;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sends Windows service status to InfluxDB', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        expect(mockInfluxWritePoints).toHaveBeenCalled();
        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint).toHaveLength(1);
        expect(datapoint[0].measurement).toBe('win_service_state');
    });

    test('includes correct tags in datapoint', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].tags.host).toBe('sense-server-01');
        expect(datapoint[0].tags.service_name).toBe('QlikSenseService');
        expect(datapoint[0].tags.display_name).toBe('Qlik Sense Service');
        expect(datapoint[0].tags.friendly_name).toBe('Qlik Sense Service');
        expect(datapoint[0].tags.env).toBe('production');
    });

    test('maps RUNNING state to numeric value 4', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.state_num).toBe(4);
        expect(datapoint[0].fields.state_text).toBe('RUNNING');
    });

    test('maps STOPPED state to numeric value 1', () => {
        const stoppedService = { ...mockServiceStatus, serviceStatus: 'STOPPED' };
        postWindowsServiceStatusToInfluxDB(stoppedService);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.state_num).toBe(1);
        expect(datapoint[0].fields.state_text).toBe('STOPPED');
    });

    test('maps Automatic startup mode to numeric value 0', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.startup_mode_num).toBe(0);
        expect(datapoint[0].fields.startup_mode_text).toBe('Automatic');
    });

    test('maps Manual startup mode to numeric value 2', () => {
        const manualService = {
            ...mockServiceStatus,
            serviceDetails: { ...mockServiceStatus.serviceDetails, startType: 'Manual' },
        };
        postWindowsServiceStatusToInfluxDB(manualService);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.startup_mode_num).toBe(2);
        expect(datapoint[0].fields.startup_mode_text).toBe('Manual');
    });

    test('handles unknown service state gracefully', () => {
        const unknownService = { ...mockServiceStatus, serviceStatus: 'UNKNOWN_STATE' };
        postWindowsServiceStatusToInfluxDB(unknownService);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.state_num).toBe(-1);
    });

    test('handles unknown startup mode gracefully', () => {
        const unknownMode = {
            ...mockServiceStatus,
            serviceDetails: { ...mockServiceStatus.serviceDetails, startType: 'UnknownMode' },
        };
        postWindowsServiceStatusToInfluxDB(unknownMode);

        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint[0].fields.startup_mode_num).toBe(-1);
    });

    test('logs verbose message on send', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        expect(mockLogger.verbose).toHaveBeenCalledWith(
            expect.stringContaining('WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB'),
        );
    });

    test('logs silly message with datapoint', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        expect(mockLogger.silly).toHaveBeenCalled();
        expect(mockLogger.silly.mock.calls[0][0]).toContain('WINDOWS SERVICE STATUS: Influxdb datapoint');
    });

    test('deep clones datapoint before writing', () => {
        postWindowsServiceStatusToInfluxDB(mockServiceStatus);

        expect(mockCloneDeep).toHaveBeenCalled();
    });
});
