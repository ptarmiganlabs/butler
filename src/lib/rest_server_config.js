import fs from 'fs';

/**
 * Check whether TLS is enabled for Butler's public REST API.
 *
 * @param {import('config').IConfig} config - Butler config object.
 * @returns {boolean} True if REST API TLS is enabled.
 */
export function isRestApiTlsEnabled(config) {
    return config.has('Butler.restServerConfig.tls.enable') && config.get('Butler.restServerConfig.tls.enable') === true;
}

/**
 * Get the public scheme used by Butler's REST API.
 *
 * @param {import('config').IConfig} config - Butler config object.
 * @returns {'http' | 'https'} REST API scheme.
 */
export function getRestApiScheme(config) {
    return isRestApiTlsEnabled(config) ? 'https' : 'http';
}

/**
 * Build a public Butler REST API URL from config.
 *
 * @param {import('config').IConfig} config - Butler config object.
 * @param {string} [portConfigKey='serverPort'] - Port config key to use.
 * @returns {string} REST API base URL.
 */
export function getRestApiUrl(config, portConfigKey = 'serverPort') {
    return `${getRestApiScheme(config)}://${config.get('Butler.restServerConfig.serverHost')}:${config.get(
        `Butler.restServerConfig.${portConfigKey}`,
    )}`;
}

/**
 * Load TLS files for Butler's public REST API.
 *
 * @param {import('config').IConfig} config - Butler config object.
 * @param {typeof fs} [fileSystem=fs] - File system implementation.
 * @returns {import('tls').TlsOptions | undefined} HTTPS options for Fastify, if enabled.
 */
export function getRestApiTlsOptions(config, fileSystem = fs) {
    if (!isRestApiTlsEnabled(config)) {
        return undefined;
    }

    const tlsOptions = {
        cert: fileSystem.readFileSync(config.get('Butler.restServerConfig.tls.cert')),
        key: fileSystem.readFileSync(config.get('Butler.restServerConfig.tls.key')),
    };

    const caPath =
        config.has('Butler.restServerConfig.tls.ca') && config.get('Butler.restServerConfig.tls.ca')
            ? config.get('Butler.restServerConfig.tls.ca')
            : null;

    if (caPath) {
        tlsOptions.ca = fileSystem.readFileSync(caPath);
    }

    return tlsOptions;
}
