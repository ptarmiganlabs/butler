const QrsInteract = require('qrs-interact');
const globals = require('../globals');

// Function for getting info about owner of Qlik Sense apps
module.exports.getAppOwner = async (appId) => {
    try {
        const qrsInstance = new QrsInteract({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: {
                'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
            },
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
