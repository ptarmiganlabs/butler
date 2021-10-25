/* eslint-disable camelcase */
const httpErrors = require('http-errors');
const anyBase = require('any-base');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { apiGetBase16ToBase62, apiGetBase62ToBase16 } = require('../api/baseConversion');

const base62_to_Hex = anyBase('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789abcdef');
const hex_to_base62 = anyBase('0123456789abcdef', '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

async function handlerGetBase62ToBase16(request, reply) {
    try {
        logRESTCall(request);

        if (request.query.base62 === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            const base16 = base62_to_Hex(request.query.base62);
            return { base62: request.query.base62, base16 };
        }

        return {
            response: 'Butler reporting for duty',
            butlerVersion: globals.appVersion,
        };
    } catch (err) {
        globals.logger.error(
            `BASECONVERT: Failed converting from base62 to base16: ${request.query.base62}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed converting from base62 to base16'));
        return null;
    }
}

async function handlerGetBase16ToBase62(request, reply) {
    try {
        logRESTCall(request);

        if (request.query.base16 === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            const base62 = hex_to_base62(request.query.base16);
            return { base16: request.query.base16, base62 };
        }
        return null;
    } catch (err) {
        globals.logger.error(
            `BASECONVERT: Failed converting from base16 to base62: ${request.query.base16}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed converting from base16 to base62'));
        return null;
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
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
