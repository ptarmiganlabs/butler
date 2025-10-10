/* eslint-disable consistent-return */
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import expressHandlebars from 'express-handlebars';
import handlebars from 'handlebars';
import emailValidator from 'email-validator';
import globals from '../globals.js';
import { isSmtpConfigOk, getSmtpOptions } from './qseow/smtp/config.js';

/**
 * Sends an email using the specified parameters.
 * @param {string} from - Sender email address.
 * @param {string[]} recipientsEmail - Array of recipient email addresses.
 * @param {string} emailPriority - Email priority.
 * @param {string} subjectHandlebars - Handlebars template for the email subject.
 * @param {string} viewPath - Path to the email template.
 * @param {string} bodyFileHandlebars - Handlebars template for the email body.
 * @param {object} templateContext - Context for the Handlebars template.
 * @returns {Promise<void>}
 */
export async function sendEmail(from, recipientsEmail, emailPriority, subjectHandlebars, viewPath, bodyFileHandlebars, templateContext) {
    try {
        // First make sure email sending is enabled in the config file and that we have all required SMTP settings
        if (isSmtpConfigOk() === false) {
            return 1;
        }

        const smtpOptions = getSmtpOptions();
        const transporter = nodemailer.createTransport(smtpOptions);

        const viewEngine = expressHandlebars.create({
            partialsDir: 'partials/',
            defaultLayout: false,
        });

        const sut = hbs({
            viewEngine,
            viewPath,
        });

        // Register handlebars helper to compare values
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });

        // Attach the template plugin to the nodemailer transporter
        transporter.use('compile', sut);

        // Process subject template
        const subjectTemplate = handlebars.compile(subjectHandlebars);
        const subject = subjectTemplate(templateContext);

        // Loop over all email recipients
        // eslint-disable-next-line no-restricted-syntax
        for (const recipientEmail of recipientsEmail) {
            // Verify that email address is valid
            if (emailValidator.validate(recipientEmail) === true) {
                // Recipient email address has valid format
                // Set up mail object
                const message = {
                    priority: emailPriority,
                    from,
                    to: recipientEmail,
                    subject,
                    template: bodyFileHandlebars,
                    context: templateContext,
                };

                // Verify SMTP configuration
                // eslint-disable-next-line no-await-in-loop
                const smtpStatus = await transporter.verify();
                globals.logger.debug(`[QSEOW] EMAIL CONFIG: SMTP status: ${smtpStatus}`);
                globals.logger.debug(`[QSEOW] EMAIL CONFIG: Message=${JSON.stringify(message, null, 2)}`);

                if (smtpStatus) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = await transporter.sendMail(message);
                    globals.logger.debug(
                        `[QSEOW] EMAIL CONFIG: Sending reload failure notification result: ${JSON.stringify(result, null, 2)}`,
                    );
                } else {
                    globals.logger.warn('[QSEOW] EMAIL CONFIG: SMTP transporter not ready');
                }
            } else {
                globals.logger.warn(`[QSEOW] EMAIL CONFIG: Recipient email adress not valid: ${recipientEmail}`);
            }
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Sends a basic email using the specified parameters.
 * @param {string} from - Sender email address.
 * @param {string[]} recipientsEmail - Array of recipient email addresses.
 * @param {string} emailPriority - Email priority.
 * @param {string} subject - Email subject.
 * @param {string} body - Email body.
 * @returns {Promise<void>}
 */
export async function sendEmailBasic(from, recipientsEmail, emailPriority, subject, body) {
    try {
        // First make sure email sending is enabled in the config file and that we have all required SMTP settings
        if (isSmtpConfigOk() === false) {
            return 1;
        }

        const smtpOptions = getSmtpOptions();
        const transporter = nodemailer.createTransport(smtpOptions);

        // Loop over all email recipients
        // eslint-disable-next-line no-restricted-syntax
        for (const recipientEmail of recipientsEmail) {
            // Verify that email address is valid
            if (emailValidator.validate(recipientEmail) === true) {
                // Recipient email address has valid format
                // Set up mail object
                const message = {
                    priority: emailPriority,
                    from,
                    to: recipientEmail,
                    subject,
                    text: body,
                };

                // Verify SMTP configuration
                // eslint-disable-next-line no-await-in-loop
                const smtpStatus = await transporter.verify();
                globals.logger.debug(`[QSEOW] SMTP BASIC: SMTP status: ${smtpStatus}`);
                globals.logger.debug(`[QSEOW] SMTP BASIC: Message=${JSON.stringify(message, null, 2)}`);

                if (smtpStatus) {
                    // eslint-disable-next-line no-await-in-loop
                    const result = await transporter.sendMail(message);
                    globals.logger.debug(`[QSEOW] SMTP BASIC: Sending email result: ${JSON.stringify(result, null, 2)}`);
                } else {
                    globals.logger.warn('SMTP BASIC: SMTP transporter not ready');
                }
            } else {
                globals.logger.warn(`[QSEOW] SMTP BASIC: Recipient email adress not valid: ${recipientEmail}`);
            }
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] SMTP BASIC: ${globals.getErrorMessage(err)}`);
    }
}
