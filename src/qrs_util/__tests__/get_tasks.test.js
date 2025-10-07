import { jest } from '@jest/globals';

describe('qrs_util/get_tasks', () => {
    let getTasks;
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
        getTasks = (await import('../get_tasks.js')).default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns tasks for tag filter', async () => {
        mockQrs.Get.mockResolvedValueOnce({
            statusCode: 200,
            body: [
                { id: 't1', name: 'A' },
                { id: 't2', name: 'B' },
            ],
        });
        const res = await getTasks({ tag: 'nightly' });
        expect(res).toEqual([
            { taskId: 't1', taskName: 'A' },
            { taskId: 't2', taskName: 'B' },
        ]);
        expect(mockQrs.Get).toHaveBeenCalledWith("task/full?filter=tags.name eq 'nightly'");
    });

    test('returns tasks for customProperty filter', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [{ id: 't3', name: 'C' }] });
        const res = await getTasks({ customProperty: { name: 'env', value: 'prod' } });
        expect(res).toEqual([{ taskId: 't3', taskName: 'C' }]);
        expect(mockQrs.Get).toHaveBeenCalledWith(
            "task/full?filter=(customProperties.definition.name eq 'env') and (customProperties.value eq 'prod')",
        );
    });

    test('returns [] when no tasks match', async () => {
        mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
        const res = await getTasks({ tag: 'none' });
        expect(res).toEqual([]);
    });

    test('returns false on QRS error', async () => {
        mockQrs.Get.mockRejectedValueOnce(new Error('Get failed'));
        const res = await getTasks({ tag: 'err' });
        expect(res).toBe(false);
    });

    test('returns false when filter is missing', async () => {
        const res = await getTasks({});
        expect(res).toBe(false);
    });
});
