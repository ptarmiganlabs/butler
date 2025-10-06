import { jest } from '@jest/globals';

describe('lib/slack_api', () => {
    let slackSend;
    const mockAxios = { post: jest.fn() };
    const mockLogger = { debug: jest.fn(), error: jest.fn() };
    const mockGlobals = {
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('node:sea', () => ({
            isSea: jest.fn(() => false),
            getAsset: jest.fn(),
            getAssetAsBlob: jest.fn(),
        }));
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        ({ default: slackSend } = await import('../slack_api.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxios.post.mockResolvedValue({ statusText: 'OK', status: 200, data: 'ok' });
    });

    test('logs error and returns when text missing', async () => {
        await slackSend({ webhookUrl: 'http://x', messageType: 'basic' }, mockLogger);
        const msg = 'SLACK SEND: Text missing - mandatory when sending Slack messages';
        expect(mockLogger.error).toHaveBeenCalledWith(msg);
        expect(mockAxios.post).not.toHaveBeenCalled();
    });

    test('sends basic message', async () => {
        const cfg = {
            webhookUrl: 'http://x',
            messageType: 'basic',
            fromUser: 'u',
            channel: 'c',
            iconEmoji: ':smile:',
            text: { text: 'hello' },
        };
        await slackSend(cfg, mockLogger);
        expect(mockAxios.post).toHaveBeenCalled();
        const [url, body] = mockAxios.post.mock.calls[0];
        expect(url).toBe('http://x');
        expect(() => JSON.parse(body)).not.toThrow();
        expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('sends formatted message (JSON string)', async () => {
        const cfg = {
            webhookUrl: 'http://x',
            messageType: 'formatted',
            fromUser: '',
            channel: '',
            iconEmoji: '',
            text: JSON.stringify({ attachments: [{ text: 'hi' }] }),
        };
        await slackSend(cfg, mockLogger);
        expect(mockAxios.post).toHaveBeenCalled();
    });

    test('handles JSON parse error in formatted message', async () => {
        const cfg = {
            webhookUrl: 'http://x',
            messageType: 'formatted',
            fromUser: '',
            channel: '',
            iconEmoji: '',
            text: '{oops',
        };
        await slackSend(cfg, mockLogger);
        expect(mockLogger.error).toHaveBeenCalled();
    });

    test('sends restmsg message', async () => {
        const cfg = {
            webhookUrl: 'http://x',
            messageType: 'restmsg',
            fromUser: '',
            channel: '',
            iconEmoji: '',
            text: { blocks: [{ type: 'section', text: 'hi' }] },
        };
        await slackSend(cfg, mockLogger);
        expect(mockAxios.post).toHaveBeenCalled();
    });
});
