import globals from '../globals.js';

/**
 * Verify if a string is a valid GUID.
 *
 * Validates that a string conforms to the standard GUID format:
 * 8-4-4-4-12 hexadecimal characters (e.g., "12345678-1234-1234-1234-123456789012")
 *
 * @param {string} guid - The string to verify.
 * @returns {boolean} - True if the GUID is valid, false otherwise.
 */
export const verifyGuid = (guid) => {
    try {
        // RegExp matching standard GUID format:
        // 8 hex digits - 4 hex digits - 4 hex digits - 4 hex digits - 12 hex digits
        const guidRegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;

        if (guidRegExp.test(guid) === true) {
            // GUID is valid - log at verbose level
            globals.logger.verbose(`GUID VERIFY: GUID is valid: ${guid}`);
            return true;
        }
        // GUID did not match pattern - log warning
        globals.logger.warn(`GUID VERIFY: GUID not valid: ${guid}`);
    } catch (err) {
        // Error during validation - log error
        globals.logger.error(`GUID VERIFY: Error verifying GUID: ${globals.getErrorMessage(err)}`);
    }
    return false;
};
