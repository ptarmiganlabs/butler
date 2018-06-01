var globals = require('../globals');
var serializeApp = require('serializeapp');

const enigma = require('enigma.js');
const WebSocket = require('ws');


// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/' + globals.configEngine.engineVersion);

// Function for handling /senseAppDump REST endpoint
module.exports.respondSenseAppDump = function (req, res, next) {
    globals.logger.log('info', 'Dumping app: ' + req.query.appId);
    // console.info('Dumping app: ' + req.query.appId);

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
                    } catch (ex) {
                        globals.logger.log('error', ex);
                        // console.error(ex);
                    }

                    res.send(d);
                })
                .catch(function (error) {
                    globals.logger.log('error', error);
                    // console.error(error);

                    try {
                        session.close();
                    } catch (ex) {
                        globals.logger.log('error', ex);
                        // console.error(ex);
                    }

                    res.send(error);
                    return next(error);
                });

            return next();

        });

};
