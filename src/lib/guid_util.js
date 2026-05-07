import globals from '../globals.js';

/**
 * Regular expression for matching standard GUID format.
 * Matches: 8-4-4-4-12 hexadecimal characters
 * Example: "123e4567-e89b-12d3-a456-426614174000"
 * @type {RegExp}
 */
export const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verify if a string is a valid GUID.
 *
 * Validates that a string conforms to the standard GUID format:
 * 8-4-4-4-12 hexadecimal characters (e.g., "123e4567-e89b-12d3-a456-426614174000")
 *
 * @param {string} guid - The string to verify.
 * @returns {boolean} - True if the GUID is valid, false otherwise.
 */
export const verifyGuid = (guid) => {
    try {
        if (guidRegex.test(guid) === true) {
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
