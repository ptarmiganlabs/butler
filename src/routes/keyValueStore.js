/* eslint-disable no-lonely-if */
const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
let { keyv } = require('../lib/keyValueStore');
const {
    keyvIndex,
    keyvIndexAddKey,
    keyvIndexDeleteKey,
    keyvIndexDeleteNamespace,
    addKeyValuePair,
} = require('../lib/keyValueStore');

/**
 * @swagger
 *
 * /v4/keyvaluesnamespaces:
 *   get:
 *     description: |
 *       List all currently defined namespaces.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Array of all namespaces.
 *         schema:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Namespace name.
 *                 example: "Weekly sales app"
 *       500:
 *         description: Internal error.
 *
 */
async function handlerGetNamespaceList(request, reply) {
    try {
        logRESTCall(request);

        const ns = [];
        keyv.forEach((item) => ns.push(item.namespace));

        reply.code(200).send(ns);
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting all namespaces, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed getting all namespaces'));
    }
}

/**
 * @swagger
 *
 * /v4/keyvalues/{namespace}:
 *   get:
 *     description: |
 *       Get the value associated with a key, in a specific namespace.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Name of namespace.
 *         in: path
 *         required: true
 *         type: string
 *       - name: key
 *         description: Name of key.
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Key and it's associated value returned.
 *         schema:
 *           type: object
 *           properties:
 *             namespace:
 *               type: string
 *               description: Namespace name.
 *               example: "Sales data ETL, step 2"
 *             key:
 *               type: string
 *               description: Key name.
 *               example: "Last extract timestamp"
 *             value:
 *               value: string
 *               description: Value stored in key-value pair.
 *               example: "2020-09-29 17:14:56"
 *             ttl:
 *               value: integer
 *               description: Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.
 *               example: 60000
 *       400:
 *         description: Namespace or key not found.
 *       400:
 *         description: Missing namespace or key parameter.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerGetKeyValueInNamespace(request, reply) {
    try {
        logRESTCall(request);

        // Does namespace exist?
        const kv = keyv.find((item) => item.namespace === request.params.namespace);
        let kvRes;

        if (kv === undefined) {
            // Namespace does not exist. Error.
            globals.logger.error(`KEYVALUE: Namespace not found: ${request.params.namespace}`);
            reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
        } else {
            // Namespace exists. Is there a key specified?

            if (request.query.key === undefined) {
                // No key specified.
                // In future version: Return list of all key-value pairs in this namespace
                // Now: Return error
                globals.logger.error(
                    `KEYVALUE: Key parameter missing. Namespace: ${request.params.namespace}.`
                );
                reply.send(
                    httpErrors(
                        400,
                        `Key parameter missing. Namespace: ${request.params.namespace}.`
                    )
                );
            } else {
                // Key specified
                const value = await kv.keyv.get(request.query.key);
                if (value === undefined) {
                    // Key does not exist
                    globals.logger.error(
                        `KEYVALUE: Key ${request.query.key} not found in namespace ${request.params.namespace}.`
                    );
                    reply.send(
                        httpErrors(
                            400,
                            `Key '${request.query.key}' not found in namespace: ${request.params.namespace}`
                        )
                    );
                } else {
                    // Key found and value returned
                    kvRes = {
                        namespace: request.params.namespace,
                        key: request.query.key,
                        value,
                        ttl: kv.ttl,
                    };
                    reply.code(200).send(kvRes);
                }
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting key '${request.query.key}' in namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed getting key-value data'));
    }
}

/**
 * @swagger
 *
 * /v4/keyvalues/{namespace}/keyexists:
 *   get:
 *     description: |
 *       Checks if a key exists in a namespace.
 *
 *       Returns true if the specified key exists, otherwise false.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Name of namespace.
 *         in: path
 *         required: true
 *         type: string
 *       - name: key
 *         description: Name of key.
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Key exist/no-exist returned, together with the data if the does exist.
 *         schema:
 *           type: object
 *           properties:
 *             keyExists:
 *               type: string
 *               description: true or false depending on whether the key exists or not
 *               example: "true"
 *             keyValue:
 *               type: object
 *               description: Key-value data, if the key has been found.
 *               properties:
 *                 namespace:
 *                   type: string
 *                   description: Namespace name.
 *                   example: "Sales data ETL, step 2"
 *                 key:
 *                   type: string
 *                   description: Key name.
 *                   example: "Last extract timestamp"
 *                 value:
 *                   value: string
 *                   description: Value stored in key-value pair.
 *                   example: "2020-09-29 17:14:56"
 *                 ttl:
 *                   value: integer
 *                   description: Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.
 *                   example: 60000
 *       400:
 *         description: Namespace does not exist.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerKeyExists(request, reply) {
    try {
        logRESTCall(request);

        // Does namespace exist?
        const kv = keyv.find((item) => item.namespace === request.params.namespace);
        let kvRes;

        if (kv === undefined) {
            // Namespace does not exist. Error.
            globals.logger.error('KEYVALUE: Namespace parameter missing.');
            reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
        } else {
            // Namespace exists. Is there a key specified?
            if (request.query.key === undefined) {
                // No key specified.
                // In future version: Return list of all key-value pairs in this namespace
                // Now: Return error
                globals.logger.error(
                    `KEYVALUE: Key parameter missing. Namespace: ${request.params.namespace}.`
                );
                reply.send(
                    httpErrors(
                        400,
                        `Key parameter missing. Namespace: ${request.params.namespace}.`
                    )
                );
            } else {
                // Key specified
                const value = await kv.keyv.get(request.query.key);
                if (value === undefined) {
                    // Key does not exist
                    kvRes = { keyExists: false };
                    kvRes.keyValue = {};

                    keyvIndexDeleteKey(request.params.namespace, request.query.key);
                } else {
                    // Key exists
                    kvRes = { keyExists: true };
                    kvRes.keyValue = {
                        namespace: request.params.namespace,
                        key: request.query.key,
                        value,
                        ttl: kv.ttl,
                    };

                    keyvIndexAddKey(request.params.namespace, request.query.key, kv.ttk > 0);
                }

                reply.code(200).send(kvRes);
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting key '${request.query.key}' in namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed getting key-value data'));
    }
}

/**
 * @swagger
 *
 * /v4/keyvalues/{namespace}:
 *   post:
 *     description: |
 *       Create a new key-value pair in the specified namespace.
 *
 *       If the specified key already exists it will be overwritten.
 *       If the posted data has a TTL, it will start counting when the post occur.
 *       I.e. if a previouly posted key also had a TTL, it will be replace with the most recent TTL.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Namespace in which the key-value pair will be stored.
 *         in: path
 *         type: string
 *         required: true
 *         example: "Sales data ETL, step 2"
 *       - name: Key-value pair
 *         description: Key-value pair to create
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - key
 *             - value
 *           properties:
 *             key:
 *               type: string
 *               description: Key to use.
 *               example: "ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1"
 *             value:
 *               type: string
 *               description: Value to set.
 *               example: "12345.789"
 *             ttl:
 *               type: string
 *               description: Time to live = how long (milliseconds) the key-value pair should exist before being automatically deleted.
 *               example: "10000"
 *     responses:
 *       201:
 *         description: Key successfully set.
 *         schema:
 *           type: object
 *           properties:
 *             namespace:
 *               type: string
 *               description: Namespace name.
 *               example: "Sales data ETL, step 2"
 *             key:
 *               type: string
 *               description: Key name.
 *               example: "ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1"
 *             value:
 *               value: string
 *               description: Value stored in key-value pair.
 *               example: "12345.789"
 *             ttl:
 *               value: integer
 *               description: Time-to-live for the key-value pair. 0 if no ttl was set, otherwise in milliseconds.
 *               example: 60000
 *       400:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */

async function handlerPostKeyValueInNamespace(request, reply) {
    try {
        logRESTCall(request);

        if (
            request.params.namespace === undefined ||
            request.body.key === undefined ||
            request.body.key === ''
        ) {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: Required parameter missing.');
            reply.send(httpErrors(400, 'Required parameter is missing'));
        } else {
            let ttl = 0;
            if (request.body.ttl !== undefined) {
                // TTL parameter available, use it
                ttl = parseInt(request.body.ttl, 10);
            }

            await addKeyValuePair(
                request.params.namespace,
                request.body.key,
                request.body.value,
                request.body.ttl
            );

            reply.code(200).send({
                namespace: request.params.namespace,
                key: request.body.key,
                value: request.body.value,
                ttl,
            });
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed adding key-value to namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed adding key-value to namespace'));
    }
}

/**
 * @swagger
 *
 * /v4/keyvalue/{namespace}/{key}:
 *   delete:
 *     description: |
 *       Delete a key-value pair in a specific namespace.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Name of namespace.
 *         in: path
 *         required: true
 *         type: string
 *       - name: key
 *         description: Name of key.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       204:
 *         description: Key-value pair has been deleted.
 *       400:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerDeleteKeyValueInNamespace(request, reply) {
    try {
        logRESTCall(request);

        if (
            request.params.namespace === undefined ||
            request.params.key === undefined ||
            request.params.key === ''
        ) {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: Required parameter missing.');
            reply.send(httpErrors(400, 'Required parameter is missing'));
        } else {
            // Does namespace exist?
            const kv = keyv.find((item) => item.namespace === request.params.namespace);

            if (kv === undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${request.params.namespace}`);
                reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
            } else {
                // Namespace exists. Is there a key specified?
                if (request.params.key === undefined) {
                    // No key specified.
                    // In future version: Return list of all key-value pairs in this namespace
                    // Now: Return error
                    globals.logger.error(
                        `KEYVALUE: No key specified for namespace: ${request.params.namespace}`
                    );
                    reply.send(
                        httpErrors(
                            400,
                            `No key specified for namespace: ${request.params.namespace}`
                        )
                    );
                } else {
                    // Key specified
                    keyvIndexDeleteKey(request.params.namespace, request.params.key);

                    const value = await kv.keyv.delete(request.params.key);

                    if (value === false) {
                        // Key does not exist
                        reply.send(
                            httpErrors(
                                400,
                                `Key '${request.params.key}' not found in namespace: ${request.params.namespace}`
                            )
                        );
                    } else {
                        // Key found and deleted
                        reply.code(204).send();
                    }
                }
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed deleting key '${request.params.key}' in namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed deleting key-value data'));
    }
}

/**
 * @swagger
 *
 * /v4/keyvalue/{namespace}:
 *   delete:
 *     description: |
 *       Delete a namespace and all key-value pairs in it.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Name of namespace.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       204:
 *         description: Namespace has been deleted.
 *       400:
 *         description: Missing namespace.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerDeleteNamespace(request, reply) {
    try {
        logRESTCall(request);

        if (request.params.namespace === undefined) {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: No namespace specified.');
            reply.send(httpErrors(400, 'No namespace specified'));
        } else {
            // Does namespace exist?
            const kv = keyv.find((item) => item.namespace === request.params.namespace);

            if (kv === undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${request.params.namespace}`);
                reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
            } else {
                // Namespace exists

                // Remove all KV pairs from namespace
                await kv.keyv.clear();

                // Delete the namespace
                keyv = keyv.filter((item) => item.namespace === request.params.namespace);

                // Delete namespace from shadow list of all existing ns/key combos
                keyvIndexDeleteNamespace(request.params.namespace);

                globals.logger.verbose(`KEYVALUE: Cleared namespace: ${request.params.namespace}`);
                reply.code(204).send();
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed clearing namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed clearing namespace'));
    }
}

/**
 * @swagger
 *
 * /v4/keylist/{namespace}:
 *   get:
 *     description: |
 *       Retrieve an array with keys present in the specified namespace.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Name of namespace whose keys should be returned.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: List of keys retrieved.
 *       400:
 *         description: Missing namespace.
 *       500:
 *         description: Internal error.
 *
 */
async function handlerGetKeyValueList(request, reply) {
    try {
        logRESTCall(request);

        if (request.params.namespace === undefined) {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: No namespace specified.');
            reply.send(httpErrors(400, 'No namespace specified'));
        } else {
            // Does namespace exist?
            const kv = keyv.find((item) => item.namespace === request.params.namespace);

            if (kv === undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${request.params.namespace}`);
                reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
            } else {
                // Namespace exists. Get it.
                let kvRes = keyvIndex.filter(
                    (item) => item.namespace === request.params.namespace
                )[0];

                if (kvRes === undefined) {
                    // The namespace existed but is empty. Return empty datastructure to indicate this.
                    kvRes = {
                        namespace: request.params.namespace,
                        keys: [],
                    };
                }

                reply.code(200).send(kvRes);
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting list of keys in namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed getting list of keys in namespace'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.keyValueStore') &&
        globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/keyvaluenamespaces');
        fastify.get('/v4/keyvaluesnamespaces', handlerGetNamespaceList);

        globals.logger.debug('Registering REST endpoint GET /v4/keyvalues');
        fastify.get('/v4/keyvalues/:namespace', handlerGetKeyValueInNamespace);

        globals.logger.debug('Registering REST endpoint GET /v4/keyvalues/:namespace/keyexists');
        fastify.get('/v4/keyvalues/:namespace/keyexists', handlerKeyExists);

        globals.logger.debug('Registering REST endpoint POST /v4/keyvalues');
        fastify.post('/v4/keyvalues/:namespace', handlerPostKeyValueInNamespace);

        globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalues/{namespace}/{key}');
        fastify.delete('/v4/keyvalues/:namespace/:key', handlerDeleteKeyValueInNamespace);

        globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalues/{namespace}');
        fastify.delete('/v4/keyvalues/:namespace', handlerDeleteNamespace);

        globals.logger.debug('Registering REST endpoint GET /v4/keylist/{namespace}');
        fastify.get('/v4/keylist/:namespace', handlerGetKeyValueList);
    }
};
