import globals from '../../globals.js';

/**
 * Gets the Qlik Sense URLs from the configuration.
 * @returns {Object} - Returns an object containing the QMC, Hub, and app base URLs.
 */
export function getQlikSenseUrls() {
    const qmcUrl = globals.config.get('Butler.qlikSenseUrls.qmc');
    const hubUrl = globals.config.get('Butler.qlikSenseUrls.hub');
    const appBaseUrl = globals.config.get('Butler.qlikSenseUrls.appBaseUrl');

    return { qmcUrl, hubUrl, appBaseUrl };
}
