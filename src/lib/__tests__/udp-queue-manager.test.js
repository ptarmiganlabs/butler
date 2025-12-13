/**
 * Tests for UDP Queue Manager
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { UdpQueueManager, sanitizeField } from '../udp-queue-manager.js';

describe('sanitizeField', () => {
    it('should remove control characters from string', () => {
        const input = 'Hello\x00World\x1FTest\x7F';
        const result = sanitizeField(input);
        expect(result).toBe('HelloWorldTest');
    });

    it('should limit string length to default 500 characters', () => {
        const input = 'a'.repeat(1000);
        const result = sanitizeField(input);
        expect(result).toHaveLength(500);
    });

    it('should limit string length to custom maxLength', () => {
        const input = 'a'.repeat(1000);
        const result = sanitizeField(input, 100);
        expect(result).toHaveLength(100);
    });

    it('should handle non-string input by converting to string', () => {
        const result = sanitizeField(12345);
        expect(result).toBe('12345');
    });

    it('should handle empty string', () => {
        const result = sanitizeField('');
        expect(result).toBe('');
    });

    it('should remove newlines and carriage returns', () => {
        const input = 'Line1\nLine2\rLine3';
        const result = sanitizeField(input);
        expect(result).toBe('Line1Line2Line3');
    });

    it('should preserve normal characters', () => {
        const input = 'Hello World! 123 @#$%';
        const result = sanitizeField(input);
        expect(result).toBe('Hello World! 123 @#$%');
    });
});

describe('UdpQueueManager', () => {
    let queueManager;
    let mockLogger;
    let config;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        };

        config = {
            messageQueue: {
                maxConcurrent: 5,
                maxSize: 10,
                backpressureThreshold: 80,
            },
            rateLimit: {
                enable: false,
                maxMessagesPerMinute: 60,
            },
            maxMessageSize: 1024,
        };

        queueManager = new UdpQueueManager(config, mockLogger, 'test-queue');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with correct config', () => {
            expect(queueManager.config).toEqual(config);
            expect(queueManager.logger).toEqual(mockLogger);
            expect(queueManager.queueType).toBe('test-queue');
        });

        it('should initialize rate limiter when enabled', () => {
            const configWithRateLimit = {
                ...config,
                rateLimit: { enable: true, maxMessagesPerMinute: 60 },
            };
            const qm = new UdpQueueManager(configWithRateLimit, mockLogger, 'test');
            expect(qm.rateLimiter).toBeTruthy();
        });

        it('should not initialize rate limiter when disabled', () => {
            expect(queueManager.rateLimiter).toBeNull();
        });
    });

    describe('validateMessageSize', () => {
        it('should accept message within size limit', () => {
            const message = Buffer.from('Hello World');
            expect(queueManager.validateMessageSize(message)).toBe(true);
        });

        it('should reject message exceeding size limit', () => {
            const message = Buffer.alloc(2000);
            expect(queueManager.validateMessageSize(message)).toBe(false);
        });

        it('should handle string messages', () => {
            const message = 'Hello World';
            expect(queueManager.validateMessageSize(message)).toBe(true);
        });
    });

    describe('checkRateLimit', () => {
        it('should always return true when rate limiting disabled', () => {
            expect(queueManager.checkRateLimit()).toBe(true);
            expect(queueManager.checkRateLimit()).toBe(true);
        });

        it('should enforce rate limit when enabled', () => {
            const configWithRateLimit = {
                ...config,
                rateLimit: { enable: true, maxMessagesPerMinute: 2 },
            };
            const qm = new UdpQueueManager(configWithRateLimit, mockLogger, 'test');

            expect(qm.checkRateLimit()).toBe(true);
            expect(qm.checkRateLimit()).toBe(true);
            expect(qm.checkRateLimit()).toBe(false); // Over limit
        });
    });

    describe('addToQueue', () => {
        it('should queue message successfully', async () => {
            const processFunction = jest.fn().mockResolvedValue(undefined);
            const result = await queueManager.addToQueue(processFunction);

            expect(result).toBe(true);
            expect(queueManager.metrics.messagesReceived).toBe(1);
            expect(queueManager.metrics.messagesQueued).toBe(1);
        });

        it('should reject message when queue is full', async () => {
            // Fill the queue
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    queueManager.addToQueue(() => new Promise((resolve) => setTimeout(resolve, 1000))),
                );
            }
            await Promise.all(promises);

            // Try to add one more
            const result = await queueManager.addToQueue(jest.fn());
            expect(result).toBe(false);
            expect(queueManager.metrics.messagesDroppedQueueFull).toBe(1);
        });

        it('should track processing time', async () => {
            const processFunction = jest.fn().mockResolvedValue(undefined);
            await queueManager.addToQueue(processFunction);

            // Wait for processing
            await new Promise((resolve) => setTimeout(resolve, 100));

            const metrics = await queueManager.getMetrics();
            expect(metrics.processingTimeAvgMs).toBeGreaterThan(0);
        });

        it('should handle processing errors', async () => {
            const processFunction = jest.fn().mockRejectedValue(new Error('Test error'));
            await queueManager.addToQueue(processFunction);

            // Wait for processing
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(mockLogger.error).toHaveBeenCalled();
            expect(queueManager.metrics.messagesFailed).toBe(1);
        });
    });

    describe('handleRateLimitDrop', () => {
        it('should track dropped message', async () => {
            await queueManager.handleRateLimitDrop();

            expect(queueManager.metrics.messagesReceived).toBe(1);
            expect(queueManager.metrics.messagesDroppedTotal).toBe(1);
            expect(queueManager.metrics.messagesDroppedRateLimit).toBe(1);
        });
    });

    describe('handleSizeDrop', () => {
        it('should track size-dropped message', async () => {
            await queueManager.handleSizeDrop();

            expect(queueManager.metrics.messagesReceived).toBe(1);
            expect(queueManager.metrics.messagesDroppedTotal).toBe(1);
            expect(queueManager.metrics.messagesDroppedSize).toBe(1);
        });
    });

    describe('getMetrics', () => {
        it('should return current metrics', async () => {
            await queueManager.addToQueue(jest.fn().mockResolvedValue(undefined));

            const metrics = await queueManager.getMetrics();

            expect(metrics).toHaveProperty('queueSize');
            expect(metrics).toHaveProperty('messagesReceived');
            expect(metrics).toHaveProperty('messagesQueued');
            expect(metrics.messagesReceived).toBe(1);
        });

        it('should track time window metrics', async () => {
            await queueManager.addToQueue(jest.fn().mockResolvedValue(undefined));

            const metrics = await queueManager.getMetrics();

            expect(metrics.messagesReceivedLastMinute).toBe(1);
            expect(metrics.messagesReceivedLastHour).toBe(1);
        });
    });

    describe('clearMetrics', () => {
        it('should reset metrics', async () => {
            await queueManager.addToQueue(jest.fn().mockResolvedValue(undefined));
            await queueManager.clearMetrics();

            const metrics = await queueManager.getMetrics();

            expect(metrics.messagesReceived).toBe(0);
            expect(metrics.messagesQueued).toBe(0);
            expect(metrics.messagesProcessed).toBe(0);
        });
    });

    describe('backpressure', () => {
        it('should detect backpressure when threshold exceeded', async () => {
            // Fill queue to 80% (8 out of 10)
            const promises = [];
            for (let i = 0; i < 8; i++) {
                promises.push(
                    queueManager.addToQueue(() => new Promise((resolve) => setTimeout(resolve, 1000))),
                );
            }
            await Promise.all(promises);

            // Wait a bit for backpressure check
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Backpressure detected'),
            );
        });
    });
});
