import { jest } from '@jest/globals';

describe('lib/influxdb/udp_queue_metrics', () => {
    let postUdpQueueMetricsToInfluxDb;
    let startUdpQueueMetricsTimer;
    let mockGlobals;
    let mockInfluxWritePoints;
    let mockCloneDeep;

    const mockMetrics = {
        queueType: 'task_results',
        queueSize: 5,
        queueMaxSize: 100,
        queueUtilizationPct: 5,
        queuePending: 2,
        messagesReceived: 100,
        messagesQueued: 90,
        messagesProcessed: 85,
        messagesFailed: 5,
        messagesDroppedTotal: 10,
        messagesDroppedRateLimit: 3,
        messagesDroppedQueueFull: 4,
        messagesDroppedSize: 1,
        messagesDroppedDuplicate: 2,
        deduplicationCacheSize: 15,
        processingTimeAvgMs: 50,
        processingTimeP95Ms: 120,
        processingTimeMaxMs: 200,
        rateLimitCurrent: 50,
        backpressureActive: 0,
    };

    const defaultConfigValues = {
        'Butler.influxDb.tag.static': [{ name: 'env', value: 'production' }],
        'Butler.udpServerConfig.queueMetrics.influxdb.tags': [{ name: 'host', value: 'butler-01' }],
        'Butler.udpServerConfig.queueMetrics.influxdb.writeFrequency': 20000,
        'Butler.udpServerConfig.queueMetrics.influxdb.measurementName': 'butler_udp_queue',
        'Butler.udpServerConfig.queueMetrics.influxdb.metrics.dropCounters.enable': true,
        'Butler.udpServerConfig.queueMetrics.influxdb.metrics.messageCounters.enable': true,
        'Butler.udpServerConfig.queueMetrics.influxdb.metrics.queueState.enable': true,
        'Butler.udpServerConfig.queueMetrics.influxdb.metrics.processingTimes.enable': true,
        'Butler.udpServerConfig.queueMetrics.influxdb.metrics.dedup.enable': true,
        'Butler.udpServerConfig.queueMetrics.influxdb.metrics.rateLimit.enable': true,
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
                get: jest.fn((key) => defaultConfigValues[key] ?? null),
            },
            logger: {
                silly: jest.fn(),
                verbose: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            },
            influx: mockInflux,
            isSea: false,
            getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
            udpQueueManager: null,
        };

        await jest.unstable_mockModule('lodash', () => ({
            default: { cloneDeep: mockCloneDeep },
        }));

        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        const module = await import('../udp_queue_metrics.js');
        postUdpQueueMetricsToInfluxDb = module.postUdpQueueMetricsToInfluxDb;
        startUdpQueueMetricsTimer = module.startUdpQueueMetricsTimer;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockInfluxWritePoints.mockReset();
        mockGlobals.config.get.mockImplementation((key) => defaultConfigValues[key] ?? null);
    });

    test('sends queue metrics to InfluxDB with correct measurement name', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        expect(mockInfluxWritePoints).toHaveBeenCalled();
        const datapoint = mockInfluxWritePoints.mock.calls[0][0];
        expect(datapoint).toHaveLength(1);
        expect(datapoint[0].measurement).toBe('butler_udp_queue');
    });

    test('includes all fields when all categories enabled', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        const fields = mockInfluxWritePoints.mock.calls[0][0][0].fields;

        // Drop counters
        expect(fields.messages_dropped_total).toBe(10);
        expect(fields.messages_dropped_queue_full).toBe(4);
        expect(fields.messages_dropped_rate_limit).toBe(3);
        expect(fields.messages_dropped_size).toBe(1);

        // Message counters
        expect(fields.messages_received).toBe(100);
        expect(fields.messages_queued).toBe(90);
        expect(fields.messages_processed).toBe(85);
        expect(fields.messages_failed).toBe(5);

        // Queue state
        expect(fields.queue_size).toBe(5);
        expect(fields.queue_utilization_pct).toBe(5);
        expect(fields.queue_pending).toBe(2);
        expect(fields.backpressure_active).toBe(0);

        // Processing times
        expect(fields.processing_time_avg_ms).toBe(50);
        expect(fields.processing_time_p95_ms).toBe(120);
        expect(fields.processing_time_max_ms).toBe(200);

        // Dedup
        expect(fields.deduplication_cache_size).toBe(15);
        expect(fields.messages_dropped_duplicate).toBe(2);

        // Rate limit
        expect(fields.rate_limit_current).toBe(50);
    });

    test('excludes fields for disabled categories', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.udpServerConfig.queueMetrics.influxdb.metrics.dropCounters.enable') return false;
            if (key === 'Butler.udpServerConfig.queueMetrics.influxdb.metrics.processingTimes.enable') return false;
            return defaultConfigValues[key] ?? null;
        });

        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        const fields = mockInfluxWritePoints.mock.calls[0][0][0].fields;

        // Drop counters should be excluded
        expect(fields.messages_dropped_total).toBeUndefined();
        expect(fields.messages_dropped_queue_full).toBeUndefined();

        // Processing times should be excluded
        expect(fields.processing_time_avg_ms).toBeUndefined();
        expect(fields.processing_time_p95_ms).toBeUndefined();

        // Other categories should still be present
        expect(fields.messages_received).toBe(100);
        expect(fields.queue_size).toBe(5);
        expect(fields.deduplication_cache_size).toBe(15);
        expect(fields.rate_limit_current).toBe(50);
    });

    test('applies global static tags', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        const tags = mockInfluxWritePoints.mock.calls[0][0][0].tags;
        expect(tags.env).toBe('production');
    });

    test('applies feature-specific tags', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        const tags = mockInfluxWritePoints.mock.calls[0][0][0].tags;
        expect(tags.host).toBe('butler-01');
    });

    test('applies queue_type tag from metrics', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        const tags = mockInfluxWritePoints.mock.calls[0][0][0].tags;
        expect(tags.queue_type).toBe('task_results');
    });

    test('handles missing static tags gracefully', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.influxDb.tag.static') return null;
            if (key === 'Butler.udpServerConfig.queueMetrics.influxdb.tags') return null;
            return defaultConfigValues[key] ?? null;
        });

        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        const tags = mockInfluxWritePoints.mock.calls[0][0][0].tags;
        expect(tags.env).toBeUndefined();
        expect(tags.host).toBeUndefined();
        expect(tags.queue_type).toBe('task_results');
    });

    test('handles InfluxDB write error', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn(() => ({
                catch: jest.fn((cb) => {
                    cb(new Error('InfluxDB connection failed'));
                }),
            })),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        expect(mockGlobals.logger.error).toHaveBeenCalled();
        expect(mockGlobals.logger.error.mock.calls[0][0]).toContain('UDP QUEUE METRICS');
    });

    test('deep clones datapoint before writing', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        expect(mockCloneDeep).toHaveBeenCalled();
    });

    test('logs verbose message after successful write', () => {
        mockInfluxWritePoints.mockReturnValue({
            then: jest.fn((cb) => {
                cb();
                return { catch: jest.fn() };
            }),
        });

        postUdpQueueMetricsToInfluxDb(mockMetrics, 'butler_udp_queue');

        expect(mockGlobals.logger.verbose).toHaveBeenCalledWith('UDP QUEUE METRICS: Sent UDP queue metrics to InfluxDB');
    });

    describe('startUdpQueueMetricsTimer', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('logs info message when starting timer', () => {
            startUdpQueueMetricsTimer();

            expect(mockGlobals.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('UDP QUEUE METRICS: Starting periodic InfluxDB writer'),
            );
        });

        test('calls getMetrics and writePoints at configured interval', async () => {
            const mockGetMetrics = jest.fn().mockResolvedValue({ ...mockMetrics });
            const mockClearMetrics = jest.fn().mockResolvedValue();

            mockGlobals.udpQueueManager = {
                getMetrics: mockGetMetrics,
                clearMetrics: mockClearMetrics,
                queueType: 'task_results',
            };

            mockInfluxWritePoints.mockReturnValue({
                then: jest.fn((cb) => {
                    cb();
                    return { catch: jest.fn() };
                }),
            });

            startUdpQueueMetricsTimer();

            // Advance timer by writeFrequency (20000ms)
            await jest.advanceTimersByTimeAsync(20000);

            expect(mockGetMetrics).toHaveBeenCalled();
            expect(mockInfluxWritePoints).toHaveBeenCalled();
            expect(mockClearMetrics).toHaveBeenCalled();
        });

        test('skips write when queue manager is not initialized', async () => {
            mockGlobals.udpQueueManager = null;

            startUdpQueueMetricsTimer();

            await jest.advanceTimersByTimeAsync(20000);

            expect(mockGlobals.logger.warn).toHaveBeenCalledWith(expect.stringContaining('Queue manager not initialized'));
            expect(mockInfluxWritePoints).not.toHaveBeenCalled();
        });
    });
});
