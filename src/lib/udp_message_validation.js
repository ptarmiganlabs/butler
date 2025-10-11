import globals from '../globals.js';

// Maximum UDP message size (UDP protocol limit)
const MAX_UDP_MESSAGE_SIZE = 65507;

// Maximum field length for sanitization (prevent memory issues)
const MAX_FIELD_LENGTH = 10000;

// UUID/GUID validation regex (RFC 4122 compliant)
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a UDP message buffer is within size limits
 * @param {Buffer} message - The UDP message buffer to validate
 * @returns {boolean} - True if message size is valid, false otherwise
 */
export const validateMessageSize = (message) => {
    if (!message || !Buffer.isBuffer(message)) {
        globals.logger.error('[UDP VALIDATION] Invalid message: not a Buffer');
        return false;
    }

    if (message.length > MAX_UDP_MESSAGE_SIZE) {
        globals.logger.error(
            `[UDP VALIDATION] Message size (${message.length} bytes) exceeds maximum allowed size (${MAX_UDP_MESSAGE_SIZE} bytes)`,
        );
        return false;
    }

    return true;
};

/**
 * Validate that a task ID is a valid GUID/UUID
 * @param {string} taskId - The task ID to validate
 * @returns {boolean} - True if task ID is valid, false otherwise
 */
export const validateTaskId = (taskId) => {
    if (!taskId || typeof taskId !== 'string') {
        return false;
    }

    return GUID_REGEX.test(taskId.trim());
};

/**
 * Validate that an app ID is a valid GUID/UUID (if present)
 * App IDs can be empty strings for some task types (external program, user sync)
 * @param {string} appId - The app ID to validate
 * @returns {boolean} - True if app ID is valid or empty, false otherwise
 */
export const validateAppId = (appId) => {
    if (!appId || appId.trim() === '') {
        return true; // Empty app IDs are valid for some task types
    }

    return GUID_REGEX.test(appId.trim());
};

/**
 * Sanitize a message field by trimming whitespace and limiting length
 * @param {string} field - The field to sanitize
 * @param {number} maxLength - Maximum length (default: MAX_FIELD_LENGTH)
 * @returns {string} - Sanitized field value
 */
export const sanitizeField = (field, maxLength = MAX_FIELD_LENGTH) => {
    if (!field || typeof field !== 'string') {
        return '';
    }

    return field.trim().substring(0, maxLength);
};

/**
 * Validate and sanitize a UDP message
 * @param {Buffer} message - The UDP message buffer
 * @param {number} expectedFieldCount - Expected number of fields after split
 * @returns {Object} - Object with valid flag and sanitized message array
 */
export const validateAndSanitizeMessage = (message, expectedFieldCount) => {
    // Check message size
    if (!validateMessageSize(message)) {
        return { valid: false, msg: null };
    }

    // Convert to string with explicit UTF-8 encoding
    let messageStr;
    try {
        messageStr = message.toString('utf8');
    } catch (err) {
        globals.logger.error(`[UDP VALIDATION] Failed to decode message as UTF-8: ${globals.getErrorMessage(err)}`);
        return { valid: false, msg: null };
    }

    // Split by semicolon
    const msg = messageStr.split(';');

    // Validate field count
    if (msg.length !== expectedFieldCount) {
        globals.logger.warn(
            `[UDP VALIDATION] Invalid field count. Expected ${expectedFieldCount}, got ${msg.length}. Message: ${messageStr}`,
        );
        return { valid: false, msg: null };
    }

    // Sanitize all fields
    const sanitizedMsg = msg.map((field) => sanitizeField(field));

    return { valid: true, msg: sanitizedMsg };
};

/**
 * Validate critical fields in a scheduler/task message
 * @param {Array<string>} msg - The message array (already split and sanitized)
 * @param {Object} options - Validation options
 * @param {number} options.taskIdIndex - Index of task ID field (default: 5)
 * @param {number} options.appIdIndex - Index of app ID field (default: 6)
 * @param {boolean} options.requireAppId - Whether app ID is required (default: true)
 * @param {boolean} options.strict - Whether to fail on invalid IDs (default: false, just logs warning)
 * @returns {boolean} - True if critical fields are valid (or warnings logged in non-strict mode), false otherwise
 */
export const validateCriticalFields = (msg, options = {}) => {
    const { taskIdIndex = 5, appIdIndex = 6, requireAppId = true, strict = false } = options;

    let isValid = true;

    // Validate task ID if present
    if (msg[taskIdIndex]) {
        if (!validateTaskId(msg[taskIdIndex])) {
            globals.logger.warn(`[UDP VALIDATION] Invalid task ID format: ${msg[taskIdIndex]}`);
            if (strict) {
                isValid = false;
            }
        }
    }

    // Validate app ID if present (and required)
    if (requireAppId && msg[appIdIndex]) {
        if (!validateAppId(msg[appIdIndex])) {
            globals.logger.warn(`[UDP VALIDATION] Invalid app ID format: ${msg[appIdIndex]}`);
            if (strict) {
                isValid = false;
            }
        }
    }

    return isValid;
};
