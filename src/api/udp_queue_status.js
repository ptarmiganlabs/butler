/**
 * UDP Queue Status API
 *
 * Provides real-time status and metrics for the UDP message queue
 */

import globals from '../globals.js';

/**
 * Get current UDP queue status and metrics
 *
 * @param {object} request - Fastify request object
 * @param {object} reply - Fastify reply object
 * @returns {Promise<object>} Queue status and metrics
 */
const udpQueueStatus = async (request, reply) => {
    try {
        // Check if UDP server is enabled
        if (!globals.config.get('Butler.udpServerConfig.enable')) {
            reply.code(503).send({
                statusCode: 503,
                error: 'Service Unavailable',
                message: 'UDP server is disabled',
            });
            return;
        }

        // Check if queue manager is initialized
        if (!globals.udpQueueManager) {
            reply.code(503).send({
                statusCode: 503,
                error: 'Service Unavailable',
                message: 'UDP queue manager not initialized',
            });
            return;
        }

        // Get current metrics
        const metrics = await globals.udpQueueManager.getMetrics();

        // Get configuration
        const config = {
            messageQueue: globals.config.get('Butler.udpServerConfig.messageQueue'),
            rateLimit: globals.config.get('Butler.udpServerConfig.rateLimit'),
            maxMessageSize: globals.config.get('Butler.udpServerConfig.maxMessageSize'),
        };

        // Determine health status
        let healthStatus = 'healthy';
        let healthReasons = [];

        // Check queue utilization
        if (metrics.queueUtilizationPct >= 90) {
            healthStatus = 'unhealthy';
            healthReasons.push(`Queue utilization critical: ${metrics.queueUtilizationPct.toFixed(1)}%`);
        } else if (metrics.queueUtilizationPct >= config.messageQueue.backpressureThreshold) {
            healthStatus = 'degraded';
            healthReasons.push(`Queue utilization high: ${metrics.queueUtilizationPct.toFixed(1)}%`);
        }

        // Check message drop rate
        const dropRate = metrics.messagesReceived > 0 ? (metrics.messagesDroppedTotal / metrics.messagesReceived) * 100 : 0;
        if (dropRate >= 10) {
            healthStatus = 'unhealthy';
            healthReasons.push(`High message drop rate: ${dropRate.toFixed(1)}%`);
        } else if (dropRate >= 5) {
            if (healthStatus === 'healthy') healthStatus = 'degraded';
            healthReasons.push(`Elevated message drop rate: ${dropRate.toFixed(1)}%`);
        }

        // Check failure rate
        const failureRate = metrics.messagesProcessed > 0 ? (metrics.messagesFailed / metrics.messagesProcessed) * 100 : 0;
        if (failureRate >= 10) {
            healthStatus = 'unhealthy';
            healthReasons.push(`High failure rate: ${failureRate.toFixed(1)}%`);
        } else if (failureRate >= 5) {
            if (healthStatus === 'healthy') healthStatus = 'degraded';
            healthReasons.push(`Elevated failure rate: ${failureRate.toFixed(1)}%`);
        }

        // Calculate rate limit utilization
        const rateLimitUtilization =
            config.rateLimit.enable && config.rateLimit.maxMessagesPerMinute > 0
                ? (metrics.rateLimitCurrent / config.rateLimit.maxMessagesPerMinute) * 100
                : 0;

        // Build response
        const response = {
            enabled: true,
            queue: {
                currentSize: metrics.queueSize,
                maxSize: metrics.queueMaxSize,
                utilizationPercent: Math.round(metrics.queueUtilizationPct * 10) / 10,
                processingConcurrent: metrics.queuePending,
                maxConcurrent: config.messageQueue.maxConcurrent,
            },
            metrics: {
                messagesReceived: {
                    total: metrics.messagesReceived,
                    lastMinute: metrics.messagesReceivedLastMinute,
                    lastHour: metrics.messagesReceivedLastHour,
                },
                messagesProcessed: {
                    total: metrics.messagesProcessed,
                    lastMinute: metrics.messagesProcessedLastMinute,
                    successful: metrics.messagesProcessedSuccessful,
                    failed: metrics.messagesFailed,
                },
                messagesDropped: {
                    total: metrics.messagesDroppedTotal,
                    rateLimited: metrics.messagesDroppedRateLimit,
                    queueFull: metrics.messagesDroppedQueueFull,
                    oversized: metrics.messagesDroppedSize,
                },
                processingTime: {
                    averageMs: Math.round(metrics.processingTimeAvgMs),
                    p95Ms: Math.round(metrics.processingTimeP95Ms),
                    p99Ms: Math.round(metrics.processingTimeP99Ms),
                    maxMs: Math.round(metrics.processingTimeMaxMs),
                },
            },
            rateLimit: {
                enabled: config.rateLimit.enable,
                maxPerMinute: config.rateLimit.maxMessagesPerMinute,
                currentRate: metrics.rateLimitCurrent,
                utilizationPercent: Math.round(rateLimitUtilization * 10) / 10,
            },
            health: {
                status: healthStatus,
                reasons: healthReasons.length > 0 ? healthReasons : undefined,
                backpressure: metrics.backpressureActive === 1,
            },
            timestamp: new Date().toISOString(),
        };

        reply.code(200).send(response);
    } catch (err) {
        globals.logger.error(`[UDP Queue Status API] Error getting queue status: ${globals.getErrorMessage(err)}`);
        reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to retrieve queue status',
        });
    }
};

export default udpQueueStatus;
