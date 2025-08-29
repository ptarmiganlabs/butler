import { jest } from '@jest/globals';

describe('qrs_util/app_tag_util.getAppTags', () => {
    let getAppTags;
    let mockQrs;
    const mockGlobals = {
        getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
        configQRS: { host: 'host', port: 4242, certPaths: { certPath: '/c', keyPath: '/k' } },
        logger: { debug: jest.fn(), error: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    };

    beforeAll(async () => {
        mockQrs = { Get: jest.fn() };
        await jest.unstable_mockModule('../../lib/qrs_client.js', () => ({ default: jest.fn(() => mockQrs) }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        getAppTags = (await import('../app_tag_util.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns tag names when app exists', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [{ tags: [{ name: 'x' }, { name: 'y' }] }] });
        const res = await getAppTags('a1');
        expect(res).toEqual(['x', 'y']);
        expect(mockQrs.Get).toHaveBeenCalledWith('app/full?filter=id eq a1');
    });

    test('returns [] when app not found', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
        const res = await getAppTags('missing');
        expect(res).toEqual([]);
    });

    test('returns [] on QRS error (per implementation)', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('boom'));
        const res = await getAppTags('err');
        expect(res).toEqual([]);
    });
});
