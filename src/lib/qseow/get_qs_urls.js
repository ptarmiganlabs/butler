import globals from '../../globals.js';

export function getQlikSenseUrls() {
    const qmcUrl = globals.config.get('Butler.qlikSenseUrls.qmc');
    const hubUrl = globals.config.get('Butler.qlikSenseUrls.hub');
    const appBaseUrl = globals.config.get('Butler.qlikSenseUrls.appBaseUrl');

    return { qmcUrl, hubUrl, appBaseUrl };
}
