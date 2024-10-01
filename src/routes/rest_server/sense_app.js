import httpErrors from 'http-errors';
import enigma from 'enigma.js';
import SenseUtilities from 'enigma.js/sense-utilities.js';
import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import upath from 'upath';

// Load global variables and functions
import globals from '../../globals.js';

import senseStartTask from '../../qrs_util/sense_start_task.js';
import { logRESTCall } from '../../lib/log_rest_call.js';
import apiPutAppReload from '../../api/sense_app.js';

async function handlerPutAppReload(request, reply) {
    try {
        // Set up enigma.js configuration
        const schemaFile = `./node_modules/enigma.js/schemas/${globals.configEngine.engineVersion}.json`;
        let a;
        let b;
        let c;
        // Are we running as a packaged app?
        if (process.pkg) {
            // Yes, we are running as a packaged app
            // Get path to JS file const
            a = process.pkg.defaultEntrypoint;

            // Strip off the filename
            b = upath.dirname(a);

            // Add path to package.json file
            c = upath.join(b, schemaFile);
        } else {
            // No, we are running as native Node.js
            // Get path to JS file
            a = fileURLToPath(import.meta.url);

            // Strip off the filename
            b = upath.dirname(a);

            // Add path to package.json file
            c = upath.join(b, '..', '..', '..', schemaFile);
        }

        globals.logger.verbose(`APPDUMP: Using engine schema in file: ${c}`);
        const qixSchema = JSON.parse(readFileSync(c));

        logRESTCall(request);

        // TODO: Add app exists test. Return error if not existing.
        if (request.params.appId === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter (app ID) missing'));
        } else {
            // Use data in request to start Qlik Sense app reload
            globals.logger.verbose(`APPRELOAD: Reloading app: ${request.params.appId}`);

            // Get http headers from Butler config file
            const httpHeaders = globals.getEngineHttpHeaders();

            // Create a new session
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
                        headers: httpHeaders,
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
                `APPRELOAD: Starting reload of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
            );

            const app = await global.openDoc(request.params.appId, '', '', '', false);
            reply.code(201).send({ appId: request.params.appId }); // Return ok result, i.e. async behavior = don't wait for reload to complete.

            if ((await app.doReload(reloadMode, partialReload)) === true) {
                // Reload was successful
                await app.doSave();

                globals.logger.verbose(
                    `APPRELOAD: Reload success of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                );
                // Start downstream tasks, if such were specified in the request body

                // eslint-disable-next-line no-restricted-syntax
                for (const taskId of startQSEoWTaskOnSuccess) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading success of ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                    );

                    senseStartTask(taskId);
                }
            } else {
                globals.logger.warn(
                    `APPRELOAD: Reload failure of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                );

                // Start downstream tasks, if such were specified in the request body
                // eslint-disable-next-line no-restricted-syntax
                for (const taskId of startQSEoWTaskOnFailure) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading failure of ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                    );

                    senseStartTask(taskId);
                }
            }

            try {
                if ((await session.close()) === true) {
                    globals.logger.debug(
                        `APPRELOAD: Closed session after reloading app ${request.params.appId} on host ${globals.configEngine.host}`,
                    );
                } else {
                    globals.logger.error(
                        `APPRELOAD: Error closing session after reloading app ${request.params.appId} on host ${globals.configEngine.host}`,
                    );
                }
            } catch (err) {
                globals.logger.error(`APPRELOAD: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                reply.send(httpErrors(500, 'Error closing connection to Sense server'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `APPRELOAD: Failed reloading app ${request.params.appId} on host ${globals.configEngine.host}, error is: ${JSON.stringify(
                err,
                null,
                2,
            )}, stack: ${err.stack}.`,
        );
        reply.send(httpErrors(500, 'Failed getting list of Sense apps'));
    }
}

// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseAppReload') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseAppReload')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/app/:appId/reload');
        fastify.put('/v4/app/:appId/reload', apiPutAppReload, handlerPutAppReload);
    }
};
