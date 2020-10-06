// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

var serializeApp = require('serializeapp');

const enigma = require('enigma.js');
const WebSocket = require('ws');
const errors = require('restify-errors');

// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + globals.configEngine.engineVersion);

/**
 * @swagger
 *
 * /v4/senseappdump/{appId}:
 *   get:
 *     description: |
 *       Dump a specific Sense app to JSON
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: appId
 *         description: ID of Qlik Sense app
 *         in: path
 *         required: true
 *         type: string
 *         example: "210832b5-6174-4572-bd19-3e61eda675ef"
 *     responses:
 *       200:
 *         description: App dump successful. App metadata returned as JSON.
 *       408:
 *         description: App not found in Qlik Sense.
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondGET_senseAppDump = function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.params.appId == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            globals.logger.info(`APPDUMP: Dumping app: ${req.params.appId}`);

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

                    global
                        .openDoc(req.params.appId, '', '', '', true)
                        .then(function (app) {
                            return serializeApp(app);
                        })
                        .then(function (data) {
                            var d = data;

                            res.send(200, d);

                            // Close connection to Sense server
                            try {
                                session.close();
                            } catch (err) {
                                globals.logger.error(`APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                                res.send(new errors.InternalError({}, 'Failed closing connection to Sense server'));
                            }

                        })
                        .catch(function (error) {
                            globals.logger.error(`APPDUMP: Error while opening doc during app dump: ${JSON.stringify(error, null, 2)}`);

                            try {
                                session.close();
                            } catch (err) {
                                globals.logger.error(`APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                                res.send(new errors.InternalError({}, 'Failed closing connection to Sense server'));
                            }

                            return next(new errors.RequestTimeoutError('Failed to open document in Sense engine.'));
                        });

                    return next();
                })
                .catch(function (error) {
                    globals.logger.error(`APPDUMP: Error while opening session to Sense engine during app dump: ${JSON.stringify(error, null, 2)}`);

                    try {
                        session.close();
                    } catch (err) {
                        globals.logger.error(`APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                    }

                    return next(new errors.RequestTimeoutError('Failed to open session to Sense engine.'));
                });
        }
    } catch (err) {
        globals.logger.error(`APPDUMP: Failed dumping app: ${req.params.appId}`);
        res.send(new errors.InternalError({}, 'Failed dumping app'));
        next();
    }
};
