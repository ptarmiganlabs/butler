import { jest } from '@jest/globals';

describe('qrs_util/app_metadata.getAppMetadata', () => {
    let getAppMetadata;
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
        getAppMetadata = (await import('../app_metadata.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns app metadata when found', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [{ id: 'a1', name: 'App 1' }] });
        const res = await getAppMetadata('a1');
        expect(res).toEqual({ id: 'a1', name: 'App 1' });
        expect(mockQrs.Get).toHaveBeenCalledWith('app/full?filter=id eq a1');
    });

    test('returns {} when not found', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
        const res = await getAppMetadata('missing');
        expect(res).toEqual({});
    });

    test('returns false on QRS error', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('boom'));
        const res = await getAppMetadata('err');
        expect(res).toBe(false);
    });
});
