const httpErrors = require('http-errors');
const enigma = require('enigma.js');
const WebSocket = require('ws');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { apiGetSenseListApps, apiGetAppsList } = require('../api/senseListApps');

// Set up enigma.js configuration
// eslint-disable-next-line import/no-dynamic-require
const qixSchema = require(`enigma.js/schemas/${globals.configEngine.engineVersion}`);

function handlerGetSenseListApps(request, reply) {
    try {
        logRESTCall(request);

        // create a new session
        const configEnigma = {
            schema: qixSchema,
            url: `wss://${globals.configEngine.host}:${globals.configEngine.port}`,
            createSocket: (url) =>
                new WebSocket(url, {
                    key: globals.configEngine.key,
                    cert: globals.configEngine.cert,
                    headers: {
                        'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
                    },
                    rejectUnauthorized: globals.config.get(
                        'Butler.configEngine.rejectUnauthorized'
                    ),
                }),
        };

        const session = enigma.create(configEnigma);
        session
            .open()
            .then((global) => {
                // We can now interact with the global object, for example get the document list.
                // Please refer to the Engine API documentation for available methods.
                // Note: getting a list of all apps could also be done using QRS
                global
                    .getDocList()
                    .then((docList) => {
                        let jsonArray = [];
                        docList.forEach((doc) => {
                            jsonArray = jsonArray.concat([
                                {
                                    id: doc.qDocId.toString(),
                                    name: doc.qDocName.toString(),
                                },
                            ]);
                        });

                        reply.code(200).send(jsonArray);

                        // Close connection to Sense server
                        try {
                            session.close();
                        } catch (err) {
                            globals.logger.error(
                                `LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(
                                    err,
                                    null,
                                    2
                                )}`
                            );
                            reply.send(
                                httpErrors(500, 'Failed closing connection to Sense server')
                            );
                        }
                    })
                    .catch((error) => {
                        globals.logger.error(
                            `LISTAPPS: Error while getting app list: ${JSON.stringify(
                                error,
                                null,
                                2
                            )}`
                        );

                        try {
                            session.close();
                        } catch (err) {
                            globals.logger.error(
                                `LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(
                                    err,
                                    null,
                                    2
                                )}`
                            );
                            reply.send(
                                httpErrors(500, 'Failed closing connection to Sense server')
                            );
                        }
                    });
            })
            .catch((error) => {
                globals.logger.error(
                    `LISTAPPS: Error while opening session to Sense engine during app listing: ${JSON.stringify(
                        error,
                        null,
                        2
                    )}`
                );

                try {
                    session.close();
                } catch (err) {
                    globals.logger.error(
                        `LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(
                            err,
                            null,
                            2
                        )}`
                    );
                }

                reply.send(httpErrors(422, 'Failed to open session to Sense engine'));
            });
    } catch (err) {
        globals.logger.error(
            `LISTAPPS: getting list of Sense apps: ${
                request.body.taskId
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed getting list of Sense apps'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseListApps') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseListApps')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/senselistapps');
        globals.logger.debug('Registering REST endpoint GET /v4/apps/list');

        fastify.get('/v4/senselistapps', apiGetSenseListApps, handlerGetSenseListApps);
        fastify.get('/v4/apps/list', apiGetAppsList, handlerGetSenseListApps);
    }
};
