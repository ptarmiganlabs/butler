import globals from '../globals.js';
import { sendEmailBasic } from './qseow/smtp/index.js';

/**
 * Sends a test email to verify email configuration.
 * @param {string} emailAddress - The recipient's email address.
 * @param {string} fromAddress - The sender's email address.
 */
function sendTestEmail(emailAddress, fromAddress) {
    try {
        if (fromAddress.length > 0) {
            sendEmailBasic(
                fromAddress,
                [emailAddress],
                'normal',
                'Test email from Butler for Qlik Sense',
                "This is a test email sent from your friendly Butler for Qlik Sense Enterprise on Windows.\n\nIf you get this email Butler's email configuration is correct and working.",
            );
        } else {
            sendEmailBasic(
                'noreply',
                [emailAddress],
                'normal',
                'Test email from Butler for Qlik Sense',
                "This is a test email sent from your friendly Butler for Qlik Sense Enterprise on Windows.\n\nIf you get this email Butler's email configuration is correct and working.",
            );
        }
    } catch (err) {
        globals.logger.error(`EMAIL TEST: ${globals.getErrorMessage(err)}`);
    }
}

export default sendTestEmail;
