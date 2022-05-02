const httpErrors = require('http-errors');
const enigma = require('enigma.js');
const SenseUtilities = require('enigma.js/sense-utilities');
const WebSocket = require('ws');

// Load global variables and functions
const globals = require('../globals');
const qrsUtil = require('../qrs_util');
const { logRESTCall } = require('../lib/log_rest_call');
const { apiPutAppReload } = require('../api/sense_app');

// Set up enigma.js configuration
// eslint-disable-next-line import/no-dynamic-require
const qixSchema = require(`enigma.js/schemas/${globals.configEngine.engineVersion}`);

async function handlerPutAppReload(request, reply) {
    try {
        logRESTCall(request);

        // TODO: Add app exists test. Return error if not existing.
        if (request.params.appId === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter (app ID) missing'));
        } else {
            // Use data in request to start Qlik Sense app reload
            globals.logger.verbose(`APPRELOAD: Reloading app: ${request.params.appId}`);

            // create a new session
            const configEnigma = {
                schema: qixSchema,
                url: SenseUtilities.buildUrl({
                    host: globals.configEngine.host,
                    port: globals.configEngine.port,
                    prefix: '',
                    secure: true,
                    appId: request.params.appId,
                }),
                createSocket: (url) =>
                    new WebSocket(url, {
                        key: globals.configEngine.key,
                        cert: globals.configEngine.cert,
                        headers: {
                            'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
                        },
                        rejectUnauthorized: globals.config.get('Butler.configEngine.rejectUnauthorized'),
                    }),
            };

            // Get parameters (if there are any) from request body
            let reloadMode = null;
            let partialReload = null;
            let startQSEoWTaskOnSuccess = [];
            let startQSEoWTaskOnFailure = [];

            if (request.body.reloadMode !== undefined && request.body.reloadMode >= 0 && request.body.reloadMode <= 2) {
                reloadMode = request.body.reloadMode;
            } else {
                reloadMode = 0;
            }

            if (request.body.partialReload === 'true' || request.body.partialReload === true) {
                partialReload = true;
            } else {
                partialReload = false;
            }

            if (request.body.startQSEoWTaskOnSuccess !== undefined && request.body.startQSEoWTaskOnSuccess.length > 0) {
                // There are task IDs in request body
                startQSEoWTaskOnSuccess = request.body.startQSEoWTaskOnSuccess;
            }

            if (request.body.startQSEoWTaskOnFailure !== undefined && request.body.startQSEoWTaskOnFailure.length > 0) {
                // There are task IDs in request body
                startQSEoWTaskOnFailure = request.body.startQSEoWTaskOnFailure;
            }

            const session = enigma.create(configEnigma);
            const global = await session.open();

            const engineVersion = await global.engineVersion();
            globals.logger.verbose(
                `APPRELOAD: Starting reload of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`
            );

            const app = await global.openDoc(request.params.appId, '', '', '', false);
            reply.code(201).send({ appId: request.params.appId }); // Return ok result, i.e. async behavior = don't wait for reload to complete.

            if ((await app.doReload(reloadMode, partialReload)) === true) {
                // Reload was successful
                await app.doSave();

                globals.logger.verbose(
                    `APPRELOAD: Reload success of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`
                );
                // Start downstream tasks, if such were specified in the request body

                // eslint-disable-next-line no-restricted-syntax
                for (const taskId of startQSEoWTaskOnSuccess) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading success of ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`
                    );

                    qrsUtil.senseStartTask.senseStartTask(taskId);
                }
            } else {
                globals.logger.warn(
                    `APPRELOAD: Reload failure of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`
                );

                // Start downstream tasks, if such were specified in the request body
                // eslint-disable-next-line no-restricted-syntax
                for (const taskId of startQSEoWTaskOnFailure) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading failure of ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`
                    );

                    qrsUtil.senseStartTask.senseStartTask(taskId);
                }
            }

            try {
                if ((await session.close()) === true) {
                    globals.logger.debug(
                        `APPRELOAD: Closed session after reloading app ${request.params.appId} on host ${globals.configEngine.host}`
                    );
                } else {
                    globals.logger.error(
                        `APPRELOAD: Error closing session after reloading app ${request.params.appId} on host ${globals.configEngine.host}`
                    );
                }
            } catch (err) {
                globals.logger.error(
                    `APPRELOAD: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`
                );
                reply.send(httpErrors(500, 'Error closing connection to Sense server'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `APPRELOAD: Failed reloading app ${request.params.appId} on host ${
                globals.configEngine.host
            }, error is: ${JSON.stringify(err, null, 2)}, stack: ${err.stack}.`
        );
        reply.send(httpErrors(500, 'Failed getting list of Sense apps'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseAppReload') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseAppReload')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/app/:appId/reload');
        fastify.put('/v4/app/:appId/reload', apiPutAppReload, handlerPutAppReload);
    }
};
