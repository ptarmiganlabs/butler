import globals from '../../globals.js';

/**
 * Retrieves Qlik Sense Cloud URLs from the configuration.
 * @returns {Object} An object containing the QMC and Hub URLs.
 */
export function getQlikSenseCloudUrls() {
    const qmcUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
    const hubUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');

    return {
        qmcUrl,
        hubUrl,
    };
}
