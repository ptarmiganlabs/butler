import { jest } from '@jest/globals';

describe('lib/config_util', () => {
    let verifyTaskId;
    let configVerifyAllTaskId;

    const mockGlobals = {
        config: {
            has: jest.fn(),
            get: jest.fn(),
        },
        logger: {
            info: jest.fn(),
            verbose: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        const mod = await import('../config_util.js');
        verifyTaskId = mod.verifyTaskId;
        configVerifyAllTaskId = mod.configVerifyAllTaskId;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobals.config.has.mockReturnValue(false);
        mockGlobals.config.get.mockReset();
    });

    test('verifyTaskId returns true for valid GUID and logs verbose', () => {
        const ok = verifyTaskId('123e4567-e89b-12d3-a456-426614174000');
        expect(ok).toBe(true);
        expect(mockGlobals.logger.verbose).toHaveBeenCalled();
    });

    test('verifyTaskId returns false for invalid GUID and logs warn', () => {
        const ok = verifyTaskId('bad');
        expect(ok).toBe(false);
        expect(mockGlobals.logger.warn).toHaveBeenCalled();
    });

    test('configVerifyAllTaskId no-op when feature disabled', () => {
        mockGlobals.config.has.mockReturnValue(false);
        configVerifyAllTaskId();
        expect(mockGlobals.logger.info).not.toHaveBeenCalled();
    });

    test('configVerifyAllTaskId logs for each taskId when enabled', () => {
        mockGlobals.config.has.mockImplementation(
            (k) => k === 'Butler.startTaskFilter.enable' || k === 'Butler.startTaskFilter.allowTask.taskId',
        );
        mockGlobals.config.get.mockImplementation((k) => {
            if (k === 'Butler.startTaskFilter.enable') return true;
            if (k === 'Butler.startTaskFilter.allowTask.taskId') return ['123e4567-e89b-12d3-a456-426614174000', 'bad-guid'];
            return undefined;
        });

        configVerifyAllTaskId();
        expect(mockGlobals.logger.info).toHaveBeenCalled();
        expect(mockGlobals.logger.verbose).toHaveBeenCalled();
        expect(mockGlobals.logger.warn).toHaveBeenCalled();
    });

    test('configVerifyAllTaskId handles thrown error', () => {
        mockGlobals.config.has.mockImplementation(() => {
            throw new Error('boom');
        });
        configVerifyAllTaskId();
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });
});
