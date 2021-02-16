/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

let qrsInteract = require('qrs-interact');
var globals = require('../globals.js');

// Function for getting info about owner of Qlik Sense apps
module.exports.getAppOwner = function (appId) {
    return new Promise(async (resolve, reject) => {
        try {
            let qrsInstance = new qrsInteract({
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
                let result = await qrsInstance.Get(`app/${appId}`);
                globals.logger.debug(`APPOWNER: Got response: ${result.statusCode} for app ID ${appId}`);

                appOwner = result.body.owner;
            } catch (err) {
                globals.logger.error(`APPOWNER: Error while getting app owner: ${JSON.stringify(err, null, 2)}`);
                throw 'Error while getting app owner';
            }

            // Step 2: Get additional info about the user identified in step 1
            try {
                let result = await qrsInstance.Get(`user/${appOwner.id}`);
                globals.logger.debug(`APPOWNER: Got response: ${result.statusCode} for app owner ${appOwner.id}`);

                // Find email attribute
                let emailAttributes = result.body.attributes.filter(attribute => attribute.attributeType.toLowerCase() == 'email');
                let resultAttributes = emailAttributes.map(attribute => attribute.attributeValue);

                if (resultAttributes.length > 0) {
                    resolve ({
                        id: appOwner.id,
                        directory: appOwner.userDirectory,
                        userId: appOwner.userId,
                        userName: appOwner.name,
                        emails: resultAttributes,
                    });
                }
            } catch (err) {
                globals.logger.error(`APPOWNER: Error while getting app owner details: ${JSON.stringify(err, null, 2)}`);
            }
        } catch (err) {
            globals.logger.error(`APPOWNER: Error while starting Sense task: ${JSON.stringify(err, null, 2)}`);
        }
    });
};
