import QrsClient from '../lib/qrs_client.js';
import globals from '../globals.js';

/**
 * Retrieves information about the owner of a Qlik Sense app.
 *
 * @param {string} appId - The ID of the app.
 * @returns {Promise<object>} - Returns an object containing owner information.
 */
const getAppOwner = async (appId) => {
    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        const qrsInstance = new QrsClient({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        });

        // Step 1: Get app owner's userdirectory and userid
        let appOwner = null;
        try {
            globals.logger.debug(`APPOWNER 1: app/${appId}`);
            const result = await qrsInstance.Get(`app/${appId}`);
            globals.logger.debug(`APPOWNER: Got response: ${result.statusCode} for app ID ${appId}`);

            appOwner = result.body.owner;
        } catch (err) {
            globals.logger.error(`APPOWNER: Error while getting app owner: ${JSON.stringify(err, null, 2)}`);
            throw new Error('Error while getting app owner');
        }

        // Step 2: Get additional info about the user identified in step 1
        try {
            globals.logger.debug(`APPOWNER 2: user/${appOwner.id}`);
            const result = await qrsInstance.Get(`user/${appOwner.id}`);
            globals.logger.debug(`APPOWNER: Got response: ${result.statusCode} for app owner ${appOwner.id}`);

            // Find email attribute
            const emailAttributes = result.body.attributes.filter((attribute) => attribute.attributeType.toLowerCase() === 'email');
            const resultAttributes = emailAttributes.map((attribute) => attribute.attributeValue);

            // if (resultAttributes.length > 0) {
            return {
                id: appOwner.id,
                directory: appOwner.userDirectory,
                userId: appOwner.userId,
                userName: appOwner.name,
                emails: resultAttributes,
            };
            // }
        } catch (err) {
            globals.logger.error(`APPOWNER: Error while getting app owner details 1: ${JSON.stringify(err, null, 2)}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`APPOWNER: Error while getting app owner details 2: ${JSON.stringify(err, null, 2)}`);
        return false;
    }
};

export default getAppOwner;
