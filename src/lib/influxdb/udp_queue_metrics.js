import _ from 'lodash';

import globals from '../../globals.js';

let udpQueueMetricsTimerHandle = null;

/**
 * Sends UDP queue metrics to InfluxDB.
 *
 * Builds a datapoint with fields from enabled metric categories,
 * applies global and feature-specific tags, then writes to InfluxDB.
 *
 * @param {object} metrics Snapshot from UdpQueueManager.getMetrics()
 * @param {string} measurementName InfluxDB measurement name
 * @param {() => (void|Promise<void>)} [onSuccess] Optional callback invoked after successful write
 * @param {() => (void|Promise<void>)} [onComplete] Optional callback invoked after write attempt completes
 * @returns {Promise<void>}
 */
export function postUdpQueueMetricsToInfluxDb(metrics, measurementName, onSuccess, onComplete) {
    let tags = {};

    // Get global static tags from Butler.influxDb.tag.static
    const configStaticTags = globals.config.get('Butler.influxDb.tag.static');
    if (configStaticTags) {
        for (const item of configStaticTags) {
            tags[item.name] = item.value;
        }
    }

    // Get feature-specific tags from queueMetrics.influxdb.tags
    const featureTags = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.tags');
    if (featureTags) {
        for (const item of featureTags) {
            tags[item.name] = item.value;
        }
    }

    // Add queue_type tag
    if (metrics.queueType) {
        tags.queue_type = metrics.queueType;
    }

    // Build fields based on enabled categories
    const fields = {};

    // Drop counters category
    const dropCountersEnabled = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.metrics.dropCounters.enable');
    if (dropCountersEnabled !== false) {
        fields.messages_dropped_total = metrics.messagesDroppedTotal;
        fields.messages_dropped_queue_full = metrics.messagesDroppedQueueFull;
        fields.messages_dropped_rate_limit = metrics.messagesDroppedRateLimit;
        fields.messages_dropped_size = metrics.messagesDroppedSize;
    }

    // Message counters category
    const messageCountersEnabled = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.metrics.messageCounters.enable');
    if (messageCountersEnabled !== false) {
        fields.messages_received = metrics.messagesReceived;
        fields.messages_queued = metrics.messagesQueued;
        fields.messages_processed = metrics.messagesProcessed;
        fields.messages_failed = metrics.messagesFailed;
    }

    // Queue state category
    const queueStateEnabled = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.metrics.queueState.enable');
    if (queueStateEnabled !== false) {
        fields.queue_size = metrics.queueSize;
        fields.queue_utilization_pct = metrics.queueUtilizationPct;
        fields.queue_pending = metrics.queuePending;
        fields.backpressure_active = metrics.backpressureActive;
    }

    // Processing times category
    const processingTimesEnabled = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.metrics.processingTimes.enable');
    if (processingTimesEnabled !== false) {
        fields.processing_time_avg_ms = metrics.processingTimeAvgMs;
        fields.processing_time_p95_ms = metrics.processingTimeP95Ms;
        fields.processing_time_max_ms = metrics.processingTimeMaxMs;
    }

    // Dedup category
    const dedupEnabled = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.metrics.dedup.enable');
    if (dedupEnabled !== false) {
        fields.deduplication_cache_size = metrics.deduplicationCacheSize;
        fields.messages_dropped_duplicate = metrics.messagesDroppedDuplicate;
    }

    // Rate limit category
    const rateLimitEnabled = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.metrics.rateLimit.enable');
    if (rateLimitEnabled !== false) {
        fields.rate_limit_current = metrics.rateLimitCurrent;
    }

    // Construct the InfluxDB datapoint
    let datapoint = [
        {
            measurement: measurementName,
            tags: tags,
            fields: fields,
        },
    ];

    // Deep clone the datapoint to avoid mutating the original reference
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    // Asynchronously write the datapoint to InfluxDB
    return globals.influx
        .writePoints(deepClonedDatapoint)
        .then(() => {
            globals.logger.silly(`UDP QUEUE METRICS: InfluxDB datapoint for UDP queue metrics: ${JSON.stringify(datapoint, null, 2)}`);
            datapoint = null;
            globals.logger.verbose('UDP QUEUE METRICS: Sent UDP queue metrics to InfluxDB');
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
        })
        .catch((err) => {
            globals.logger.error(`UDP QUEUE METRICS: Error saving UDP queue metrics to InfluxDB! ${globals.getErrorMessage(err)}`);
        })
        .finally(() => {
            if (typeof onComplete === 'function') {
                onComplete();
            }
        });
}

/**
 * Starts the periodic timer that writes UDP queue metrics to InfluxDB.
 *
 * Reads configuration for write frequency and measurement name,
 * then sets up an interval that collects metrics, writes them,
 * and clears the counters (snapshot-and-reset pattern).
 *
 * @returns {void}
 */
export function startUdpQueueMetricsTimer() {
    const writeFrequency = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.writeFrequency');
    const measurementName = globals.config.get('Butler.udpServerConfig.queueMetrics.influxdb.measurementName');
    let writeInProgress = false;

    if (udpQueueMetricsTimerHandle) {
        globals.logger.warn('UDP QUEUE METRICS: Periodic InfluxDB writer already running, skipping duplicate initialization');
        return;
    }

    globals.logger.info(
        `UDP QUEUE METRICS: Starting periodic InfluxDB writer (interval: ${writeFrequency}ms, measurement: ${measurementName})`,
    );

    udpQueueMetricsTimerHandle = setInterval(async () => {
        if (writeInProgress) {
            return;
        }
        writeInProgress = true;

        // Guard: skip if queue manager is not yet initialized
        if (!globals.udpQueueManager) {
            globals.logger.warn('UDP QUEUE METRICS: Queue manager not initialized, skipping write');
            writeInProgress = false;
            return;
        }

        try {
            // Get current metrics snapshot
            const metrics = await globals.udpQueueManager.getMetrics();

            // Add queue type to metrics for tagging
            metrics.queueType = globals.udpQueueManager.queueType;

            // Write to InfluxDB, then clear counters only after a successful write
            postUdpQueueMetricsToInfluxDb(
                metrics,
                measurementName,
                () => {
                    globals.udpQueueManager.clearMetrics().catch((err) => {
                        globals.logger.error(`UDP QUEUE METRICS: Error clearing metrics after write: ${globals.getErrorMessage(err)}`);
                    });
                },
                () => {
                    writeInProgress = false;
                },
            );
        } catch (err) {
            globals.logger.error(`UDP QUEUE METRICS: Error in periodic write: ${globals.getErrorMessage(err)}`);
            writeInProgress = false;
        }
    }, writeFrequency);

    // Optional chaining keeps fake-timer environments from throwing if unref() is not implemented.
    udpQueueMetricsTimerHandle.unref?.();
}
