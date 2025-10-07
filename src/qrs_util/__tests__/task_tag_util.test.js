import { jest } from '@jest/globals';

describe('qrs_util/task_tag_util.getTaskTags', () => {
    let getTaskTags;
    let mockQrs;
    const mockGlobals = {
        getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
        configQRS: { host: 'host', port: 4242, certPaths: { certPath: '/c', keyPath: '/k' } },
        logger: { debug: jest.fn(), error: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        mockQrs = { Get: jest.fn() };
        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({ default: jest.fn(() => mockQrs) }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        getTaskTags = (await import('../task_tag_util.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns tag names when task exists', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [{ tags: [{ name: 'a' }, { name: 'b' }] }] });
        const res = await getTaskTags('t1');
        expect(res).toEqual(['a', 'b']);
        expect(mockQrs.Get).toHaveBeenCalledWith('task/full?filter=id eq t1');
    });

    test('returns [] when task not found', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
        const res = await getTaskTags('missing');
        expect(res).toEqual([]);
    });

    test('returns false on QRS error', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('fail'));
        const res = await getTaskTags('err');
        expect(res).toBe(false);
    });
});
