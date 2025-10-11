import { jest } from '@jest/globals';

describe('lib/testemail', () => {
    let sendTestEmail;
    const mockGlobals = {
        config: {
            has: jest.fn().mockReturnValue(false),
            get: jest.fn(),
        },
        logger: { error: jest.fn() },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };
    const mockSmtp = { sendEmailBasic: jest.fn() };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../qseow/smtp/index.js', () => ({ sendEmailBasic: mockSmtp.sendEmailBasic }));
        ({ default: sendTestEmail } = await import('../testemail.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('uses provided from address', () => {
        sendTestEmail('to@x.com', 'from@x.com');
        expect(mockSmtp.sendEmailBasic).toHaveBeenCalledWith(
            'from@x.com',
            ['to@x.com'],
            'normal',
            'Test email from Butler for Qlik Sense',
            expect.any(String),
        );
    });

    test('falls back to noreply when from is empty', () => {
        sendTestEmail('to@x.com', '');
        expect(mockSmtp.sendEmailBasic).toHaveBeenCalledWith(
            'noreply',
            ['to@x.com'],
            'normal',
            'Test email from Butler for Qlik Sense',
            expect.any(String),
        );
    });

    test('logs error when sendEmailBasic throws', () => {
        mockSmtp.sendEmailBasic.mockImplementation(() => {
            throw new Error('send fail');
        });
        sendTestEmail('to@x.com', 'from@x.com');
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });
});
