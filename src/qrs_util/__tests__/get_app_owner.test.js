import { jest } from '@jest/globals';

describe('qrs_util/get_app_owner', () => {
    let getAppOwner;
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
        getAppOwner = (await import('../get_app_owner.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns owner with emails on success', async () => {
        mockQrs.Get.mockResolvedValueOnce({
            statusCode: 200,
            body: { owner: { id: 'u1', userDirectory: 'D', userId: 'jdoe', name: 'John' } },
        }).mockResolvedValueOnce({
            statusCode: 200,
            body: {
                attributes: [
                    { attributeType: 'email', attributeValue: 'john@x.com' },
                    { attributeType: 'title', attributeValue: 'Mr' },
                ],
            },
        });

        const res = await getAppOwner('app1');
        expect(res).toEqual({ id: 'u1', directory: 'D', userId: 'jdoe', userName: 'John', emails: ['john@x.com'] });
        expect(mockQrs.Get.mock.calls[0][0]).toBe('app/app1');
        expect(mockQrs.Get.mock.calls[1][0]).toBe('user/u1');
    });

    test('returns false when step 1 fails', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('step1'));
        const res = await getAppOwner('app1');
        expect(res).toBe(false);
    });

    test('returns false when step 2 fails', async () => {
        mockQrs.Get.mockResolvedValueOnce({
            statusCode: 200,
            body: { owner: { id: 'u1', userDirectory: 'D', userId: 'jdoe', name: 'John' } },
        }).mockRejectedValueOnce(new Error('step2'));
        const res = await getAppOwner('app1');
        expect(res).toBe(false);
    });
});
