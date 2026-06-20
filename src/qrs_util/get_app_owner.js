import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import globals from '../globals.js';

/**
 * Retrieves information about the owner of a Qlik Sense app.
 *
 * @param {string} appId - The ID of the app.
 * @returns {Promise<object>} - Returns an object containing owner information.
 */
const getAppOwner = async (appId) => {
    let qrsConfig;
    const appEndpoint = `app/${appId}`;

    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        qrsConfig = {
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        const qrsInstance = new QrsClient(qrsConfig);

        // Step 1: Get app owner's userdirectory and userid
        globals.logger.debug(`APPOWNER 1: ${appEndpoint}`);
        const result = await qrsInstance.Get(appEndpoint);
        globals.logger.debug(`APPOWNER: Got response: ${result.statusCode} for app ID ${appId}`);

        if (!hasExpectedQrsStatus(result) || !result.body?.owner) {
            globals.logger.error(
                `APPOWNER: Unexpected app owner response: ${formatQrsResultWithContext(result, appEndpoint, qrsConfig, {
                    method: 'GET',
                    expectedStatusCodes: [200],
                })}`,
            );
            return false;
        }

        const appOwner = result.body.owner;

        // Step 2: Get additional info about the user identified in step 1
        const userEndpoint = `user/${appOwner.id}`;
        try {
            globals.logger.debug(`APPOWNER 2: ${userEndpoint}`);
            const userResult = await qrsInstance.Get(userEndpoint);
            globals.logger.debug(`APPOWNER: Got response: ${userResult.statusCode} for app owner ${appOwner.id}`);

            if (!hasExpectedQrsStatus(userResult) || !Array.isArray(userResult.body?.attributes)) {
                globals.logger.error(
                    `APPOWNER: Unexpected user details response: ${formatQrsResultWithContext(userResult, userEndpoint, qrsConfig, {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    })}`,
                );
                return false;
            }

            // Find email attribute
            const emailAttributes = userResult.body.attributes.filter((attribute) => attribute.attributeType.toLowerCase() === 'email');
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
            globals.logger.error(
                `APPOWNER: Error while getting app owner details 1: ${formatQrsErrorWithContext(err, userEndpoint, qrsConfig)}`,
            );
            return false;
        }
    } catch (err) {
        globals.logger.error(
            `APPOWNER: Error while getting app owner details 2: ${formatQrsErrorWithContext(err, appEndpoint, qrsConfig)}`,
        );
        return false;
    }
};

export default getAppOwner;
