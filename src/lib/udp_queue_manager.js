/**
 * UDP Queue Manager
 *
 * Manages UDP message processing with queuing, rate limiting, and metrics tracking.
 * Provides protection against message flooding and resource exhaustion.
 *
 * Based on Butler SOS implementation in butler-sos/src/lib/udp-queue-manager.js
 */

import PQueue from 'p-queue';
import { Mutex } from 'async-mutex';

/**
 * Circular buffer for tracking processing times
 */
class CircularBuffer {
    /**
     * Create a circular buffer
     *
     * @param {number} size - Maximum number of items to store
     */
    constructor(size) {
        this.buffer = new Array(size);
        this.size = size;
        this.index = 0;
        this.count = 0;
    }

    /**
     * Add a value to the buffer
     *
     * @param {number} value - Value to add
     */
    add(value) {
        this.buffer[this.index] = value;
        this.index = (this.index + 1) % this.size;
        if (this.count < this.size) {
            this.count++;
        }
    }

    /**
     * Get all values currently in the buffer
     *
     * @returns {number[]} Array of values
     */
    getValues() {
        if (this.count === 0) return [];

        if (this.count < this.size) {
            return this.buffer.slice(0, this.count);
        }

        // Buffer is full, need to reorder to get chronological order
        return [...this.buffer.slice(this.index), ...this.buffer.slice(0, this.index)];
    }

    /**
     * Calculate the 95th percentile of values in the buffer
     *
     * @returns {number|null} 95th percentile value or null if buffer is empty
     */
    getPercentile95() {
        if (this.count === 0) return null;

        const values = this.getValues().sort((a, b) => a - b);
        const index = Math.ceil(values.length * 0.95) - 1;
        return values[index];
    }

    /**
     * Calculate the average of values in the buffer
     *
     * @returns {number|null} Average value or null if buffer is empty
     */
    getAverage() {
        if (this.count === 0) return null;

        const values = this.getValues();
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
    }

    /**
     * Get the maximum value in the buffer
     *
     * @returns {number|null} Maximum value or null if buffer is empty
     */
    getMax() {
        if (this.count === 0) return null;

        const values = this.getValues();
        return Math.max(...values);
    }

    /**
     * Clear the buffer
     *
     * @returns {void}
     */
    clear() {
        this.buffer = new Array(this.size);
        this.index = 0;
        this.count = 0;
    }
}

/**
 * Fixed-window rate limiter
 */
class RateLimiter {
    /**
     * Create a rate limiter
     *
     * @param {number} maxMessagesPerMinute - Maximum messages allowed per minute
     */
    constructor(maxMessagesPerMinute) {
        this.maxMessagesPerMinute = maxMessagesPerMinute;
        this.messageCount = 0;
        this.windowStart = Date.now();
    }

    /**
     * Check if a message can be processed within the rate limit
     *
     * @returns {boolean} True if message can be processed, false otherwise
     */
    checkLimit() {
        const now = Date.now();
        const windowDuration = 60000; // 1 minute in milliseconds

        // Check if we need to reset the window
        if (now - this.windowStart >= windowDuration) {
            this.messageCount = 0;
            this.windowStart = now;
        }

        // Check if we're under the limit
        if (this.messageCount < this.maxMessagesPerMinute) {
            this.messageCount++;
            return true;
        }

        return false;
    }

    /**
     * Get current rate (messages per minute in current window)
     *
     * @returns {number} Current message rate
     */
    getCurrentRate() {
        const now = Date.now();
        const windowDuration = 60000;

        // If window has expired, rate is 0
        if (now - this.windowStart >= windowDuration) {
            return 0;
        }

        // Calculate rate based on time elapsed in current window
        const elapsedSeconds = (now - this.windowStart) / 1000;
        if (elapsedSeconds === 0) return 0;

        return Math.round((this.messageCount / elapsedSeconds) * 60);
    }
}

/**
 * UDP Queue Manager
 * Manages message queue, rate limiting, metrics tracking, and input validation
 */
export class UdpQueueManager {
    /**
     * Create a UDP queue manager
     *
     * @param {object} config - Configuration object
     * @param {object} config.messageQueue - Queue configuration
     * @param {number} config.messageQueue.maxConcurrent - Maximum concurrent operations
     * @param {number} config.messageQueue.maxSize - Maximum queue size
     * @param {number} config.messageQueue.backpressureThreshold - Backpressure threshold fraction (0-1)
     * @param {object} config.rateLimit - Rate limit configuration
     * @param {boolean} config.rateLimit.enable - Enable rate limiting
     * @param {number} config.rateLimit.maxMessagesPerMinute - Max messages per minute
     * @param {number} [config.maxMessageSize] - Maximum message size in bytes (optional)
     * @param {object} logger - Logger instance
     * @param {string} queueType - Type of queue ('task_results' or other identifier)
     */
    constructor(config, logger, queueType) {
        // Validate config at construction time to fail fast
        if (!config?.messageQueue?.maxConcurrent || config.messageQueue.maxConcurrent < 1) {
            throw new Error('[UDP Queue] Invalid messageQueue.maxConcurrent: must be >= 1');
        }
        if (!config?.messageQueue?.maxSize || config.messageQueue.maxSize < 1) {
            throw new Error('[UDP Queue] Invalid messageQueue.maxSize: must be >= 1');
        }
        const bp = config?.messageQueue?.backpressureThreshold;
        if (typeof bp !== 'number' || Number.isNaN(bp) || bp < 0 || bp > 100) {
            throw new Error('[UDP Queue] Invalid messageQueue.backpressureThreshold: must be a percentage value between 0 and 100');
        }

        this.config = {
            ...config,
            maxMessageSize: Number.isFinite(config?.maxMessageSize) ? config.maxMessageSize : Number.POSITIVE_INFINITY,
        };
        this.logger = logger;
        this.queueType = queueType;

        // Initialize message queue
        this.queue = new PQueue({
            concurrency: config.messageQueue.maxConcurrent,
        });

        // Initialize rate limiter if enabled
        this.rateLimiter = config.rateLimit.enable ? new RateLimiter(config.rateLimit.maxMessagesPerMinute) : null;

        // Initialize metrics tracking
        this.metrics = {
            messagesReceived: 0,
            messagesQueued: 0,
            messagesProcessed: 0,
            messagesFailed: 0,
            messagesDroppedTotal: 0,
            messagesDroppedRateLimit: 0,
            messagesDroppedQueueFull: 0,
            messagesDroppedSize: 0,
        };

        // Circular buffer for processing times (last 1000 messages)
        this.processingTimeBuffer = new CircularBuffer(1000);

        // Mutex for thread-safe metrics updates
        this.metricsMutex = new Mutex();

        // Track backpressure state
        this.backpressureActive = false;
        this.lastBackpressureWarning = 0;

        // Drop tracking for logging
        this.droppedSinceLastLog = 0;
        this.lastDropLog = Date.now();
    }

    /**
     * Validate message size
     *
     * @param {Buffer|string} message - Message to validate
     * @returns {boolean} True if message size is valid
     */
    validateMessageSize(message) {
        const size = Buffer.isBuffer(message) ? message.length : Buffer.byteLength(message);
        return size <= this.config.maxMessageSize;
    }

    /**
     * Check if rate limit allows processing
     *
     * @returns {boolean} True if message can be processed
     */
    checkRateLimit() {
        if (!this.rateLimiter) return true;
        return this.rateLimiter.checkLimit();
    }

    /**
     * Get configured backpressure threshold as a fraction in the range 0-1
     *
     * @returns {number} Backpressure threshold as fraction
     */
    getBackpressureThreshold() {
        return this.config.messageQueue.backpressureThreshold;
    }

    /**
     * Check backpressure and log warning if threshold exceeded
     *
     * @param {number} queueSize - The current queue size (captured while holding mutex)
     * @returns {Promise<void>}
     */
    async checkBackpressure(queueSize) {
        const utilization = queueSize / this.config.messageQueue.maxSize;
        const threshold = this.getBackpressureThreshold() / 100; // Convert percentage (0-100) to fraction (0-1)
        const now = Date.now();

        if (utilization >= threshold && !this.backpressureActive) {
            this.backpressureActive = true;
            this.lastBackpressureWarning = now;
            this.logger.warn(
                `[UDP Queue] Backpressure detected for ${this.queueType}: Queue utilization ${(utilization * 100).toFixed(1)}% (threshold: ${this.getBackpressureThreshold()}%)`,
            );
        } else if (utilization < threshold * 0.8 && this.backpressureActive) {
            // Clear backpressure when utilization drops below 80% of threshold
            this.backpressureActive = false;
            this.logger.info(
                `[UDP Queue] Backpressure cleared for ${this.queueType}: Queue utilization ${(utilization * 100).toFixed(1)}%`,
            );
        }

        // Log warning every 60 seconds if backpressure is active
        if (this.backpressureActive && now - this.lastBackpressureWarning > 60000) {
            this.logger.warn(
                `[UDP Queue] Backpressure continues for ${this.queueType}: Queue size ${queueSize}/${this.config.messageQueue.maxSize}`,
            );
            this.lastBackpressureWarning = now;
        }
    }

    /**
     * Log dropped messages periodically (not individual messages)
     *
     * @returns {void}
     */
    logDroppedMessages() {
        const now = Date.now();
        if (this.droppedSinceLastLog > 0 && now - this.lastDropLog > 60000) {
            this.logger.warn(`[UDP Queue] Dropped ${this.droppedSinceLastLog} messages for ${this.queueType} in the last minute`);
            this.droppedSinceLastLog = 0;
            this.lastDropLog = now;
        }
    }

    /**
     * Add message to queue for processing
     *
     * @param {() => Promise<void>} processFunction - Async function that processes the message
     * @returns {Promise<boolean>} True if message was queued, false if dropped
     */
    async addToQueue(processFunction) {
        let queueSize;
        const release = await this.metricsMutex.acquire();
        try {
            this.metrics.messagesReceived++;

            // Check if queue is full
            if (this.queue.size >= this.config.messageQueue.maxSize) {
                this.metrics.messagesDroppedTotal++;
                this.metrics.messagesDroppedQueueFull++;
                this.droppedSinceLastLog++;
                this.logDroppedMessages();
                return false;
            }

            this.metrics.messagesQueued++;

            // Capture queue size while holding mutex to avoid race condition
            queueSize = this.queue.size;
        } finally {
            release();
        }

        // Check backpressure with captured queue size
        await this.checkBackpressure(queueSize);

        // Add to queue
        this.queue
            .add(async () => {
                const startTime = Date.now();
                try {
                    await processFunction();

                    const processingTime = Date.now() - startTime;
                    const release2 = await this.metricsMutex.acquire();
                    try {
                        this.metrics.messagesProcessed++;
                        this.processingTimeBuffer.add(processingTime);
                    } finally {
                        release2();
                    }
                } catch (error) {
                    const release2 = await this.metricsMutex.acquire();
                    try {
                        this.metrics.messagesFailed++;
                    } finally {
                        release2();
                    }
                    throw error;
                }
            })
            .catch((error) => {
                this.logger.error(`[UDP Queue] Error processing message for ${this.queueType}: ${error.message}`);
            });

        return true;
    }

    /**
     * Handle message drop due to rate limiting
     *
     * @returns {Promise<void>}
     */
    async handleRateLimitDrop() {
        const release = await this.metricsMutex.acquire();
        try {
            this.metrics.messagesReceived++;
            this.metrics.messagesDroppedTotal++;
            this.metrics.messagesDroppedRateLimit++;
            this.droppedSinceLastLog++;
        } finally {
            release();
        }
        this.logDroppedMessages();
    }

    /**
     * Handle message drop due to size validation
     *
     * @returns {Promise<void>}
     */
    async handleSizeDrop() {
        const release = await this.metricsMutex.acquire();
        try {
            this.metrics.messagesReceived++;
            this.metrics.messagesDroppedTotal++;
            this.metrics.messagesDroppedSize++;
            this.droppedSinceLastLog++;
        } finally {
            release();
        }
        this.logDroppedMessages();
    }

    /**
     * Get current metrics
     *
     * @returns {Promise<object>} Current metrics
     */
    async getMetrics() {
        const release = await this.metricsMutex.acquire();
        try {
            return {
                queueSize: this.queue.size,
                queueMaxSize: this.config.messageQueue.maxSize,
                queueUtilizationPct: (this.queue.size / this.config.messageQueue.maxSize) * 100,
                queuePending: this.queue.pending,
                messagesReceived: this.metrics.messagesReceived,
                messagesQueued: this.metrics.messagesQueued,
                messagesProcessed: this.metrics.messagesProcessed,
                messagesFailed: this.metrics.messagesFailed,
                messagesDroppedTotal: this.metrics.messagesDroppedTotal,
                messagesDroppedRateLimit: this.metrics.messagesDroppedRateLimit,
                messagesDroppedQueueFull: this.metrics.messagesDroppedQueueFull,
                messagesDroppedSize: this.metrics.messagesDroppedSize,
                processingTimeAvgMs: this.processingTimeBuffer.getAverage() || 0,
                processingTimeP95Ms: this.processingTimeBuffer.getPercentile95() || 0,
                processingTimeMaxMs: this.processingTimeBuffer.getMax() || 0,
                rateLimitCurrent: this.rateLimiter ? this.rateLimiter.getCurrentRate() : 0,
                backpressureActive: this.backpressureActive ? 1 : 0,
            };
        } finally {
            release();
        }
    }

    /**
     * Clear metrics (called after writing to InfluxDB)
     *
     * @returns {Promise<void>}
     */
    async clearMetrics() {
        const release = await this.metricsMutex.acquire();
        try {
            this.metrics.messagesReceived = 0;
            this.metrics.messagesQueued = 0;
            this.metrics.messagesProcessed = 0;
            this.metrics.messagesFailed = 0;
            this.metrics.messagesDroppedTotal = 0;
            this.metrics.messagesDroppedRateLimit = 0;
            this.metrics.messagesDroppedQueueFull = 0;
            this.metrics.messagesDroppedSize = 0;
            this.processingTimeBuffer.clear();
        } finally {
            release();
        }
    }
}
