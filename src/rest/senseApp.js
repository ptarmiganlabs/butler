/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
const enigma = require('enigma.js');
const SenseUtilities = require('enigma.js/sense-utilities');
const WebSocket = require('ws');

var qrsUtil = require('../qrs_util');

var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

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
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_senseAppReload = async function (req, res, next) {
    logRESTCall(req);
    // TODO: Add app exists test. Return error if not existing.

    try {
        if (req.params.appId == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter (app ID) missing'));
        } else {
            // Use data in request to start Qlik Sense app reload
            globals.logger.verbose(`APPRELOAD: Reloading app: ${req.params.appId}`);

            // create a new session
            const configEnigma = {
                schema: qixSchema,
                url: SenseUtilities.buildUrl({
                    host: globals.configEngine.host,
                    port: globals.configEngine.port,
                    prefix: '',
                    secure: true,
                    appId: req.params.appId,
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

            if (req.body.reloadMode != undefined && req.body.reloadMode >= 0 && req.body.reloadMode <= 2) {
                reloadMode = req.body.reloadMode;
            } else {
                reloadMode = 0;
            }

            if (req.body.partialReload == 'true' || req.body.partialReload == true) {
                partialReload = true;
            } else {
                partialReload = false;
            }

            if (req.body.startQSEoWTaskOnSuccess != undefined && req.body.startQSEoWTaskOnSuccess.length > 0) {
                // There are task IDs in request body
                startQSEoWTaskOnSuccess = req.body.startQSEoWTaskOnSuccess;
            }

            if (req.body.startQSEoWTaskOnFailure != undefined && req.body.startQSEoWTaskOnFailure.length > 0) {
                // There are task IDs in request body
                startQSEoWTaskOnFailure = req.body.startQSEoWTaskOnFailure;
            }


            var session = enigma.create(configEnigma);
            var global = await session.open();

            var engineVersion = await global.engineVersion();
            globals.logger.verbose(
                `APPRELOAD: Starting reload of app ${req.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
            );

            var app = await global.openDoc(req.params.appId, '', '', '', false);
            res.send(201, { appId: req.params.appId }); // Return ok result, i.e. async behavior = don't wait for reload to complete.
            next();

            if ((await app.doReload(reloadMode, partialReload)) == true) {
                // Reload was successful
                await app.doSave();

                globals.logger.verbose(
                    `APPRELOAD: Reload success of app ${req.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                );
                // Start downstream tasks, if such were specified in the request body
    
                for (const taskId of startQSEoWTaskOnSuccess) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading success of ${req.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                    );

                    qrsUtil.senseStartTask.senseStartTask(taskId);
                }
            } else {
                globals.logger.warn(
                    `APPRELOAD: Reload failure of app ${req.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                );

                // Start downstream tasks, if such were specified in the request body
                for (const taskId of startQSEoWTaskOnFailure) {
                    globals.logger.verbose(
                        `APPRELOAD: Starting task ${taskId} after reloading failure of ${req.params.appId} on host ${globals.configEngine.host}, engine version is ${engineVersion.qComponentVersion}.`,
                    );
    
                    qrsUtil.senseStartTask.senseStartTask(taskId);
                }
            }

            try {
                if ((await session.close()) == true) {
                    globals.logger.debug(`APPRELOAD: Closed session after reloading app ${req.params.appId} on host ${globals.configEngine.host}`);
                } else {
                    globals.logger.error(`APPRELOAD: Error closing session after reloading app ${req.params.appId} on host ${globals.configEngine.host}`);
                }
            } catch (err) {
                globals.logger.error(`APPRELOAD: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
            }
        }
    } catch (err) {
        globals.logger.error(
            `APPRELOAD: Failed reloading app ${req.params.appId} on host ${globals.configEngine.host}, error is: ${JSON.stringify(err, null, 2)}, stack: ${err.stack}.`,
        );
    }
};
