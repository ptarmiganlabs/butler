import globals from '../globals.js';

// Function to verify if a string is a valid GUID
// Parameters:
// - guid: string to verify
// Returns:
// - true if guid is valid, false otherwise
export const verifyGuid = (guid) => {
    try {
        // Construct a new RegExp object matching guids
        const guidRegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;

        if (guidRegExp.test(guid) === true) {
            globals.logger.verbose(`GUID VERIFY: GUID is valid: ${guid}`);
            return true;
        }
        globals.logger.warn(`GUID VERIFY: GUID not valid: ${guid}`);
    } catch (err) {
        globals.logger.error(`GUID VERIFY: Error verifying GUID: ${err}`);
    }
    return false;
};
