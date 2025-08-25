import { jest } from '@jest/globals';

describe('lib/post_to_influxdb', () => {
    let mod;
    let globals;
    const writePoints = jest.fn();
    const logger = {
        silly: jest.fn(),
        verbose: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    };

    const baseConfig = {
        get: jest.fn((k) => {
            const map = {
                'Butler.influxDb.tag.static': [
                    { name: 'env', value: 'test' },
                    { name: 'region', value: 'eu' },
                ],
                'Butler.qlikSenseVersion.versionMonitor.destination.influxDb.tag.static': [{ name: 'feature', value: 'version' }],
                'Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.tag.static': [
                    { name: 'feature', value: 'server_license' },
                ],
                'Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag.static': [{ name: 'feature', value: 'license' }],
                'Butler.qlikSenseLicense.licenseRelease.destination.influxDb.tag.static': [{ name: 'feature', value: 'license_release' }],
                'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags': false,
                'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags': false,
                'Butler.influxDb.reloadTaskSuccess.tag.static': null,
                'Butler.influxDb.reloadTaskFailure.tag.dynamic.useAppTags': false,
                'Butler.influxDb.reloadTaskFailure.tag.dynamic.useTaskTags': false,
                'Butler.influxDb.reloadTaskFailure.tag.static': null,
                'Butler.influxDb.reloadTaskFailure.tailScriptLogLines': 50,
            };
            return map[k];
        }),
    };

    const load = async (cfg = baseConfig) => {
        jest.resetModules();
        jest.clearAllMocks();
        globals = { appVersion: '1.2.3', influx: { writePoints }, logger, config: cfg };
        await jest.unstable_mockModule('../../globals.js', () => ({ default: globals }));
        mod = await import('../post_to_influxdb.js');
    };

    const tick = () => new Promise((r) => setImmediate(r));

    beforeEach(async () => {
        writePoints.mockResolvedValue(undefined);
        await load();
    });

    test('postButlerMemoryUsageToInfluxdb: writes datapoint and logs on success', async () => {
        mod.postButlerMemoryUsageToInfluxdb({
            heapUsedMByte: 1,
            heapTotalMByte: 2,
            externalMemoryMByte: 3,
            processMemoryMByte: 4,
        });
        await tick();
        expect(writePoints).toHaveBeenCalledTimes(1);
        const arg = writePoints.mock.calls[0][0];
        expect(arg[0].measurement).toBe('butler_memory_usage');
        expect(arg[0].tags.env).toBe('test');
        expect(arg[0].tags.region).toBe('eu');
        expect(arg[0].tags.version).toBe('1.2.3');
        expect(arg[0].fields.heap_used).toBe(1);
        expect(logger.verbose).toHaveBeenCalledWith('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
    });

    test('postButlerMemoryUsageToInfluxdb: logs error on failure', async () => {
        writePoints.mockRejectedValueOnce(new Error('influx down'));
        mod.postButlerMemoryUsageToInfluxdb({ heapUsedMByte: 1, heapTotalMByte: 2, externalMemoryMByte: 3, processMemoryMByte: 4 });
        await tick();
        expect(logger.error).toHaveBeenCalled();
    });

    test('postWindowsServiceStatusToInfluxDB: maps states and logs', async () => {
        const serviceStatus = {
            host: 'h1',
            serviceName: 'svc',
            serviceFriendlyName: 'Svc Nice',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'Disp', startType: 'Automatic' },
        };
        mod.postWindowsServiceStatusToInfluxDB(serviceStatus);
        await tick();
        expect(writePoints).toHaveBeenCalledTimes(1);
        const dp = writePoints.mock.calls[0][0][0];
        expect(dp.measurement).toBe('win_service_state');
        expect(dp.tags.host).toBe('h1');
        expect(dp.tags.service_name).toBe('svc');
        expect(dp.fields.state_num).toBe(4);
        expect(dp.fields.startup_mode_num).toBe(0);
        expect(logger.verbose).toHaveBeenCalledWith('WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB');
    });

    test('postWindowsServiceStatusToInfluxDB: logs error on write failure', async () => {
        writePoints.mockRejectedValueOnce(new Error('nope'));
        mod.postWindowsServiceStatusToInfluxDB({
            host: 'h1',
            serviceName: 'svc',
            serviceFriendlyName: 'Svc Nice',
            serviceStatus: 'RUNNING',
            serviceDetails: { displayName: 'Disp', startType: 'Automatic' },
        });
        await tick();
        expect(logger.error).toHaveBeenCalled();
    });

    test('postQlikSenseVersionToInfluxDB: awaits write and logs', async () => {
        const ver = {
            contentHash: 'abc',
            senseId: 'sid',
            version: 'v',
            deploymentType: 'srv',
            releaseLabel: 'rl',
            deprecatedProductVersion: 'dpv',
            productName: 'pn',
            copyrightYearRange: 'y',
        };
        await mod.postQlikSenseVersionToInfluxDB(ver);
        expect(writePoints).toHaveBeenCalledTimes(1);
        const dp = writePoints.mock.calls[0][0][0];
        expect(dp.measurement).toBe('qlik_sense_version');
        expect(dp.tags.env).toBe('test');
        expect(dp.tags.feature).toBe('version');
        expect(dp.fields.sense_id).toBe('sid');
        expect(logger.verbose).toHaveBeenCalledWith('[QSEOW] QLIK SENSE VERSION: Sent Qlik Sense version to InfluxDB');
    });

    test('postQlikSenseLicenseStatusToInfluxDB: writes multiple rows for enabled types', async () => {
        const status = {
            totalTokens: 50,
            availableTokens: 20,
            tokensEnabled: true,
            userAccess: { enabled: true, tokenCost: 1, allocatedTokens: 2, usedTokens: 3, quarantinedTokens: 4 },
            loginAccess: { enabled: true, tokenCost: 0.1, allocatedTokens: 5, usedTokens: 6, unavailableTokens: 7 },
            professionalAccess: { enabled: true, total: 25, allocated: 5, used: 10, quarantined: 0, excess: 0 },
            analyzerAccess: { enabled: true, total: 25, allocated: 4, used: 8, quarantined: 0, excess: 0 },
            analyzerTimeAccess: { enabled: true, allocatedMinutes: 700, usedMinutes: 100, unavailableMinutes: 0 },
        };
        await mod.postQlikSenseLicenseStatusToInfluxDB(status);
        expect(writePoints).toHaveBeenCalledTimes(1);
        const rows = writePoints.mock.calls[0][0];
        const types = new Set(rows.map((r) => r.tags.license_type));
        expect(types).toEqual(new Set(['analyzer', 'analyzer_capacity', 'professional', 'token_login', 'token_user', 'tokens_available']));
        expect(rows.every((r) => r.measurement === 'qlik_sense_license')).toBe(true);
        expect(logger.info).toHaveBeenCalledWith('[QSEOW] END USER ACCESS LICENSE: Sent aggregated Qlik Sense license status to InfluxDB');
    });

    test('postQlikSenseLicenseReleasedToInfluxDB: writes single row and logs', async () => {
        const release = {
            licenseType: 'professional',
            userDir: 'UD',
            userId: 'john',
            daysSinceLastUse: 42,
        };
        await mod.postQlikSenseLicenseReleasedToInfluxDB(release);
        expect(writePoints).toHaveBeenCalledTimes(1);
        const row = writePoints.mock.calls[0][0][0];
        expect(row.measurement).toBe('qlik_sense_license_release');
        expect(row.tags.user).toBe('UD\\john');
        expect(row.fields.days_since_last_use).toBe(42);
        expect(logger.debug).toHaveBeenCalledWith(
            '[QSEOW] END USER ACCESS LICENSE RELEASE: Sent info on released Qlik Sense license to InfluxDB',
        );
    });

    test('postReloadTaskSuccessInfluxDB: should handle task tags and app tags', async () => {
        const configWithTags = {
            ...baseConfig,
            get: jest.fn((k) => {
                const map = {
                    ...baseConfig.get(k),
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useAppTags': true,
                    'Butler.influxDb.reloadTaskSuccess.tag.dynamic.useTaskTags': true,
                    'Butler.influxDb.reloadTaskSuccess.tag.static': [
                        { name: 'environment', value: 'test' },
                    ],
                };
                return map[k];
            }),
        };

        globals.config = configWithTags;

        const reloadParams = {
            taskId: 'task123',
            taskName: 'Test Task',
            appId: 'app456',
            appName: 'Test App',
            appDescription: 'Test Description',
            scriptLog: {
                executionId: 'exec789',
                scriptLogSize: 1024,
                scriptLogTailCount: 20,
            },
            tags: {
                appTags: [
                    { name: 'Department', value: 'Sales' },
                    { name: 'Region', value: 'EMEA' },
                ],
                taskTags: [
                    { name: 'Priority', value: 'High' },
                    { name: 'Schedule', value: 'Daily' },
                ],
            },
        };

        await mod.postReloadTaskSuccessInfluxDB(reloadParams);
        expect(writePoints).toHaveBeenCalledTimes(1);
        
        const row = writePoints.mock.calls[0][0][0];
        expect(row.tags.Department).toBe('Sales');
        expect(row.tags.Region).toBe('EMEA');
        expect(row.tags.Priority).toBe('High');
        expect(row.tags.Schedule).toBe('Daily');
        expect(row.tags.environment).toBe('test');
    });

    test('postReloadTaskFailureInfluxDB: should handle missing tags gracefully', async () => {
        const reloadParams = {
            taskId: 'task123',
            taskName: 'Test Task',
            appId: 'app456',
            appName: 'Test App',
            appDescription: 'Test Description',
            taskExecutionId: 'exec123',
            executingNodeName: 'node1',
            executionStatusNum: -1,
            executionStatusText: 'Failed',
            scriptLog: {
                executionId: 'exec789',
                scriptLogSize: 1024,
                scriptLogTailCount: 20,
            },
            // No tags provided
        };

        await mod.postReloadTaskFailureInfluxDB(reloadParams);
        expect(writePoints).toHaveBeenCalledTimes(1);
    });

    test('postReloadTaskFailureInfluxDB: should handle different status codes', async () => {
        const reloadParams = {
            taskId: 'task123',
            taskName: 'Test Task',
            appId: 'app456',
            appName: 'Test App',
            executionStatusNum: 7, // Different status
            executionStatusText: 'Aborted',
            scriptLog: {
                executionId: 'exec789',
                scriptLogSize: 2048,
                scriptLogTailCount: 50,
            },
        };

        await mod.postReloadTaskFailureInfluxDB(reloadParams);
        expect(writePoints).toHaveBeenCalledTimes(1);
        
        const row = writePoints.mock.calls[0][0][0];
        expect(row.fields.reload_task_execution_status_num).toBe(7);
        expect(row.fields.reload_task_execution_status_text).toBe('Aborted');
    });

    test('postButlerUptimeInfluxDB: should post uptime data with various fields', async () => {
        const uptimeData = {
            uptimeMillisec: 3600000,
            heapUsedBytes: 134217728,
            heapTotalBytes: 268435456,
            externalBytes: 1048576,
            processMemoryBytes: 402653184,
        };

        await mod.postButlerUptimeInfluxDB(uptimeData);
        expect(writePoints).toHaveBeenCalledTimes(1);
        
        const row = writePoints.mock.calls[0][0][0];
        expect(row.measurement).toBe('butler_memory_usage');
        expect(row.fields.butler_uptime_milliseconds).toBe(3600000);
        expect(row.fields.heap_used_bytes).toBe(134217728);
        expect(row.fields.heap_total_bytes).toBe(268435456);
        expect(row.fields.external_bytes).toBe(1048576);
        expect(row.fields.process_memory_bytes).toBe(402653184);
    });

    test('postQlikSenseVersionInfluxDB: should handle different version formats', async () => {
        const versionData = {
            productName: 'Qlik Sense Enterprise',
            version: '14.56.2',
            buildDate: '2023-10-15T10:30:00.000Z',
            buildNumber: '12345',
            releaseLabel: 'November 2023 Patch 1',
        };

        await mod.postQlikSenseVersionInfluxDB(versionData);
        expect(writePoints).toHaveBeenCalledTimes(1);
        
        const row = writePoints.mock.calls[0][0][0];
        expect(row.measurement).toBe('qlik_sense_version');
        expect(row.fields.product_name).toBe('Qlik Sense Enterprise');
        expect(row.fields.version).toBe('14.56.2');
        expect(row.fields.build_number).toBe('12345');
    });

    test('postQlikSenseLicenseStatusInfluxDB: should handle empty license data', async () => {
        const licenseData = [];

        await mod.postQlikSenseLicenseStatusInfluxDB(licenseData);
        expect(writePoints).toHaveBeenCalledTimes(1);
        
        const rows = writePoints.mock.calls[0][0];
        expect(rows).toHaveLength(0);
    });

    test('postQlikSenseLicenseReleasedToInfluxDB: should handle missing optional fields', async () => {
        const release = {
            licenseType: 'analyzer',
            userDir: 'CORP',
            userId: 'jane.doe',
            // daysSinceLastUse missing
        };

        await mod.postQlikSenseLicenseReleasedToInfluxDB(release);
        expect(writePoints).toHaveBeenCalledTimes(1);
        
        const row = writePoints.mock.calls[0][0][0];
        expect(row.measurement).toBe('qlik_sense_license_release');
        expect(row.tags.user).toBe('CORP\\jane.doe');
        expect(row.fields.days_since_last_use).toBeUndefined();
    });

    test('should handle InfluxDB connection errors gracefully', async () => {
        writePoints.mockRejectedValue(new Error('InfluxDB connection failed'));

        const uptimeData = {
            uptimeMillisec: 3600000,
            heapUsedBytes: 134217728,
        };

        // Should not throw
        await expect(mod.postButlerUptimeInfluxDB(uptimeData)).resolves.not.toThrow();
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('InfluxDB connection failed')
        );
    });

    test('postReloadTaskSuccessInfluxDB: should handle null/undefined parameters', async () => {
        await mod.postReloadTaskSuccessInfluxDB(null);
        // Should not crash and not call writePoints
        expect(writePoints).not.toHaveBeenCalled();
    });

    test('postReloadTaskFailureInfluxDB: should handle null/undefined parameters', async () => {
        await mod.postReloadTaskFailureInfluxDB(undefined);
        // Should not crash and not call writePoints
        expect(writePoints).not.toHaveBeenCalled();
    });
});
