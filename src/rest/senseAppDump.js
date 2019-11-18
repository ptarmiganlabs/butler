// Load global variables and functions
var globals = require('../globals');

var serializeApp = require('serializeapp');

const enigma = require('enigma.js');
const WebSocket = require('ws');
const errors = require('restify-errors');

// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + globals.configEngine.engineVersion);

// Function for handling /senseAppDump REST endpoint
module.exports.respondSenseAppDump = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    globals.logger.info(`Dumping app: ${req.query.appId}`);

    // create a new session
    const configEnigma = {
        schema: qixSchema,
        url: `wss://${globals.configEngine.host}:${globals.configEngine.port}`,
        createSocket: url => new WebSocket(url, {
            key: globals.configEngine.key,
            cert: globals.configEngine.cert,
            headers: {
                'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
            },
            rejectUnauthorized: false
        }),
    };

    var session = enigma.create(configEnigma);
    session.open()
        .then((global) => {

            // We can now interact with the global object, for example get the document list.
            // Please refer to the Engine API documentation for available methods.

            global.openDoc(req.query.appId, '', '', '', true)
                .then(function (app) {
                    return serializeApp(app);
                })
                .then(function (data) {
                    var d = data;

                    // Close connection to Sense server
                    try {
                        session.close();
                    } catch (err) {
                        globals.logger.error(`Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                    }

                    res.send(d);
                })
                .catch(function (error) {
                    globals.logger.error(`Error while opening doc during app dump: ${JSON.stringify(error, null, 2)}`);

                    try {
                        session.close();
                    } catch (err) {
                        globals.logger.error(`Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                    }

                    // res.send(error);
                    return next(new errors.RequestTimeoutError('Failed to open document in Sense engine.'));
                });

            return next();

        })
        .catch(function (error) {
            globals.logger.error(`Error while opening session to Sense engine during app dump: ${JSON.stringify(error, null, 2)}`);

            try {
                session.close();
            } catch (err) {
                globals.logger.error(`Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
            }

            // res.send(error);
            return next(new errors.RequestTimeoutError('Failed to open session to Sense engine.'));
        });

};
