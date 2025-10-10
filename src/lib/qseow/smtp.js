// This file serves as a backward compatibility layer for the SMTP module.
// All functionality has been split into focused modules in the ./smtp/ subdirectory.
// This file simply re-exports everything to maintain existing import paths.

// Re-export all SMTP functionality for backward compatibility
export { isSmtpConfigOk } from './smtp/config.js';
export { sendEmail, sendEmailBasic } from '../smtp_core.js';
export { sendReloadTaskFailureNotificationEmail } from './smtp/reload-task-failed.js';
export { sendReloadTaskAbortedNotificationEmail } from './smtp/reload-task-aborted.js';
export { sendDistributeTaskFailureNotificationEmail } from './smtp/distribute-task-failed.js';
export { sendDistributeTaskSuccessNotificationEmail } from './smtp/distribute-task-success.js';
export { sendReloadTaskSuccessNotificationEmail } from './smtp/reload-task-success.js';
export { sendServiceMonitorNotificationEmail } from './smtp/service-monitor.js';
