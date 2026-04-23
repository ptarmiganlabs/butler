/**
 * SMTP Email Module - Central Re-export.
 *
 * This module provides a central re-export point for all SMTP-related functionality.
 * Import from this module to access email configuration, sending functions, and task notifications.
 *
 * Exported functions:
 * - isSmtpConfigOk: Validate SMTP configuration
 * - sendEmail: Send templated emails
 * - sendEmailBasic: Send simple text emails
 * - Task notification functions (reload, distribute, preload)
 * - Service monitor notifications
 */

// Central re-export point for SMTP functionality
export { isSmtpConfigOk } from './config.js';
export { sendEmail, sendEmailBasic } from '../../smtp_core.js';
export { sendReloadTaskFailureNotificationEmail } from './reload-task-failed.js';
export { sendReloadTaskAbortedNotificationEmail } from './reload-task-aborted.js';
export { sendDistributeTaskFailureNotificationEmail } from './distribute-task-failed.js';
export { sendDistributeTaskSuccessNotificationEmail } from './distribute-task-success.js';
export { sendReloadTaskSuccessNotificationEmail } from './reload-task-success.js';
export { sendPreloadTaskSuccessNotificationEmail } from './preload-task-success.js';
export { sendPreloadTaskFailureNotificationEmail } from './preload-task-failed.js';
export { sendServiceMonitorNotificationEmail } from './service-monitor.js';
