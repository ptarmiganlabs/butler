'use strict';

const httpErrors = require('http-errors');
const enigma = require('enigma.js');
const SenseUtilities = require('enigma.js/sense-utilities');
const WebSocket = require('ws');

// Load global variables and functions
var globals = require('../globals');
var qrsUtil = require('../qrs_util');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;


// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + globals.configEngine.engineVersion);

/**
 * @swagger
 *
 * /v4/app/{appId}/reload:
 *   put:
 *     description: |
 *       Do a stand-alone reload of a Qlik Sense app, without using a task.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: appId
 *         description: ID of Qlik Sense app
 *         in: path
 *         required: true
 *         type: string
 *         example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *       - name: body
 *         description: |
 *           Parameters used when reloading app.
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             reloadMode:
 *               type: integer
 *               description: Reload mode that will be used. 0, 1 or 2. If not specified 0 will be used
 *             partialReload:
 *               type: boolean
 *               description: Should a full (=false) or partial (=true) reload be done? If not specified a full reload will be done.
 *               example: "true"
 *             startQSEoWTaskOnSuccess:
 *               type: array
 *               description: Array of task IDs that should be started when the app has successfully reloaded.
 *               items:
 *                 type: string
 *               minItems: 0
 *               example: ["09b3c78f-04dd-45e3-a4bf-1b074d6572fa", "eaf1da4f-fd44-4cea-b2de-7b67a6496ee3"]
 *             startQSEoWTaskOnFailure:
 *               type: array
 *               description: Array of task IDs that should be started if the app fails reloading.
 *               items:
 *                 type: string
 *               minItems: 0
 *               example: ["09b3c78f-04dd-45e3-a4bf-1b074d6572fa", "eaf1da4f-fd44-4cea-b2de-7b67a6496ee3"]
 *     responses:
 *       201:
 *         description: App successfully reloaded.
 *         schema:
 *           type: object
 *           properties:
 *             appId:
 *               type: string
 *               description: ID of reloaded app.
 *       400:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports = async function (fastify, options) {
    if (globals.config.has('Butler.restServerEndpointsEnable.senseAppReload') && globals.config.get('Butler.restServerEndpointsEnable.senseAppReload')) {
        globals.logger.debug('Registering REST endpoint GET /v4/app/:appId/reload');

        fastify.put('/v4/app/:appId/reload', handler);
    }
}


/**
 * 
 * @param {*} request 
 * @param {*} reply 
 */
async function handler(request, reply) {
    try {
        logRESTCall(request);

        // TODO: Add app exists test. Return error if not existing.
        if (request.params.appId == undefined) {
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
                createSocket: url =>
                    new WebSocket(url, {
                        key: globals.configEngine.key,
                        cert: globals.configEngine.cert,
                        headers: {
                            'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
                        },
                        rejectUnauthorized: false,
                    }),
            };

            // Get parameters (if there are any) from request body
            var reloadMode = null,
                partialReload = null,
                startQSEoWTaskOnSuccess = [],
                startQSEoWTaskOnFailure = [];

            if (request.body.reloadMode != undefined && request.body.reloadMode >= 0 && request.body.reloadMode <= 2) {
                reloadMode = request.body.reloadMode;
            } else {
                reloadMode = 0;
            }

            if (request.body.partialReload == 'true' || request.body.partialReload == true) {
                partialReload = true;
            } else {
                partialReload = false;
            }

            if (request.body.startQSEoWTaskOnSuccess != undefined && request.body.startQSEoWTaskOnSuccess.length > 0) {
                // There are task IDs in request body
                startQSEoWTaskOnSuccess = request.body.startQSEoWTaskOnSuccess;
            }

            if (request.body.startQSEoWTaskOnFailure != undefined && request.body.startQSEoWTaskOnFailure.length > 0) {
                // There are task IDs in request body
                startQSEoWTaskOnFailure = request.body.startQSEoWTaskOnFailure;
            }

            var session = enigma.create(configEnigma);
            var global = await session.open();

            var engineVersion = await global.engineVersion();
            globals.logger.verbose(
                `APPRELOAD: Starting reload of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
            );

            var app = await global.openDoc(request.params.appId, '', '', '', false);
            reply.send(201, { appId: request.params.appId }); // Return ok result, i.e. async behavior = don't wait for reload to complete.

            if ((await app.doReload(reloadMode, partialReload)) == true) {
                // Reload was successful
                await app.doSave();

                globals.logger.verbose(
                    `APPRELOAD: Reload success of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                );
                // Start downstream tasks, if such were specified in the request body

                for (const taskId of startQSEoWTaskOnSuccess) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading success of ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                    );

                    qrsUtil.senseStartTask.senseStartTask(taskId);
                }
            } else {
                globals.logger.warn(
                    `APPRELOAD: Reload failure of app ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                );

                // Start downstream tasks, if such were specified in the request body
                for (const taskId of startQSEoWTaskOnFailure) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading failure of ${request.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                    );

                    qrsUtil.senseStartTask.senseStartTask(taskId);
                }
            }

            try {
                if ((await session.close()) == true) {
                    globals.logger.debug(`APPRELOAD: Closed session after reloading app ${request.params.appId} on host ${globals.configEngine.host}`);
                } else {
                    globals.logger.error(`APPRELOAD: Error closing session after reloading app ${request.params.appId} on host ${globals.configEngine.host}`);
                }
            } catch (err) {
                globals.logger.error(`APPRELOAD: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                reply.send(httpErrors(500, 'Error closing connection to Sense server'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `APPRELOAD: Failed reloading app ${request.params.appId} on host ${globals.configEngine.host}, error is: ${JSON.stringify(err, null, 2)}, stack: ${err.stack}.`,
        );
        reply.send(httpErrors(500, 'Failed getting list of Sense apps'));
    }
}
