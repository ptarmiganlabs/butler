import { jest } from '@jest/globals';

describe('lib/smtp_core', () => {
    let sendEmail, sendEmailBasic;
    let mockNodemailer;
    let mockHbs;
    let mockExpressHandlebars;
    let mockHandlebars;
    let mockEmailValidator;
    let mockLogger;
    let mockIsSmtpConfigOk;
    let mockGetSmtpOptions;

    const mockSmtpOptions = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
            user: 'user@example.com',
            pass: 'password',
        },
    };

    beforeAll(async () => {
        const mockTransporter = {
            use: jest.fn(),
            verify: jest.fn().mockResolvedValue(true),
            sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
        };

        mockNodemailer = {
            createTransport: jest.fn(() => mockTransporter),
        };

        mockHbs = jest.fn(() => 'hbs-middleware');
        mockExpressHandlebar = { create: jest.fn(() => 'view-engine') };
        mockHandlebars = {
            registerHelper: jest.fn(),
            compile: jest.fn(() => (context) => 'compiled-subject'),
        };
        mockEmailValidator = { validate: jest.fn(() => true) };

        mockLogger = {
            debug: jest.fn(),
            verbose: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        mockIsSmtpConfigOk = jest.fn(() => true);
        mockGetSmtpOptions = jest.fn(() => mockSmtpOptions);

        await jest.unstable_mockModule('nodemailer', () => ({ default: mockNodemailer }));
        await jest.unstable_mockModule('nodemailer-express-handlebars', () => ({ default: mockHbs }));
        await jest.unstable_mockModule('express-handlebars', () => ({ default: mockExpressHandlebar }));
        await jest.unstable_mockModule('handlebars', () => ({ default: mockHandlebars }));
        await jest.unstable_mockModule('email-validator', () => ({ default: mockEmailValidator }));
        await jest.unstable_mockModule('../../globals.js', () => ({
            default: { logger: mockLogger, getErrorMessage: jest.fn((err) => err?.message || 'Unknown error') },
        }));
        await jest.unstable_mockModule('../qseow/smtp/config.js', () => ({
            isSmtpConfigOk: mockIsSmtpConfigOk,
            getSmtpOptions: mockGetSmtpOptions,
        }));

        const module = await import('../smtp_core.js');
        sendEmail = module.sendEmail;
        sendEmailBasic = module.sendEmailBasic;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendEmail', () => {
        test('returns 1 when SMTP config is not OK', async () => {
            mockIsSmtpConfigOk.mockReturnValueOnce(false);

            const result = await sendEmail(
                'from@example.com',
                ['to@example.com'],
                'high',
                'Subject {{name}}',
                '/path/to/views',
                'body-template',
                { name: 'Test' },
            );

            expect(result).toBe(1);
            expect(mockNodemailer.createTransport).not.toHaveBeenCalled();
        });

        test('sends email with valid recipient', async () => {
            const result = await sendEmail(
                'from@example.com',
                ['to@example.com'],
                'normal',
                'Subject {{name}}',
                '/path/to/views',
                'body-template',
                { name: 'Test' },
            );

            expect(mockNodemailer.createTransport).toHaveBeenCalled();
            expect(mockEmailValidator.validate).toHaveBeenCalledWith('to@example.com');
        });

        test('skips invalid email addresses', async () => {
            mockEmailValidator.validate.mockReturnValueOnce(false);

            await sendEmail('from@example.com', ['invalid-email'], 'normal', 'Subject', '/path/to/views', 'body-template', {});

            expect(mockLogger.warn).toHaveBeenCalled();
            // createTransport is called before the email validation loop in the actual function
            expect(mockNodemailer.createTransport).toHaveBeenCalled();
        });

        test('compiles subject with Handlebars', async () => {
            await sendEmail('from@example.com', ['to@example.com'], 'normal', 'Hello {{name}}', '/path/to/views', 'body-template', {
                name: 'World',
            });

            expect(mockHandlebars.compile).toHaveBeenCalledWith('Hello {{name}}');
        });

        test('sets up view engine for email body', async () => {
            await sendEmail('from@example.com', ['to@example.com'], 'normal', 'Subject', '/path/to/views', 'body-template', {});

            expect(mockExpressHandlebar.create).toHaveBeenCalledWith({
                partialsDir: 'partials/',
                defaultLayout: false,
            });
        });

        test('registers eq helper with Handlebars', async () => {
            await sendEmail('from@example.com', ['to@example.com'], 'normal', 'Subject', '/path/to/views', 'body-template', {});

            expect(mockHandlebars.registerHelper).toHaveBeenCalledWith('eq', expect.any(Function));
        });

        test('verifies SMTP connection before sending', async () => {
            const mockTransporter = {
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
                sendMail: jest.fn().mockResolvedValue({}),
            };
            mockNodemailer.createTransport.mockReturnValueOnce(mockTransporter);

            await sendEmail('from@example.com', ['to@example.com'], 'normal', 'Subject', '/path/to/views', 'body-template', {});

            expect(mockTransporter.verify).toHaveBeenCalled();
        });

        test('sends email via transporter when SMTP is ready', async () => {
            const mockTransporter = {
                use: jest.fn(),
                verify: jest.fn().mockResolvedValue(true),
                sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-123' }),
            };
            mockNodemailer.createTransport.mockReturnValueOnce(mockTransporter);

            await sendEmail('from@example.com', ['to@example.com'], 'high', 'Subject', '/path/to/views', 'body-template', {});

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 'high',
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'compiled-subject',
                    template: 'body-template',
                    context: {},
                }),
            );
        });
    });

    describe('sendEmailBasic', () => {
        test('returns 1 when SMTP config is not OK', async () => {
            mockIsSmtpConfigOk.mockReturnValueOnce(false);

            const result = await sendEmailBasic('from@example.com', ['to@example.com'], 'normal', 'Subject', 'Body text');

            expect(result).toBe(1);
        });

        test('sends basic email with valid recipient', async () => {
            const mockTransporter = {
                createTransport: jest.fn().mockReturnValue({
                    verify: jest.fn().mockResolvedValue(true),
                    sendMail: jest.fn().mockResolvedValue({}),
                }),
            };
            mockNodemailer.createTransport.mockReturnValueOnce(mockTransporter.createTransport());

            await sendEmailBasic('from@example.com', ['to@example.com'], 'normal', 'Subject', 'Body text');

            expect(mockEmailValidator.validate).toHaveBeenCalledWith('to@example.com');
        });

        test('skips invalid email in basic email', async () => {
            mockEmailValidator.validate.mockReturnValueOnce(false);

            await sendEmailBasic('from@example.com', ['invalid-email'], 'normal', 'Subject', 'Body');

            expect(mockLogger.warn).toHaveBeenCalled();
        });

        test('sends email with text body', async () => {
            const mockTransporter = {
                verify: jest.fn().mockResolvedValue(true),
                sendMail: jest.fn().mockResolvedValue({}),
            };
            mockNodemailer.createTransport.mockReturnValueOnce(mockTransporter);

            await sendEmailBasic('from@example.com', ['to@example.com'], 'low', 'Test Subject', 'Test Body');

            expect(mockTransporter.sendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    priority: 'low',
                    from: 'from@example.com',
                    to: 'to@example.com',
                    subject: 'Test Subject',
                    text: 'Test Body',
                }),
            );
        });
    });
});
