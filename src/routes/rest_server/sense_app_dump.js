import serializeApp from 'serializeapp';
import httpErrors from 'http-errors';
import enigma from 'enigma.js';
import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import upath from 'upath';

import globals from '../../globals.js';
import { logRESTCall } from '../../lib/log_rest_call.js';
import { apiGetSenseAppDump, apiGetAppDump } from '../../api/sense_app_dump.js';

async function handlerGetSenseAppDump(request, reply) {
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
            c = upath.join(b, '..', '..', schemaFile);
        }

        globals.logger.verbose(`APPDUMP: Using engine schema in file: ${c}`);
        const qixSchema = JSON.parse(readFileSync(c));

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
                        rejectUnauthorized: globals.config.get('Butler.configEngine.rejectUnauthorized'),
                    }),
            };

            const session = enigma.create(configEnigma);
            const global = await session.open();

            // We can now interact with the global object, for example get the document list.
            // Please refer to the Engine API documentation for available methods.
            const app = await global.openDoc(request.params.appId, '', '', '', true);
            const data = await serializeApp(app);

            reply.type('application/json; charset=utf-8').code(200).send(JSON.stringify(data));

            // Close connection to Sense server
            try {
                await session.close();
            } catch (err) {
                globals.logger.error(`APPDUMP: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
                reply.send(httpErrors(500, 'Failed closing connection to Sense server'));
            }
        }
    } catch (err) {
        globals.logger.error(`APPDUMP: Failed dumping app: ${request.params.appId}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed dumping app'));
    }
}

// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.senseAppDump') &&
        globals.config.get('Butler.restServerEndpointsEnable.senseAppDump')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/senseappdump');
        fastify.get('/v4/senseappdump/:appId', apiGetSenseAppDump, handlerGetSenseAppDump);
        fastify.get('/v4/app/:appId/dump', apiGetAppDump, handlerGetSenseAppDump);
    }
};
