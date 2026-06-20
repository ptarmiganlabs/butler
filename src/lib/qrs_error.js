import globals from '../globals.js';

const KNOWN_ERROR_KEYS = new Set([
    'code',
    'message',
    'config',
    'response',
    'request',
    'errno',
    'syscall',
    'hostname',
    'address',
    'stack',
    'name',
    'isAxiosError',
    'toJSON',
]);

const SENSITIVE_KEYS = new Set([
    'authorization',
    'auth',
    'token',
    'password',
    'cookie',
    'secret',
    'apikey',
    'api_key',
    'key',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'privatekey',
    'private_key',
]);

/**
 * Append common QRS request context to a list of log message parts.
 * @param {string[]} parts - Output parts for the log message.
 * @param {string} endpoint - The QRS endpoint being called.
 * @param {Object} qrsConfig - QRS configuration containing host and port.
 * @param {Object} [options={}] - Optional request metadata.
 * @param {string} [options.method] - HTTP method used for the request.
 * @param {number[]} [options.expectedStatusCodes] - Expected HTTP status codes.
 *
 * @returns {void}
 */
function appendRequestContext(parts, endpoint, qrsConfig, options = {}) {
    const { method, expectedStatusCodes } = options;

    if (endpoint) parts.push(`endpoint: ${endpoint}`);
    if (qrsConfig?.hostname) parts.push(`host: ${qrsConfig.hostname}`);
    if (qrsConfig?.portNumber) parts.push(`port: ${qrsConfig.portNumber}`);
    if (method) parts.push(`method: ${method.toUpperCase()}`);
    if (Array.isArray(expectedStatusCodes) && expectedStatusCodes.length > 0) {
        parts.push(`expectedStatus: ${expectedStatusCodes.join('|')}`);
    }
}

/**
 * Summarize a QRS response body for error logging without dumping large payloads.
 * @param {string[]} parts - Output parts for the log message.
 * @param {*} body - QRS response body to summarize.
 *
 * @returns {void}
 */
function appendResponseBodySummary(parts, body) {
    if (body === undefined || body === null) {
        return;
    }

    if (typeof body === 'string' || typeof body === 'number' || typeof body === 'boolean') {
        parts.push(`body: ${body}`);
        return;
    }

    if (Array.isArray(body)) {
        parts.push(`bodyType: array`);
        parts.push(`bodyLength: ${body.length}`);
        return;
    }

    if (typeof body === 'object') {
        if (body.message) parts.push(`body.message: ${body.message}`);
        if (body.error) parts.push(`body.error: ${body.error}`);
        if (body.details && typeof body.details !== 'object') parts.push(`body.details: ${body.details}`);
        if (body.code !== undefined && typeof body.code !== 'object') parts.push(`body.code: ${body.code}`);

        if (!body.message && !body.error && !body.details && body.code === undefined) {
            parts.push(`bodyType: object`);
        }
    }
}

/**
 * Check whether a QRS result contains one of the expected status codes.
 * @param {Object} result - QRS client result object.
 * @param {number[]} [expectedStatusCodes=[200]] - Accepted status codes.
 *
 * @returns {boolean} True if the status code matches one of the expected values.
 */
export function hasExpectedQrsStatus(result, expectedStatusCodes = [200]) {
    return !!result && typeof result === 'object' && Array.isArray(expectedStatusCodes) && expectedStatusCodes.includes(result.statusCode);
}

/**
 * Check whether a generic HTTP result contains one of the expected status codes.
 * @param {Object} result - HTTP result object.
 * @param {number[]} [expectedStatusCodes=[200]] - Accepted status codes.
 *
 * @returns {boolean} True if the status code matches one of the expected values.
 */
export function hasExpectedHttpStatus(result, expectedStatusCodes = [200]) {
    return !!result && typeof result === 'object' && Array.isArray(expectedStatusCodes) && expectedStatusCodes.includes(result.status);
}

/**
 * Format a QRS client response object with request context for error logging.
 * @param {Object} result - QRS client result object.
 * @param {string} endpoint - The QRS endpoint that was called.
 * @param {Object} qrsConfig - QRS configuration containing host and port.
 * @param {Object} [options={}] - Optional request metadata.
 * @param {string} [options.method='GET'] - HTTP method used for the request.
 * @param {number[]} [options.expectedStatusCodes=[200]] - Expected HTTP status codes.
 *
 * @returns {string} Formatted response summary with contextual metadata.
 */
export function formatQrsResultWithContext(result, endpoint, qrsConfig, options = {}) {
    const { method = 'GET', expectedStatusCodes = [200] } = options;
    const parts = [];

    appendRequestContext(parts, endpoint, qrsConfig, { method, expectedStatusCodes });

    if (!result || typeof result !== 'object') {
        if (result !== undefined) parts.push(`result: ${String(result)}`);
        return parts.join(', ');
    }

    if (result.statusCode != null) parts.push(`status: ${result.statusCode}`);
    appendResponseBodySummary(parts, result.body);

    return parts.join(', ');
}

/**
 * Format a generic HTTP response object with request context for error logging.
 * @param {Object} result - HTTP response object.
 * @param {string} endpoint - The HTTP endpoint that was called.
 * @param {Object} requestContext - Request context containing host, port, and optional base URL.
 * @param {Object} [options={}] - Optional request metadata.
 * @param {string} [options.method='GET'] - HTTP method used for the request.
 * @param {number[]} [options.expectedStatusCodes=[200]] - Expected HTTP status codes.
 *
 * @returns {string} Formatted response summary with contextual metadata.
 */
export function formatHttpResultWithContext(result, endpoint, requestContext, options = {}) {
    const { method = 'GET', expectedStatusCodes = [200] } = options;
    const parts = [];

    appendRequestContext(parts, endpoint, requestContext, { method, expectedStatusCodes });

    if (requestContext?.baseURL) parts.push(`baseURL: ${requestContext.baseURL}`);
    if (requestContext?.timeout) parts.push(`timeout: ${requestContext.timeout}ms`);

    if (!result || typeof result !== 'object') {
        if (result !== undefined) parts.push(`result: ${String(result)}`);
        return parts.join(', ');
    }

    if (result.status != null) parts.push(`status: ${result.status}`);
    if (result.statusText) parts.push(`statusText: ${result.statusText}`);
    appendResponseBodySummary(parts, result.data);

    return parts.join(', ');
}

/**
 * Format a thrown QRS error with full request context for debugging.
 * @param {Error|Object} err - The error object.
 * @param {string} endpoint - The QRS endpoint that was called.
 * @param {Object} qrsConfig - QRS configuration containing host and port.
 *
 * @returns {string} Formatted error message with context.
 */
export function formatQrsErrorWithContext(err, endpoint, qrsConfig) {
    const parts = [];

    appendRequestContext(parts, endpoint, qrsConfig);

    if (!err || typeof err !== 'object') {
        if (err !== undefined) parts.push(`message: ${String(err)}`);
        return parts.join(', ');
    }

    if (err.code) parts.push(`code: ${err.code}`);
    if (err.message) parts.push(`message: ${err.message}`);

    if (err.config) {
        if (err.config.method) parts.push(`method: ${err.config.method.toUpperCase()}`);
        if (err.config.timeout) parts.push(`timeout: ${err.config.timeout}ms`);
        if (err.config.baseURL) parts.push(`baseURL: ${err.config.baseURL}`);
        if (err.config.url && err.config.url !== endpoint) parts.push(`url: ${err.config.url}`);
    }

    if (err.response) {
        if (err.response.status != null) parts.push(`status: ${err.response.status}`);
        if (err.response.statusText) parts.push(`statusText: ${err.response.statusText}`);
    }

    if (err.errno) parts.push(`errno: ${err.errno}`);
    if (err.syscall) parts.push(`syscall: ${err.syscall}`);
    if (err.hostname) parts.push(`hostname: ${err.hostname}`);
    if (err.address) parts.push(`address: ${err.address}`);

    Object.keys(err).forEach((key) => {
        const lowerKey = key.toLowerCase();
        const isSensitive = [...SENSITIVE_KEYS].some((sensitiveKey) => lowerKey.includes(sensitiveKey));

        if (!KNOWN_ERROR_KEYS.has(key) && !isSensitive && err[key] !== undefined && err[key] !== null) {
            let value = err[key];
            if (typeof value === 'object') {
                try {
                    value = JSON.stringify(value);
                } catch {
                    value = '[unserializable]';
                }
            }

            parts.push(`${key}: ${value}`);
        }
    });

    if (!globals.isSea && err.stack) parts.push(`stack: ${err.stack}`);
    return parts.join(', ');
}

/**
 * Format a thrown HTTP error with full request context for debugging.
 * @param {Error|Object} err - The error object.
 * @param {string} endpoint - The HTTP endpoint that was called.
 * @param {Object} requestContext - Request context containing host, port, and optional base URL.
 * @param {Object} [options={}] - Optional request metadata.
 * @param {string} [options.method] - HTTP method used for the request.
 *
 * @returns {string} Formatted error message with context.
 */
export function formatHttpErrorWithContext(err, endpoint, requestContext, options = {}) {
    const { method } = options;
    const parts = [];

    appendRequestContext(parts, endpoint, requestContext, { method });

    if (requestContext?.baseURL) parts.push(`baseURL: ${requestContext.baseURL}`);
    if (requestContext?.timeout) parts.push(`timeout: ${requestContext.timeout}ms`);

    if (!err || typeof err !== 'object') {
        if (err !== undefined) parts.push(`message: ${String(err)}`);
        return parts.join(', ');
    }

    if (err.code) parts.push(`code: ${err.code}`);
    if (err.message) parts.push(`message: ${err.message}`);

    if (err.config) {
        if (err.config.method) parts.push(`requestMethod: ${err.config.method.toUpperCase()}`);
        if (err.config.timeout) parts.push(`requestTimeout: ${err.config.timeout}ms`);
        if (err.config.baseURL) parts.push(`requestBaseURL: ${err.config.baseURL}`);
        if (err.config.url && err.config.url !== endpoint) parts.push(`url: ${err.config.url}`);
    }

    if (err.response) {
        if (err.response.status != null) parts.push(`status: ${err.response.status}`);
        if (err.response.statusText) parts.push(`statusText: ${err.response.statusText}`);
        appendResponseBodySummary(parts, err.response.data);
    }

    if (err.errno) parts.push(`errno: ${err.errno}`);
    if (err.syscall) parts.push(`syscall: ${err.syscall}`);
    if (err.hostname) parts.push(`hostname: ${err.hostname}`);
    if (err.address) parts.push(`address: ${err.address}`);

    Object.keys(err).forEach((key) => {
        const lowerKey = key.toLowerCase();
        const isSensitive = [...SENSITIVE_KEYS].some((sensitiveKey) => lowerKey.includes(sensitiveKey));

        if (!KNOWN_ERROR_KEYS.has(key) && !isSensitive && err[key] !== undefined && err[key] !== null) {
            let value = err[key];
            if (typeof value === 'object') {
                try {
                    value = JSON.stringify(value);
                } catch {
                    value = '[unserializable]';
                }
            }

            parts.push(`${key}: ${value}`);
        }
    });

    if (!globals.isSea && err.stack) parts.push(`stack: ${err.stack}`);
    return parts.join(', ');
}
