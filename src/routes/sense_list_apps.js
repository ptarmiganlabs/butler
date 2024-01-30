import httpErrors from 'http-errors';
import enigma from 'enigma.js';
import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import upath from 'upath';

// Load global variables and functions
import globals from '../globals.js';
import { logRESTCall } from '../lib/log_rest_call.js';
import { apiGetSenseListApps, apiGetAppsList } from '../api/sense_list_apps.js';

async function handlerGetSenseListApps(request, reply) {
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
                    rejectUnauthorized: globals.config.get('Butler.configEngine.rejectUnauthorized'),
                }),
        };

        const session = enigma.create(configEnigma);
        const global = await session.open();

        // We can now interact with the global object, for example get the document list.
        // Please refer to the Engine API documentation for available methods.
        // Note: getting a list of all apps could also be done using QRS
        const docList = await global.getDocList();

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
            await session.close();
        } catch (err) {
            globals.logger.error(`LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
            reply.send(httpErrors(500, 'Failed closing connection to Sense server'));
        }
            // .catch((error) => {
            //     globals.logger.error(
            //         `LISTAPPS: Error while opening session to Sense engine during app listing: ${JSON.stringify(error, null, 2)}`
            //     );

            //     try {
            //         session.close();
            //     } catch (err) {
            //         globals.logger.error(`LISTAPPS: Error closing connection to Sense engine: ${JSON.stringify(err, null, 2)}`);
            //     }

            //     reply.send(httpErrors(422, 'Failed to open session to Sense engine'));
            // });
    } catch (err) {
        globals.logger.error(`LISTAPPS: getting list of Sense apps, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed getting list of Sense apps'));
    }
}

// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
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
