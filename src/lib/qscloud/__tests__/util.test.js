import { jest } from '@jest/globals';

describe('lib/qscloud/util', () => {
    let getQlikSenseCloudUrls;
    const mockGlobals = {
        config: {
            get: jest.fn(),
        },
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        ({ getQlikSenseCloudUrls } = await import('../util.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns QMC and Hub URLs from config', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc') {
                return 'https://tenant.qlikcloud.com/console';
            }
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub') {
                return 'https://tenant.qlikcloud.com/sense';
            }
            return undefined;
        });

        const result = getQlikSenseCloudUrls();

        expect(result).toEqual({
            qmcUrl: 'https://tenant.qlikcloud.com/console',
            hubUrl: 'https://tenant.qlikcloud.com/sense',
        });
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');
    });

    test('returns undefined values when config is not set', () => {
        mockGlobals.config.get.mockReturnValue(undefined);

        const result = getQlikSenseCloudUrls();

        expect(result).toEqual({
            qmcUrl: undefined,
            hubUrl: undefined,
        });
    });

    test('handles partial config correctly', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc') {
                return 'https://tenant.qlikcloud.com/console';
            }
            return undefined; // hubUrl is undefined
        });

        const result = getQlikSenseCloudUrls();

        expect(result).toEqual({
            qmcUrl: 'https://tenant.qlikcloud.com/console',
            hubUrl: undefined,
        });
    });
});