/**
 * UDP Message Sanitization Utilities.
 *
 * Provides functions to sanitize UDP message fields by removing control characters
 * and enforcing maximum field length. This prevents log injection, malformed
 * notifications, and downstream system issues.
 *
 * Based on Butler SOS implementation in butler-sos/src/lib/udp-queue-manager.js:172-180
 */

/**
 * Sanitize a single field by removing control characters and enforcing length limit.
 *
 * Removes all control characters (ASCII 0x00-0x1F and 0x7F) and truncates
 * the field to the specified maximum length.
 *
 * @param {string} field - Field to sanitize
 * @param {number} maxLength - Maximum length (default: 500)
 * @returns {string} Sanitized field
 */
export function sanitizeField(field, maxLength = 500) {
    if (typeof field !== 'string') {
        return String(field).slice(0, maxLength);
    }

    return field
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .slice(0, maxLength);
}

/**
 * Sanitize all fields in a UDP message array.
 *
 * Applies sanitizeField to each element in the message array.
 *
 * @param {Array<string>} msg - UDP message array
 * @param {number} maxLength - Maximum field length (default: 500)
 * @returns {Array<string>} Sanitized message array
 */
export function sanitizeMessage(msg, maxLength = 500) {
    return msg.map((field) => sanitizeField(field, maxLength));
}
