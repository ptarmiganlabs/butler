import { jest } from '@jest/globals';

describe('qrs_util/task_metadata', () => {
    let getTaskMetadata;
    let mockQrs;

    const mockGlobals = {
        getQRSHttpHeaders: jest.fn(() => ({ 'X-QRS': '1' })),
        configQRS: { host: 'host', port: 4242, certPaths: { certPath: '/c', keyPath: '/k' } },
        logger: { debug: jest.fn(), error: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    };

    beforeAll(async () => {
        mockQrs = { Get: jest.fn() };
        await jest.unstable_mockModule('qrs-interact', () => ({ default: jest.fn(() => mockQrs) }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        getTaskMetadata = (await import('../task_metadata.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobals.getQRSHttpHeaders.mockReturnValue({ 'X-QRS': '1' });
    });

    test('returns metadata when task exists', async () => {
        const body = [{ id: 't1', name: 'Task 1' }];
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body });
        const res = await getTaskMetadata('t1');
        expect(res).toEqual(body[0]);
        expect(mockQrs.Get).toHaveBeenCalledWith('task/full?filter=id eq t1');
    });

    test('returns [] when task not found', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
        const res = await getTaskMetadata('t1');
        expect(res).toEqual([]);
    });

    test('returns false on inner Get error', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('qrs err'));
        const res = await getTaskMetadata('t1');
        expect(res).toBe(false);
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });

    test('returns false on outer error', async () => {
        mockGlobals.getQRSHttpHeaders.mockImplementation(() => {
            throw new Error('headers fail');
        });
        const res = await getTaskMetadata('t1');
        expect(res).toBe(false);
    });
});
