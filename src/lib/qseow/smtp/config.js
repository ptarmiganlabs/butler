import { RateLimiterMemory } from 'rate-limiter-flexible';
import globals from '../../../globals.js';

// Rate limiters
export let rateLimiterMemorySuccessReloads;
export let rateLimiterMemoryFailedReloads;
export let rateLimiterMemoryAbortedReloads;
export let rateLimiterMemorySuccessDistribute;
export let rateLimiterMemoryFailedDistribute;
export let rateLimiterMemoryServiceMonitor;

// Initialize rate limiters
if (globals.config.has('Butler.emailNotification.reloadTaskSuccess.rateLimit')) {
    rateLimiterMemorySuccessReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.reloadTaskSuccess.rateLimit'),
    });
} else {
    rateLimiterMemorySuccessReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.reloadTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.reloadTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.reloadTaskAborted.rateLimit')) {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.reloadTaskAborted.rateLimit'),
    });
} else {
    rateLimiterMemoryAbortedReloads = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.distributeTaskSuccess.rateLimit')) {
    rateLimiterMemorySuccessDistribute = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.distributeTaskSuccess.rateLimit'),
    });
} else {
    rateLimiterMemorySuccessDistribute = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.distributeTaskFailure.rateLimit')) {
    rateLimiterMemoryFailedDistribute = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.distributeTaskFailure.rateLimit'),
    });
} else {
    rateLimiterMemoryFailedDistribute = new RateLimiterMemory({ points: 1, duration: 300 });
}

if (globals.config.has('Butler.emailNotification.serviceStopped.rateLimit')) {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({
        points: 1,
        duration: globals.config.get('Butler.emailNotification.serviceStopped.rateLimit'),
    });
} else {
    rateLimiterMemoryServiceMonitor = new RateLimiterMemory({ points: 1, duration: 300 });
}

/**
 * Checks if SMTP configuration is valid.
 * @returns {boolean} True if SMTP configuration is valid, false otherwise.
 */
export function isSmtpConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.enable')) {
            // SMTP is disabled
            globals.logger.error('[QSEOW] EMAIL CONFIG: SMTP notifications are disabled in config file - will not send email');
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email reload success notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
export function isEmailReloadSuccessNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.reloadTaskSuccess.enable')) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Reload success email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email reload failure notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
export function isEmailReloadFailedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.reloadTaskFailure.enable')) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Reload failure email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email reload aborted notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
export function isEmailReloadAbortedNotificationConfigOk() {
    try {
        // First make sure email sending is enabled in the config file
        if (!globals.config.get('Butler.emailNotification.reloadTaskAborted.enable')) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Reload aborted email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Checks if email service monitor notification configuration is valid.
 * @returns {boolean} True if configuration is valid, false otherwise.
 */
export function isEmailServiceMonitorNotificationConfig() {
    try {
        // First make sure email sending is enabled in the config file
        if (
            !globals.config.get('Butler.serviceMonitor.enable') ||
            !globals.config.get('Butler.serviceMonitor.alertDestination.email.enable')
        ) {
            // SMTP is disabled
            globals.logger.error(
                '[QSEOW] EMAIL CONFIG: Service monitor email notifications are disabled in config file - will not send email',
            );
            return false;
        }

        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] EMAIL CONFIG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Retrieves SMTP options from the configuration.
 * @returns {object} SMTP options.
 */
export function getSmtpOptions() {
    const smtpOptions = {
        host: globals.config.get('Butler.emailNotification.smtp.host'),
        port: globals.config.get('Butler.emailNotification.smtp.port'),
        secure: globals.config.get('Butler.emailNotification.smtp.secure'),
        tls: {
            rejectUnauthorized: globals.config.get('Butler.emailNotification.smtp.tls.rejectUnauthorized'),
            serverName: globals.config.get('Butler.emailNotification.smtp.tls.serverName'),
            ignoreTLS: globals.config.get('Butler.emailNotification.smtp.tls.ignoreTLS'),
            requireTLS: globals.config.get('Butler.emailNotification.smtp.tls.requireTLS'),
        },
    };

    if (globals.config.get('Butler.emailNotification.smtp.auth.enable')) {
        smtpOptions.auth = {
            user: globals.config.get('Butler.emailNotification.smtp.auth.user'),
            pass: globals.config.get('Butler.emailNotification.smtp.auth.password'),
        };
    }

    return smtpOptions;
}
