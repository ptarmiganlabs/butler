import { jest } from '@jest/globals';

describe('qrs_util/task_cp_util', () => {
    let isCustomPropertyValueSet;
    let getTaskCustomPropertyValues;
    let getReloadTasksCustomProperties;
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
        const mod = await import('../task_cp_util.js');
        isCustomPropertyValueSet = mod.isCustomPropertyValueSet;
        getTaskCustomPropertyValues = mod.getTaskCustomPropertyValues;
        getReloadTasksCustomProperties = mod.getReloadTasksCustomProperties;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobals.getQRSHttpHeaders.mockReturnValue({ 'X-QRS': '1' });
    });

    describe('isCustomPropertyValueSet', () => {
        test('returns true when CP value exists', async () => {
            mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [{}] });
            const res = await isCustomPropertyValueSet('t1', 'MyCP', 'v1');
            expect(res).toBe(true);
            expect(mockQrs.Get).toHaveBeenCalledWith(
                "task/full?filter=id eq t1 and customProperties.definition.name eq 'MyCP' and customProperties.value eq 'v1'",
            );
        });

        test('returns false when CP value not set', async () => {
            mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
            const res = await isCustomPropertyValueSet('t1', 'MyCP', 'v1');
            expect(res).toBe(false);
        });

        test('returns false when inner Get throws', async () => {
            mockQrs.Get.mockRejectedValueOnce(new Error('qrs err'));
            const res = await isCustomPropertyValueSet('t1', 'MyCP', 'v1');
            expect(res).toBe(false);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });

        test('uses provided logger and handles outer error', async () => {
            // Force outer try/catch by throwing before QRS init
            mockGlobals.getQRSHttpHeaders.mockImplementation(() => {
                throw new Error('headers fail');
            });
            const customLogger = { debug: jest.fn(), error: jest.fn() };
            const res = await isCustomPropertyValueSet('t1', 'MyCP', 'v1', customLogger);
            expect(res).toBe(false);
            expect(customLogger.error).toHaveBeenCalled();
        });
    });

    describe('getTaskCustomPropertyValues', () => {
        test('returns array of CP values when present', async () => {
            mockQrs.Get.mockResolvedValueOnce({
                statusCode: 200,
                body: [
                    {
                        customProperties: [
                            { definition: { name: 'Other' }, value: 'x' },
                            { definition: { name: 'MyCP' }, value: 'v1' },
                            { definition: { name: 'MyCP' }, value: 'v2' },
                        ],
                    },
                ],
            });
            const res = await getTaskCustomPropertyValues('t1', 'MyCP');
            expect(res).toEqual(['v1', 'v2']);
            expect(mockQrs.Get).toHaveBeenCalledWith("task/full?filter=id eq t1 and customProperties.definition.name eq 'MyCP'");
        });

        test('returns [] when CP not found', async () => {
            mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
            const res = await getTaskCustomPropertyValues('t1', 'MyCP');
            expect(res).toEqual([]);
        });

        test('returns [] when inner Get throws', async () => {
            mockQrs.Get.mockRejectedValueOnce(new Error('qrs err'));
            const res = await getTaskCustomPropertyValues('t1', 'MyCP');
            expect(res).toEqual([]);
            expect(mockGlobals.logger.error).toHaveBeenCalled();
        });

        test('returns false on outer error', async () => {
            mockGlobals.getQRSHttpHeaders.mockImplementation(() => {
                throw new Error('headers fail');
            });
            const res = await getTaskCustomPropertyValues('t1', 'MyCP');
            expect(res).toBe(false);
        });
    });

    describe('getReloadTasksCustomProperties', () => {
        const logger = { debug: jest.fn(), error: jest.fn() };
        const config = { get: jest.fn(() => 'host') };
        const configQRS = { certPaths: { certPath: '/c', keyPath: '/k' } };

        test('returns body when CP definitions exist', async () => {
            const body = [{ id: 1 }, { id: 2 }];
            mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body });
            const res = await getReloadTasksCustomProperties(config, configQRS, logger);
            expect(res).toEqual(body);
            expect(mockQrs.Get).toHaveBeenCalledWith("custompropertydefinition/full?filter=objectTypes eq 'ReloadTask'");
        });

        test('returns [] when none exist', async () => {
            mockQrs.Get.mockResolvedValueOnce({ statusCode: 200, body: [] });
            const res = await getReloadTasksCustomProperties(config, configQRS, logger);
            expect(res).toEqual([]);
        });

        test('returns [] when inner Get throws', async () => {
            mockQrs.Get.mockRejectedValueOnce(new Error('qrs err'));
            const res = await getReloadTasksCustomProperties(config, configQRS, logger);
            expect(res).toEqual([]);
            expect(logger.error).toHaveBeenCalled();
        });

        test('returns false on outer error', async () => {
            const badConfig = {
                get: jest.fn(() => {
                    throw new Error('cfg');
                }),
            };
            const res = await getReloadTasksCustomProperties(badConfig, configQRS, logger);
            expect(res).toBe(false);
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
