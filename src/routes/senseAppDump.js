const serializeApp = require('serializeapp');
const httpErrors = require('http-errors');
const enigma = require('enigma.js');
const WebSocket = require('ws');

const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { apiGetSenseAppDump, apiGetAppDump } = require('../api/senseAppDump');

// Set up enigma.js configuration
// eslint-disable-next-line import/no-dynamic-require
const qixSchema = require(`enigma.js/schemas/${globals.configEngine.engineVersion}`);

function handlerGetSenseAppDump(request, reply) {
    try {
        logRESTCall(request);

        if (request.params.appId === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            globals.logger.info(`APPDUMP: Dumping app: ${request.params.appId}`);

            // create a new session
            // TODO Maybe should use https://github.com/qlik-oss/enigma.js/blob/master/docs/api.md#senseutilitiesbuildurlconfig ?
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

                    global
                        .openDoc(request.params.appId, '', '', '', true)
                        .then((app) => serializeApp(app))
                        .then((data) => {
                            reply
                                .type('application/json; charset=utf-8')
                                .code(200)
                                .send(JSON.stringify(data));

                            // Close connection to Sense server
                            try {
                                session.close();
                            } catch (err) {
                                globals.logger.error(
                                    `APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(
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
                                `APPDUMP: Error while opening doc during app dump: ${JSON.stringify(
                                    error,
                                    null,
                                    2
                                )}`
                            );

                            try {
                                session.close();
                            } catch (err) {
                                globals.logger.error(
                                    `APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(
                                        err,
                                        null,
                                        2
                                    )}`
                                );
                                reply.send(
                                    httpErrors(500, 'Error closing connection to Sense server')
                                );
                            }

                            reply.send(httpErrors(422, 'Failed to open session to Sense engine'));
                        });
                })
                .catch((error) => {
                    globals.logger.error(
                        `APPDUMP: Error while opening session to Sense engine during app dump: ${JSON.stringify(
                            error,
                            null,
                            2
                        )}`
                    );

                    try {
                        session.close();
                    } catch (err) {
                        globals.logger.error(
                            `APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(
                                err,
                                null,
                                2
                            )}`
                        );
                        reply.send(httpErrors(500, 'Error closing connection to Sense server'));
                    }

                    reply.send(httpErrors(422, 'Failed to open session to Sense engine'));
                });
        }
    } catch (err) {
        globals.logger.error(
            `APPDUMP: Failed dumping app: ${request.params.appId}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed dumping app'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseAppDump') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseAppDump')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/senseappdump');
        fastify.get('/v4/senseappdump/:appId', apiGetSenseAppDump, handlerGetSenseAppDump);
        fastify.get('/v4/app/:appId/dump', apiGetAppDump, handlerGetSenseAppDump);
    }
};
