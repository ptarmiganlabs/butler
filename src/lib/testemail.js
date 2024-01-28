import globals from '../globals.js';
import { sendEmailBasic } from './smtp.js';

function sendTestEmail(emailAddress, fromAddress) {
    try {
        if (fromAddress.length > 0) {
            sendEmailBasic(
                fromAddress,
                [emailAddress],
                'normal',
                'Test email from Butler for Qlik Sense',
                "This is a test email sent from your friendly Butler for Qlik Sense Enterprise on Windows.\n\nIf you get this email Butler's email configuration is correct and working."
            );
        } else {
            sendEmailBasic(
                'noreply',
                [emailAddress],
                'normal',
                'Test email from Butler for Qlik Sense',
                "This is a test email sent from your friendly Butler for Qlik Sense Enterprise on Windows.\n\nIf you get this email Butler's email configuration is correct and working."
            );
        }
    } catch (err) {
        globals.logger.error(`EMAIL TEST: ${err}`);
    }
}

export default sendTestEmail;
