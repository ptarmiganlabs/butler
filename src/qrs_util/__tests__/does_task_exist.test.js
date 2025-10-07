import { jest } from '@jest/globals';

describe('qrs_util/does_task_exist', () => {
    let fn;
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
        fn = (await import('../does_task_exist.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns exists=true when QRS returns a matching task', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [{ id: 't1', name: 'Task 1' }] });
        const res = await fn('t1');
        expect(res).toEqual({ exists: true, task: { taskId: 't1', taskName: 'Task 1' } });
        expect(mockQrs.Get).toHaveBeenCalledWith('task?filter=id eq t1');
    });

    test('returns exists=false when QRS finds no tasks', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
        const res = await fn('missing');
        expect(res).toEqual({ exists: false, task: {} });
    });

    test('returns false on QRS error path', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('boom'));
        const res = await fn('err');
        expect(res).toBe(false);
    });
});
