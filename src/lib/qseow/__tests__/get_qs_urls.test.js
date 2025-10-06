import { jest } from '@jest/globals';

describe('lib/qseow/get_qs_urls', () => {
    let getQlikSenseUrls;
    const mockGlobals = {
        config: {
            get: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        ({ getQlikSenseUrls } = await import('../get_qs_urls.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns all URLs from config', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            switch (key) {
                case 'Butler.qlikSenseUrls.qmc':
                    return 'https://qlik.example.com/qmc';
                case 'Butler.qlikSenseUrls.hub':
                    return 'https://qlik.example.com/hub';
                case 'Butler.qlikSenseUrls.appBaseUrl':
                    return 'https://qlik.example.com/sense/app';
                default:
                    return undefined;
            }
        });

        const result = getQlikSenseUrls();

        expect(result).toEqual({
            qmcUrl: 'https://qlik.example.com/qmc',
            hubUrl: 'https://qlik.example.com/hub',
            appBaseUrl: 'https://qlik.example.com/sense/app',
        });
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseUrls.qmc');
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseUrls.hub');
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseUrls.appBaseUrl');
    });

    test('returns undefined values when config is not set', () => {
        mockGlobals.config.get.mockReturnValue(undefined);

        const result = getQlikSenseUrls();

        expect(result).toEqual({
            qmcUrl: undefined,
            hubUrl: undefined,
            appBaseUrl: undefined,
        });
    });

    test('handles partial config correctly', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseUrls.qmc') {
                return 'https://qlik.example.com/qmc';
            }
            return undefined; // other URLs are undefined
        });

        const result = getQlikSenseUrls();

        expect(result).toEqual({
            qmcUrl: 'https://qlik.example.com/qmc',
            hubUrl: undefined,
            appBaseUrl: undefined,
        });
    });

    test('handles empty string values', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            switch (key) {
                case 'Butler.qlikSenseUrls.qmc':
                    return '';
                case 'Butler.qlikSenseUrls.hub':
                    return 'https://qlik.example.com/hub';
                case 'Butler.qlikSenseUrls.appBaseUrl':
                    return '';
                default:
                    return undefined;
            }
        });

        const result = getQlikSenseUrls();

        expect(result).toEqual({
            qmcUrl: '',
            hubUrl: 'https://qlik.example.com/hub',
            appBaseUrl: '',
        });
    });
});
