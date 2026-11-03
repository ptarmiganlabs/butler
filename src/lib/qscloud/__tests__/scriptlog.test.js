import { jest } from '@jest/globals';

const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), verbose: jest.fn() };
jest.unstable_mockModule('../../../globals.js', () => ({
    default: {
        logger,
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        config: { get: jest.fn(), has: jest.fn() },
    },
}));

let scriptlog;

beforeAll(async () => {
    scriptlog = await import('../scriptlog.js');
});

describe('prepareQlikSenseCloudScriptLogForNotification', () => {
    test('takes head and tail rows from the full script log, and counts its rows and characters', () => {
        const res = scriptlog.prepareQlikSenseCloudScriptLogForNotification({ scriptLogFull: ['a', 'bb', 'ccc'], scriptLogSize: 3 }, 1, 2);

        expect(res).toEqual({
            scriptLogAvailable: true,
            scriptLogSizeRows: 3,
            scriptLogSizeCharacters: 6,
            scriptLogHeadCount: 1,
            scriptLogTailCount: 2,
            scriptLogHead: 'a',
            scriptLogTail: 'bb\r\nccc',
        });
    });

    test.each([
        ['could not be obtained', false],
        ['was left out of the alert', {}],
        ['has no rows', { scriptLogFull: [], scriptLogSize: 0 }],
    ])('marks the script log as not available when it %s', (_, input) => {
        const res = scriptlog.prepareQlikSenseCloudScriptLogForNotification(input, 10, 10);

        expect(res).toEqual({
            scriptLogAvailable: false,
            scriptLogSizeRows: 0,
            scriptLogSizeCharacters: 0,
            scriptLogHeadCount: 10,
            scriptLogTailCount: 10,
            scriptLogHead: '',
            scriptLogTail: '',
        });
    });
});
