/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

const enigma = require('enigma.js');
const WebSocket = require('ws');
const errors = require('restify-errors');

// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + globals.configEngine.engineVersion);

/**
 * @swagger
 *
 * /v4/senselistapps:
 *   get:
 *     description: |
 *       Get list of all apps in Sense environment
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: App list successfully retrieved.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: App ID.
 *               name: 
 *                 type: string
 *                 description: App name.
 *       500:
 *         description: Internal error.
 *
 */
/**
 * @swagger
 *
 * /v4/apps/list:
 *   get:
 *     description: |
 *       Get list of all apps in Sense environment
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: App list successfully retrieved.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: App ID.
 *               name: 
 *                 type: string
 *                 description: App name.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondGET_senseListApps = function (req, res, next) {
    logRESTCall(req);

    try {
        // create a new session
        const configEnigma = {
            schema: qixSchema,
            url: `wss://${globals.configEngine.host}:${globals.configEngine.port}`,
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

        var session = enigma.create(configEnigma);
        session
            .open()
            .then(global => {
                // We can now interact with the global object, for example get the document list.
                // Please refer to the Engine API documentation for available methods.
                // Note: getting a list of all apps could also be done using QRS
                global
                    .getDocList()
                    .then(function (docList) {
                        var jsonArray = [];
                        docList.forEach(function (doc) {
                            jsonArray = jsonArray.concat([
                                {
                                    id: doc.qDocId.toString(),
                                    name: doc.qDocName.toString(),
                                },
                            ]);
                        });

                        res.send(200, jsonArray);

                        // Close connection to Sense server
                        try {
                            session.close();
                        } catch (err) {
                            globals.logger.error(`LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                            res.send(new errors.InternalError({}, 'Failed closing connection to Sense server'));
                        }
                    })
                    .catch(function (error) {
                        globals.logger.error(`LISTAPPS: Error while getting app list: ${JSON.stringify(error, null, 2)}`);

                        try {
                            session.close();
                        } catch (err) {
                            globals.logger.error(`LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                            res.send(new errors.InternalError({}, 'Failed closing connection to Sense server'));
                        }
                    });

                next();
            })
            .catch(function (error) {
                globals.logger.error(`LISTAPPS: Error while opening session to Sense engine during app listing: ${JSON.stringify(error, null, 2)}`);

                try {
                    session.close();
                } catch (err) {
                    globals.logger.error(`LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                }

                return next(new errors.RequestTimeoutError('Failed to open session to Sense engine'));
            });
    } catch (err) {
        globals.logger.error(`LISTAPPS: getting list of Sense apps: ${req.body.taskId}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed getting list of Sense apps'));
        next();
    }
};
