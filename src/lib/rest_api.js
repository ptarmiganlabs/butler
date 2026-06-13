import fs from 'fs';

/**
 * Load a REST API TLS PEM file.
 * @param {Function} readFileSync - Function used to read a TLS file from disk.
 * @param {string} filePath - Path to the TLS file.
 * @param {string} fileDescription - Human-readable description of the TLS file.
 * @returns {string} Contents of the TLS file.
 */
function loadTlsFile(readFileSync, filePath, fileDescription) {
    try {
        return readFileSync(filePath, 'utf8');
    } catch (err) {
        throw new Error(`REST API TLS ${fileDescription} file could not be loaded (${filePath}): ${err.message}`, { cause: err });
    }
}

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
    const caPath = config.get('Butler.restServerConfig.tls.ca');
    const tlsOptions = {
        cert: loadTlsFile(readFileSync, certPath, 'cert'),
        key: loadTlsFile(readFileSync, keyPath, 'key'),
    };

    if (caPath) {
        tlsOptions.ca = loadTlsFile(readFileSync, caPath, 'CA');
    }

    return tlsOptions;
}
