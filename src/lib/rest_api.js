import fs from 'fs';

export function isRestApiTlsEnabled(config) {
    return config.has('Butler.restServerConfig.tls.enable') && config.get('Butler.restServerConfig.tls.enable') === true;
}

export function getRestApiPublicBaseUrl(config) {
    const protocol = isRestApiTlsEnabled(config) ? 'https' : 'http';

    return `${protocol}://${config.get('Butler.restServerConfig.serverHost')}:${config.get('Butler.restServerConfig.serverPort')}`;
}

export function getRestApiTlsOptions(config, readFileSync = fs.readFileSync) {
    if (!isRestApiTlsEnabled(config)) {
        return undefined;
    }

    const certPath = config.get('Butler.restServerConfig.tls.cert');
    const keyPath = config.get('Butler.restServerConfig.tls.key');
    const caPath = config.has('Butler.restServerConfig.tls.ca') ? config.get('Butler.restServerConfig.tls.ca') : undefined;

    try {
        const tlsOptions = {
            cert: readFileSync(certPath),
            key: readFileSync(keyPath),
        };

        if (caPath) {
            tlsOptions.ca = readFileSync(caPath);
        }

        return tlsOptions;
    } catch (err) {
        throw new Error(`REST API TLS configuration could not be loaded: ${err.message}`);
    }
}
