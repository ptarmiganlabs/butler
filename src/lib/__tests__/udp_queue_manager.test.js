import { jest } from '@jest/globals';
import { UdpQueueManager } from '../udp_queue_manager.js';

describe('UdpQueueManager', () => {
    let queueManager;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
            verbose: jest.fn(),
            warn: jest.fn(),
        };

        const config = {
            messageQueue: {
                enable: true,
                maxConcurrent: 2,
                maxSize: 10,
                backpressureThreshold: 80, // 80% (percentage, 0-100)
            },
            rateLimit: {
                enable: false,
                maxMessagesPerMinute: 100,
            },
            maxMessageSize: 65507,
        };

        queueManager = new UdpQueueManager(config, mockLogger, 'test_queue');
    });

    afterEach(async () => {
        // Clear any pending tasks in the queue
        await queueManager.queue.clear();
        // Clean up resources (stop intervals, clear caches)
        queueManager.destroy();
    });

    test('should validate message size', () => {
        const smallMessage = Buffer.alloc(100, 'a');
        const largeMessage = Buffer.alloc(70000, 'a');

        expect(queueManager.validateMessageSize(smallMessage)).toBe(true);
        expect(queueManager.validateMessageSize(largeMessage)).toBe(false);
    });

    test('should check rate limit when disabled', () => {
        expect(queueManager.checkRateLimit()).toBe(true);
    });

    test('should add message to queue and process it', async () => {
        const processFn = jest.fn(() => Promise.resolve());
        const result = await queueManager.addToQueue(processFn);
        expect(result).toBe(true);

        // Wait for queue to process
        await new Promise((r) => setTimeout(r, 100));
        expect(processFn).toHaveBeenCalled();
    });

    test('should drop message when queue is full', async () => {
        let releaseBlockingTask;
        const blockingFn = () =>
            new Promise((resolve) => {
                releaseBlockingTask = () => resolve(true);
            });

        const smallQueueConfig = {
            messageQueue: {
                enable: true,
                maxConcurrent: 1,
                maxSize: 1,
                backpressureThreshold: 80,
            },
            rateLimit: {
                enable: false,
                maxMessagesPerMinute: 100,
            },
            maxMessageSize: 65507,
        };
        const smallQueue = new UdpQueueManager(smallQueueConfig, mockLogger, 'small_queue');

        const firstResult = await smallQueue.addToQueue(blockingFn);
        expect(firstResult).toBe(true);

        const secondResult = await smallQueue.addToQueue(() => Promise.resolve());
        expect(secondResult).toBe(true);

        const thirdResult = await smallQueue.addToQueue(() => Promise.resolve());
        expect(thirdResult).toBe(false);

        const metrics = await smallQueue.getMetrics();
        expect(metrics.messagesDroppedQueueFull).toBe(1);

        releaseBlockingTask();
        await smallQueue.queue.clear();
        smallQueue.destroy();
    });

    test('should get metrics', async () => {
        const metrics = await queueManager.getMetrics();
        expect(metrics).toHaveProperty('queueSize');
        expect(metrics).toHaveProperty('messagesReceived');
        expect(metrics).toHaveProperty('messagesProcessed');
        expect(metrics).toHaveProperty('messagesDroppedTotal');
    });

    test('should clear metrics', async () => {
        await queueManager.addToQueue(() => Promise.resolve());
        await new Promise((r) => setTimeout(r, 100));

        await queueManager.clearMetrics();
        const metrics = await queueManager.getMetrics();
        expect(metrics.messagesReceived).toBe(0);
        expect(metrics.messagesProcessed).toBe(0);
    });

    test('should handle rate limiting when enabled', async () => {
        const config = {
            messageQueue: {
                enable: true,
                maxConcurrent: 2,
                maxSize: 100,
                backpressureThreshold: 80, // 80% (percentage, 0-100) — matches udp_queue_manager validation
            },
            rateLimit: {
                enable: true,
                maxMessagesPerMinute: 2,
            },
            maxMessageSize: 65507,
        };

        const rateLimitedQueue = new UdpQueueManager(config, mockLogger, 'rate_limited');

        expect(rateLimitedQueue.checkRateLimit()).toBe(true);
        expect(rateLimitedQueue.checkRateLimit()).toBe(true);
        expect(rateLimitedQueue.checkRateLimit()).toBe(false);

        // Clean up
        rateLimitedQueue.destroy();
    });

    test('should not log backpressure continues on first activation', async () => {
        await queueManager.checkBackpressure(8);
        const warnMessages = mockLogger.warn.mock.calls.map((call) => call[0]);
        expect(warnMessages.filter((msg) => msg.includes('Backpressure detected'))).toHaveLength(1);
        expect(warnMessages.filter((msg) => msg.includes('Backpressure continues'))).toHaveLength(0);
    });

    test('should drop a duplicate while the first executionId is still in flight', async () => {
        let releaseProcessing;
        const firstQueued = await queueManager.enqueueDeduplicated(
            'exec-in-flight',
            () =>
                new Promise((resolve) => {
                    releaseProcessing = () => resolve(true);
                }),
        );

        const duplicateQueued = await queueManager.enqueueDeduplicated('exec-in-flight', () => Promise.resolve(true));

        expect(firstQueued).toBe('queued');
        expect(duplicateQueued).toBe('duplicate');

        releaseProcessing();
        await new Promise((r) => setTimeout(r, 50));

        const metrics = await queueManager.getMetrics();
        expect(metrics.messagesDroppedDuplicate).toBe(1);
        expect(queueManager.checkDuplicate('exec-in-flight')).toBe(true);
    });

    test('should release executionId when queue admission fails', async () => {
        let releaseBlockingTask;
        const blockingFn = () =>
            new Promise((resolve) => {
                releaseBlockingTask = () => resolve(true);
            });

        const smallQueueConfig = {
            messageQueue: {
                enable: true,
                maxConcurrent: 1,
                maxSize: 1,
                backpressureThreshold: 80,
            },
            rateLimit: {
                enable: false,
                maxMessagesPerMinute: 100,
            },
            maxMessageSize: 65507,
        };
        const smallQueue = new UdpQueueManager(smallQueueConfig, mockLogger, 'small_queue_dedup');

        const firstResult = await smallQueue.addToQueue(blockingFn);
        expect(firstResult).toBe(true);

        const secondResult = await smallQueue.addToQueue(() => Promise.resolve());
        expect(secondResult).toBe(true);

        const queued = await smallQueue.enqueueDeduplicated('exec-queue-full', () => Promise.resolve(true));
        expect(queued).toBe('queue_full');
        expect(smallQueue.checkDuplicate('exec-queue-full')).toBe(false);

        releaseBlockingTask();
        await smallQueue.queue.clear();
        smallQueue.destroy();
    });

    test('should release executionId when queued processing returns false', async () => {
        const queued = await queueManager.enqueueDeduplicated('exec-return-false', () => Promise.resolve(false));
        expect(queued).toBe('queued');

        await new Promise((r) => setTimeout(r, 50));

        expect(queueManager.checkDuplicate('exec-return-false')).toBe(false);
        const metrics = await queueManager.getMetrics();
        expect(metrics.messagesFailed).toBe(1);
    });

    test('should release executionId when queued processing throws', async () => {
        const queued = await queueManager.enqueueDeduplicated('exec-throw', () => Promise.reject(new Error('boom')));
        expect(queued).toBe('queued');

        await new Promise((r) => setTimeout(r, 50));

        expect(queueManager.checkDuplicate('exec-throw')).toBe(false);
        const metrics = await queueManager.getMetrics();
        expect(metrics.messagesFailed).toBe(1);
    });

    test('should retain executionId after successful processing', async () => {
        const queued = await queueManager.enqueueDeduplicated('exec-success', () => Promise.resolve(true));
        expect(queued).toBe('queued');

        await new Promise((r) => setTimeout(r, 50));

        expect(queueManager.checkDuplicate('exec-success')).toBe(true);
        const metrics = await queueManager.getMetrics();
        expect(metrics.messagesProcessed).toBe(1);
    });

    test('should expire processed executionIds based on the configured TTL', async () => {
        const shortTtlQueue = new UdpQueueManager(
            {
                messageQueue: {
                    enable: true,
                    maxConcurrent: 1,
                    maxSize: 10,
                    backpressureThreshold: 80,
                },
                rateLimit: {
                    enable: false,
                    maxMessagesPerMinute: 100,
                },
                deduplication: {
                    ttlMinutes: 0.0001,
                },
                maxMessageSize: 65507,
            },
            mockLogger,
            'short_ttl_queue',
        );

        const queued = await shortTtlQueue.enqueueDeduplicated('exec-short-ttl', () => Promise.resolve(true));
        expect(queued).toBe('queued');

        await new Promise((r) => setTimeout(r, 50));

        expect(shortTtlQueue.checkDuplicate('exec-short-ttl')).toBe(false);

        const requeued = await shortTtlQueue.enqueueDeduplicated('exec-short-ttl', () => Promise.resolve(true));
        expect(requeued).toBe('queued');

        shortTtlQueue.destroy();
    });

    test('should bypass deduplication completely when disabled', async () => {
        const dedupDisabledQueue = new UdpQueueManager(
            {
                messageQueue: {
                    enable: true,
                    maxConcurrent: 1,
                    maxSize: 10,
                    backpressureThreshold: 80,
                },
                rateLimit: {
                    enable: false,
                    maxMessagesPerMinute: 100,
                },
                deduplication: {
                    enable: false,
                    ttlMinutes: 10,
                },
                maxMessageSize: 65507,
            },
            mockLogger,
            'dedup_disabled_queue',
        );

        const firstQueued = await dedupDisabledQueue.enqueueDeduplicated('exec-disabled', () => Promise.resolve(true));
        const secondQueued = await dedupDisabledQueue.enqueueDeduplicated('exec-disabled', () => Promise.resolve(true));

        expect(firstQueued).toBe('queued');
        expect(secondQueued).toBe('queued');

        await new Promise((r) => setTimeout(r, 50));

        expect(dedupDisabledQueue.checkDuplicate('exec-disabled')).toBe(false);

        const metrics = await dedupDisabledQueue.getMetrics();
        expect(metrics.messagesDroppedDuplicate).toBe(0);
        expect(metrics.deduplicationCacheSize).toBe(0);
        expect(metrics.messagesProcessed).toBe(2);

        dedupDisabledQueue.destroy();
    });

    test('should include drop reason breakdown in warning log', async () => {
        // Trigger 2 duplicate drops
        await queueManager.handleDuplicateDrop();
        await queueManager.handleDuplicateDrop();

        // Trigger 1 size drop
        await queueManager.handleSizeDrop();

        // Force the time check to pass
        queueManager.lastDropLog = 0;

        // Call logDroppedMessages
        queueManager.logDroppedMessages();

        // Verify warn was called with breakdown
        const warnCalls = mockLogger.warn.mock.calls;
        const dropLog = warnCalls.find((call) => call[0].includes('Dropped') && call[0].includes('messages'));
        expect(dropLog).toBeTruthy();
        expect(dropLog[0]).toContain('Dropped 3 messages');
        expect(dropLog[0]).toContain('duplicate: 2');
        expect(dropLog[0]).toContain('size: 1');
    });

    test('should only include non-zero drop reasons in warning log', async () => {
        // Trigger only 1 duplicate drop
        await queueManager.handleDuplicateDrop();

        // Force the time check to pass
        queueManager.lastDropLog = 0;

        // Call logDroppedMessages
        queueManager.logDroppedMessages();

        // Verify warn was called with only duplicate reason
        const warnCalls = mockLogger.warn.mock.calls;
        const dropLog = warnCalls.find((call) => call[0].includes('Dropped') && call[0].includes('messages'));
        expect(dropLog).toBeTruthy();
        expect(dropLog[0]).toContain('duplicate: 1');
        expect(dropLog[0]).not.toContain('queueFull');
        expect(dropLog[0]).not.toContain('rateLimit');
        expect(dropLog[0]).not.toContain('size');
    });

    test('should reset drop counters after logging', async () => {
        // Trigger some drops
        await queueManager.handleDuplicateDrop();
        await queueManager.handleSizeDrop();

        // Force the time check to pass
        queueManager.lastDropLog = 0;

        // Call logDroppedMessages
        queueManager.logDroppedMessages();

        // Verify warn was called once
        const warnCalls1 = mockLogger.warn.mock.calls.filter((call) => call[0].includes('Dropped') && call[0].includes('messages'));
        expect(warnCalls1).toHaveLength(1);

        // Reset time and call again
        queueManager.lastDropLog = 0;
        queueManager.logDroppedMessages();

        // Verify warn was NOT called again (counters were reset)
        const warnCalls2 = mockLogger.warn.mock.calls.filter((call) => call[0].includes('Dropped') && call[0].includes('messages'));
        expect(warnCalls2).toHaveLength(1);
    });

    test('should not log when no messages were dropped', async () => {
        // Don't trigger any drops

        // Force the time check to pass
        queueManager.lastDropLog = 0;

        // Call logDroppedMessages
        queueManager.logDroppedMessages();

        // Verify warn was NOT called
        const warnCalls = mockLogger.warn.mock.calls.filter((call) => call[0].includes('Dropped') && call[0].includes('messages'));
        expect(warnCalls).toHaveLength(0);
    });

    test('should track all four drop reasons correctly', async () => {
        // Trigger rate limit drop
        await queueManager.handleRateLimitDrop();

        // Trigger size drop
        await queueManager.handleSizeDrop();

        // Trigger duplicate drop
        await queueManager.handleDuplicateDrop();

        // Trigger queue full drop directly
        await queueManager.handleQueueFullDrop();

        // Force the time check to pass
        queueManager.lastDropLog = 0;

        // Call logDroppedMessages
        queueManager.logDroppedMessages();

        // Verify warn was called with all four reasons
        const warnCalls = mockLogger.warn.mock.calls;
        const dropLog = warnCalls.find((call) => call[0].includes('Dropped') && call[0].includes('messages'));
        expect(dropLog).toBeTruthy();
        expect(dropLog[0]).toContain('Dropped 4 messages');
        expect(dropLog[0]).toContain('queueFull: 1');
        expect(dropLog[0]).toContain('rateLimit: 1');
        expect(dropLog[0]).toContain('size: 1');
        expect(dropLog[0]).toContain('duplicate: 1');
    });
});
