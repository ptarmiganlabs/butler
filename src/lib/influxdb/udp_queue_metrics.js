/**
 * UDP Queue Metrics to InfluxDB
 *
 * Stores UDP message queue metrics to InfluxDB for monitoring queue health,
 * backpressure, dropped messages, and processing performance.
 */

import globals from '../../globals.js';

/**
 * Store UDP queue metrics to InfluxDB
 *
 * This function retrieves metrics from the UDP queue manager and stores them
 * in InfluxDB for monitoring queue health, backpressure, dropped messages, and
 * processing performance.
 *
 * @returns {Promise<void>} A promise that resolves when metrics are stored
 */
export async function postUdpQueueMetricsToInfluxdb() {
    try {
        // Check if queue metrics are enabled
        if (!globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.enable')) {
            return;
        }

        // Get metrics from queue manager
        const queueManager = globals.udpQueueManager;
        if (!queueManager) {
            globals.logger.warn('[UDP Queue Metrics] Queue manager not initialized');
            return;
        }

        const metrics = await queueManager.getMetrics();

        // Get configuration
        const measurementName = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.measurementName');
        const configTags = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.tags');

        // InfluxDB 1.x
        if (globals.influxDb && globals.influxDb.dbName) {
            const point = {
                measurement: measurementName,
                tags: {
                    queue_type: 'reload_task_events',
                    host: globals.hostInfo.si.os.hostname,
                },
                fields: {
                    queue_size: metrics.queueSize,
                    queue_max_size: metrics.queueMaxSize,
                    queue_utilization_pct: metrics.queueUtilizationPct,
                    queue_pending: metrics.queuePending,
                    messages_received: metrics.messagesReceived,
                    messages_received_last_minute: metrics.messagesReceivedLastMinute,
                    messages_received_last_hour: metrics.messagesReceivedLastHour,
                    messages_queued: metrics.messagesQueued,
                    messages_processed: metrics.messagesProcessed,
                    messages_processed_last_minute: metrics.messagesProcessedLastMinute,
                    messages_processed_successful: metrics.messagesProcessedSuccessful,
                    messages_failed: metrics.messagesFailed,
                    messages_dropped_total: metrics.messagesDroppedTotal,
                    messages_dropped_rate_limit: metrics.messagesDroppedRateLimit,
                    messages_dropped_queue_full: metrics.messagesDroppedQueueFull,
                    messages_dropped_size: metrics.messagesDroppedSize,
                    processing_time_avg_ms: metrics.processingTimeAvgMs,
                    processing_time_p95_ms: metrics.processingTimeP95Ms,
                    processing_time_p99_ms: metrics.processingTimeP99Ms,
                    processing_time_max_ms: metrics.processingTimeMaxMs,
                    rate_limit_current: metrics.rateLimitCurrent,
                    backpressure_active: metrics.backpressureActive,
                },
            };

            // Add static tags from config file
            if (configTags && configTags.length > 0) {
                configTags.forEach((item) => {
                    point.tags[item.name] = item.value;
                });
            }

            try {
                await globals.influx.writePoints([point]);
                globals.logger.verbose('[UDP Queue Metrics] Sent queue metrics data to InfluxDB');
            } catch (err) {
                globals.logger.error(`[UDP Queue Metrics] Error saving data to InfluxDB: ${globals.getErrorMessage(err)}`);
                return;
            }
        }

        // Clear metrics after writing
        await queueManager.clearMetrics();
    } catch (err) {
        globals.logger.error(`[UDP Queue Metrics] Error posting queue metrics: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Set up periodic UDP queue metrics storage to InfluxDB
 *
 * @returns {NodeJS.Timeout|null} The interval ID for the metrics writer, or null if disabled
 */
export function setupUdpQueueMetricsStorage() {
    // Check if InfluxDB is enabled
    if (!globals.config.get('Butler.influxDb.enable')) {
        globals.logger.info('[UDP Queue Metrics] InfluxDB is disabled. Skipping setup of queue metrics storage');
        return null;
    }

    // Check if queue metrics are enabled
    if (!globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.enable')) {
        globals.logger.info('[UDP Queue Metrics] Queue metrics to InfluxDB is disabled');
        return null;
    }

    // Check if UDP server is enabled
    if (!globals.config.get('Butler.udpServerConfig.enable')) {
        globals.logger.info('[UDP Queue Metrics] UDP server is disabled. Skipping setup of queue metrics storage');
        return null;
    }

    const writeFrequency = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.writeFrequency');

    globals.logger.info(`[UDP Queue Metrics] Setting up periodic storage of UDP queue metrics to InfluxDB (interval: ${writeFrequency}ms)`);

    const intervalId = setInterval(async () => {
        try {
            globals.logger.verbose('[UDP Queue Metrics] Timer for storing queue metrics to InfluxDB triggered');
            await postUdpQueueMetricsToInfluxdb();
        } catch (err) {
            globals.logger.error(`[UDP Queue Metrics] Error in queue metrics storage interval: ${globals.getErrorMessage(err)}`);
        }
    }, writeFrequency);

    return intervalId;
}
