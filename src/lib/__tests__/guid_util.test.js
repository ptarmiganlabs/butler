import { jest } from '@jest/globals';

describe('lib/guid_util', () => {
    let verifyGuid;
    const mockGlobals = {
        logger: {
            verbose: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        ({ verifyGuid } = await import('../guid_util.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns true for valid GUID and logs verbose', () => {
        const ok = verifyGuid('123e4567-e89b-12d3-a456-426614174000');
        expect(ok).toBe(true);
        expect(mockGlobals.logger.verbose).toHaveBeenCalled();
    });

    test('returns false for invalid GUID and logs warn', () => {
        const ok = verifyGuid('not-a-guid');
        expect(ok).toBe(false);
        expect(mockGlobals.logger.warn).toHaveBeenCalled();
    });

    test('catches logger error and returns false', () => {
        mockGlobals.logger.verbose.mockImplementation(() => {
            throw new Error('logger fail');
        });
        const ok = verifyGuid('123e4567-e89b-12d3-a456-426614174000');
        expect(ok).toBe(false);
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });
});
