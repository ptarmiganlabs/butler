/* eslint-disable camelcase */
import httpErrors from 'http-errors';

import anyBase from 'any-base';

// Load global variables and functions
import globals from '../../globals.js';
import { logRESTCall } from '../../lib/log_rest_call.js';
import { apiGetBase16ToBase62, apiGetBase62ToBase16 } from '../../api/base_conversion.js';

const base62_to_Hex = anyBase('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789abcdef');
const hex_to_base62 = anyBase('0123456789abcdef', '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

/**
 * Handles the GET request to convert base62 to base16.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 * @returns {Object} - The response object with the converted base16 value.
 */
async function handlerGetBase62ToBase16(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures base62 parameter is present and non-empty
        const base16 = base62_to_Hex(request.query.base62);
        return { base62: request.query.base62, base16 };
    } catch (err) {
        globals.logger.error(
            `BASECONVERT: Failed converting from base62 to base16: ${request.query.base62}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed converting from base62 to base16'));
        return null;
    }
}

/**
 * Handles the GET request to convert base16 to base62.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 * @returns {Object} - The response object with the converted base62 value.
 */
async function handlerGetBase16ToBase62(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures base16 parameter is present and non-empty
        const base62 = hex_to_base62(request.query.base16);
        return { base16: request.query.base16, base62 };
    } catch (err) {
        globals.logger.error(
            `BASECONVERT: Failed converting from base16 to base62: ${request.query.base16}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed converting from base16 to base62'));
        return null;
    }
}

/**
 * Registers the REST endpoints for base conversion operations.
 * @param {Object} fastify - The Fastify instance.
 * @param {Object} options - The options object.
 */
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.base62ToBase16') &&
        globals.config.get('Butler.restServerEndpointsEnable.base62ToBase16')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/base62tobase16');

        fastify.get('/v4/base62tobase16', apiGetBase62ToBase16, handlerGetBase62ToBase16);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.base16ToBase62') &&
        globals.config.get('Butler.restServerEndpointsEnable.base16ToBase62')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/base16tobase62');

        fastify.get('/v4/base16tobase62', apiGetBase16ToBase62, handlerGetBase16ToBase62);
    }
};
