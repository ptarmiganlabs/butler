// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('./logRESTCall');

const enigma = require('enigma.js');
const WebSocket = require('ws');
const errors = require('restify-errors');

// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + globals.configEngine.engineVersion);



// Function for handling /senseListApps REST endpoint
module.exports.respondSenseListApps = function (req, res, next) {
    logRESTCall(req);

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
                        jsonArray = jsonArray.concat([{
                            id: doc.qDocId.toString(),
                            name: doc.qDocName.toString(),
                        }, ]);
                    });

                    res.send(jsonArray);

                    // Close connection to Sense server
                    try {
                        session.close();
                    } catch (err) {
                        globals.logger.error(
                            `Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`,
                        );
                        next();
                    }
                })
                .catch(function (error) {
                    globals.logger.error(`Èrror while getting app list: ${JSON.stringify(error, null, 2)}`);

                    try {
                        session.close();
                    } catch (err) {
                        globals.logger.error(
                            `Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`,
                        );
                    }
                });

            next();
        })
        .catch(function (error) {
            globals.logger.error(
                `Error while opening session to Sense engine during app listing: ${JSON.stringify(
          error,
          null,
          2,
        )}`,
            );

            try {
                session.close();
            } catch (err) {
                globals.logger.error(
                    `Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`,
                );
            }

            // res.send(error);
            return next(new errors.RequestTimeoutError('Failed to open session to Sense engine.'));
        });
};
