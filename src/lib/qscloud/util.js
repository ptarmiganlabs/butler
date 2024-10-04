import globals from '../../globals.js';

export function getQlikSenseCloudUrls() {
    const qmcUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
    const hubUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');

    return {
        qmcUrl,
        hubUrl,
    };
}
