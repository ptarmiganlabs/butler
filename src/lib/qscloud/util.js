import globals from '../../globals.js';

export function getQlikSenseCloudUrls() {
    let qmcUrl = '';
    let hubUrl = '';

    if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc')) {
        qmcUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
    }

    if (globals.config.has('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub')) {
        hubUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');
    }

    return {
        qmcUrl,
        hubUrl,
    };
}
