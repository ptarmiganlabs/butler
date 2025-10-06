import { jest } from '@jest/globals';

describe('qrs_util/sense_start_task', () => {
    let startTask;
    let mockQrs;
    const mockGlobals = {
        getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
        configQRS: { host: 'host', port: 4242, certPaths: { certPath: '/c', keyPath: '/k' } },
        logger: { debug: jest.fn(), error: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        mockQrs = { Post: jest.fn() };
        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({ default: jest.fn(() => mockQrs) }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        startTask = (await import('../sense_start_task.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns true on 204', async () => {
        mockQrs.Post.mockResolvedValueOnce({ statusCode: 204 });
        await expect(startTask('abc')).resolves.toBe(true);
        expect(mockQrs.Post).toHaveBeenCalledWith('task/abc/start');
    });

    test('returns false on non-204', async () => {
        mockQrs.Post.mockResolvedValueOnce({ statusCode: 500, body: { error: 'x' } });
        await expect(startTask('abc')).resolves.toBe(false);
    });

    test('returns false on thrown error', async () => {
        mockQrs.Post.mockRejectedValueOnce(new Error('boom'));
        await expect(startTask('abc')).resolves.toBe(false);
    });
});
