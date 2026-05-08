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
        // p-queue's size property tracks waiting tasks (not running)
        // maxSize is 10, so we can have up to 10 waiting
        // Add 12 tasks: 2 will run immediately, 10 will wait (filling the queue)
        const slowFn = () => new Promise((r) => setTimeout(r, 5000));

        // Add 12 tasks - first 2 start running, next 10 wait
        for (let i = 0; i < 12; i++) {
            const result = await queueManager.addToQueue(slowFn);
            expect(result).toBe(true); // First 12 should succeed
        }

        // Wait a bit for queue to update
        await new Promise((r) => setTimeout(r, 100));

        // Now queue should be full (10 waiting, 2 running)
        // Try to add one more - should be dropped since waiting count >= maxSize
        const result = await queueManager.addToQueue(() => Promise.resolve());
        expect(result).toBe(false);

        // Check metrics
        const metrics = await queueManager.getMetrics();
        expect(metrics.messagesDroppedQueueFull).toBe(1);
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
    });

    test('should not log backpressure continues on first activation', async () => {
        await queueManager.checkBackpressure(8);
        const warnMessages = mockLogger.warn.mock.calls.map((call) => call[0]);
        expect(warnMessages.filter((msg) => msg.includes('Backpressure detected'))).toHaveLength(1);
        expect(warnMessages.filter((msg) => msg.includes('Backpressure continues'))).toHaveLength(0);
    });
});
