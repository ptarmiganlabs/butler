import path from 'path';
import QrsInteract from 'qrs-interact';
import globals from '../globals.js';

/**
 * Function to get metadata for a specific app from QSEoW
 * @param {*} appId
 * @returns
 */
async function getAppMetadata(appId) {
    globals.logger.debug(`[QSEOW] GET APP METADATA: Retrieving metadata for app ${appId}`);

    try {
        // Get http headers from Butler config file
        const httpHeaders = globals.getQRSHttpHeaders();

        const qrsInstance = new QrsInteract({
            hostname: globals.configQRS.host,
            portNumber: globals.configQRS.port,
            headers: httpHeaders,
            certificates: {
                certFile: path.resolve(globals.configQRS.certPaths.certPath),
                keyFile: path.resolve(globals.configQRS.certPaths.keyPath),
            },
        });

        // Get app metadata
        try {
            globals.logger.debug(`[QSEOW] GET APP METADATA: app/full?filter=id eq ${appId}`);

            const result = await qrsInstance.Get(`app/full?filter=id eq ${appId}`);
            globals.logger.debug(`[QSEOW] GET APP METADATA: Got response: ${result.statusCode}`);

            if (result.body.length === 1) {
                // Yes, the app exists. Return metadata for this app
                return result.body[0];
            }

            // The task does not exist
            return {};
        } catch (err) {
            globals.logger.error(`[QSEOW] GET APP METADATA: Error while getting app metadata: ${err.message}`);
            return false;
        }
    } catch (err) {
        globals.logger.error(`[QSEOW] GET APP METADATA: Error while getting app metadata: ${err}`);
        return false;
    }
}

export default getAppMetadata;
