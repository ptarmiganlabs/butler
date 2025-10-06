/* eslint-disable no-lonely-if */
import httpErrors from 'http-errors';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import {
    getNamespaceList,
    getNamespace,
    deleteNamespace,
    addKeyValuePair,
    deleteKeyValuePair,
    getValue,
} from '../../lib/key_value_store.js';
import {
    apiGetAllNamespaces,
    apiGetKVPair,
    apiGetKVExists,
    apiPostKVPair,
    apiDeleteKVPair,
    apiDeleteNamespace,
    apiGetKeysInNamespace,
} from '../../api/key_value_store.js';

/**
 * Handles the GET request to retrieve the list of namespaces.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerGetNamespaceList(request, reply) {
    try {
        logRESTCall(request);

        // const ns = [];
        // kvStore.keyv.forEach((item) => ns.push(item.namespace));
        const ns = getNamespaceList();

        reply.code(200).send(ns);
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed getting all namespaces, error is: ${globals.getErrorMessage(err)}`);
        reply.send(httpErrors(500, 'Failed getting all namespaces'));
    }
}

/**
 * Handles the GET request to retrieve a key-value pair in a namespace.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerGetKeyValueInNamespace(request, reply) {
    try {
        logRESTCall(request);

        // Does namespace exist?
        const kv = getNamespace(request.params.namespace);
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
                globals.logger.error(`KEYVALUE: Key parameter missing. Namespace: ${request.params.namespace}.`);
                reply.send(httpErrors(400, `Key parameter missing. Namespace: ${request.params.namespace}.`));
            } else {
                // Key specified
                const value = await getValue(request.params.namespace, request.query.key);
                if (value === undefined) {
                    // Key does not exist
                    globals.logger.error(`KEYVALUE: Key ${request.query.key} not found in namespace ${request.params.namespace}.`);
                    reply.send(httpErrors(400, `Key '${request.query.key}' not found in namespace: ${request.params.namespace}`));
                } else {
                    // Key found and value returned
                    kvRes = {
                        namespace: request.params.namespace,
                        key: request.query.key,
                        value,
                    };
                    reply.code(200).send(kvRes);
                }
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting key '${request.query.key}' in namespace: ${request.params.namespace}, error is: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
        reply.send(httpErrors(500, 'Failed getting key-value data'));
    }
}

/**
 * Handles the GET request to check if a key exists in a namespace.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerKeyExists(request, reply) {
    try {
        logRESTCall(request);

        // Does namespace exist?
        const kv = getNamespace(request.params.namespace);
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
                globals.logger.error(`KEYVALUE: Key parameter missing. Namespace: ${request.params.namespace}.`);
                reply.send(httpErrors(400, `Key parameter missing. Namespace: ${request.params.namespace}.`));
            } else {
                // Key specified
                const value = await getValue(request.params.namespace, request.query.key);
                if (value === undefined) {
                    // Key does not exist
                    kvRes = { keyExists: false };
                    kvRes.keyValue = {};

                    // keyvIndexDeleteKey(request.params.namespace, request.query.key);
                } else {
                    // Key exists
                    kvRes = { keyExists: true };
                    kvRes.keyValue = {
                        namespace: request.params.namespace,
                        key: request.query.key,
                        value,
                    };

                    // keyvIndexAddKey(request.params.namespace, request.query.key, kv.ttk > 0);
                }

                reply.code(200).send(kvRes);
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed checking if key '${request.query.key}' exists in namespace: ${
                request.params.namespace
            }, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed getting key-value data'));
    }
}

/**
 * Handles the POST request to add a key-value pair in a namespace.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerPostKeyValueInNamespace(request, reply) {
    try {
        logRESTCall(request);

        if (request.params.namespace === undefined || request.body.key === undefined || request.body.key === '') {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: Required parameter missing.');
            reply.send(httpErrors(400, 'Required parameter is missing'));
        } else {
            let ttl = 0;
            if (request.body.ttl !== undefined) {
                // TTL parameter available, use it
                ttl = parseInt(request.body.ttl, 10);
            }

            await addKeyValuePair(request.params.namespace, request.body.key, request.body.value, request.body.ttl);

            reply.code(201).send({
                namespace: request.params.namespace,
                key: request.body.key,
                value: request.body.value,
                ttl,
            });
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed adding key-value to namespace: ${request.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed adding key-value to namespace'));
    }
}

/**
 * Handles the DELETE request to delete a key-value pair in a namespace.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerDeleteKeyValueInNamespace(request, reply) {
    try {
        logRESTCall(request);

        if (request.params.namespace === undefined || request.params.key === undefined || request.params.key === '') {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: Required parameter missing.');
            reply.send(httpErrors(400, 'Required parameter is missing'));
        } else {
            // Does namespace exist?
            const kv = getNamespace(request.params.namespace);

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
                    globals.logger.error(`KEYVALUE: No key specified for namespace: ${request.params.namespace}`);
                    reply.send(httpErrors(400, `No key specified for namespace: ${request.params.namespace}`));
                } else {
                    // Key specified
                    // keyvIndexDeleteKey(request.params.namespace, request.params.key);
                    const value = await deleteKeyValuePair(request.params.namespace, request.params.key);

                    if (value === false) {
                        // Key does not exist
                        reply.send(httpErrors(400, `Key '${request.params.key}' not found in namespace: ${request.params.namespace}`));
                    } else {
                        // Key found and deleted
                        reply.code(204).send();
                    }
                }
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed deleting key '${request.params.key}' in namespace: ${request.params.namespace}, error is: ${JSON.stringify(
                err,
                null,
                2,
            )}`,
        );
        reply.send(httpErrors(500, 'Failed deleting key-value data'));
    }
}

/**
 * Handles the DELETE request to delete a namespace.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
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
            // const kv = kvStore.keyv.find((item) => item.namespace === request.params.namespace);
            const kv = getNamespace(request.params.namespace);

            if (kv === undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${request.params.namespace}`);
                reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
            } else {
                // Namespace exists

                await deleteNamespace(request.params.namespace);
                // // Remove all KV pairs from namespace
                // await kv.keyv.clear();

                // // Delete the namespace
                // kvStore.keyv = kvStore.keyv.filter(
                //     (item) => item.namespace !== request.params.namespace
                // );

                // Delete namespace from shadow list of all existing ns/key combos
                // keyvIndexDeleteNamespace(request.params.namespace);

                globals.logger.verbose(`KEYVALUE: Cleared namespace: ${request.params.namespace}`);
                reply.code(204).send();
            }
        }
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed clearing namespace: ${request.params.namespace}, error is: ${globals.getErrorMessage(err)}`);
        reply.send(httpErrors(500, 'Failed clearing namespace'));
    }
}

/**
 * Handles the GET request to retrieve the list of keys in a namespace.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerGetKeyList(request, reply) {
    try {
        logRESTCall(request);

        if (request.params.namespace === undefined) {
            // Required parameter is missing
            globals.logger.error('KEYVALUE: No namespace specified.');
            reply.send(httpErrors(400, 'No namespace specified'));
        } else {
            // Does namespace exist?
            const kv = getNamespace(request.params.namespace);

            if (kv === undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${request.params.namespace}`);
                reply.send(httpErrors(400, `Namespace not found: ${request.params.namespace}`));
            } else {
                // Namespace exists. Get list of all keys in it

                const keyList = [];
                // eslint-disable-next-line no-restricted-syntax
                for await (const item of kv.keyv.iterator()) {
                    keyList.push({ key: item[0] });
                }

                // let kvRes = kvStore.keyvIndex.filter(
                //     (item) => item.namespace === request.params.namespace
                // )[0];

                // if (kvRes === undefined) {
                //     // The namespace existed but is empty. Return empty datastructure to indicate this.
                //     kvRes = {
                //         namespace: request.params.namespace,
                //         keys: [],
                //     };
                // }

                reply.code(200).send(JSON.stringify({ namespace: request.params.namespace, keys: keyList }));
            }
        }
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting list of keys in namespace: ${request.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed getting list of keys in namespace'));
    }
}

/**
 * Registers the REST endpoints for key-value store operations.
 * @param {Object} fastify - The Fastify instance.
 * @param {Object} options - The options object.
 */
// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.keyValueStore') &&
        globals.config.get('Butler.restServerEndpointsEnable.keyValueStore')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/keyvaluenamespaces');
        fastify.get('/v4/keyvaluesnamespaces', apiGetAllNamespaces, handlerGetNamespaceList);

        globals.logger.debug('Registering REST endpoint GET /v4/keyvalues');
        fastify.get('/v4/keyvalues/:namespace', apiGetKVPair, handlerGetKeyValueInNamespace);

        globals.logger.debug('Registering REST endpoint GET /v4/keyvalues/:namespace/keyexists');
        fastify.get('/v4/keyvalues/:namespace/keyexists', apiGetKVExists, handlerKeyExists);

        globals.logger.debug('Registering REST endpoint POST /v4/keyvalues');
        fastify.post('/v4/keyvalues/:namespace', apiPostKVPair, handlerPostKeyValueInNamespace);

        globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalues/{namespace}/{key}');
        fastify.delete('/v4/keyvalues/:namespace/:key', apiDeleteKVPair, handlerDeleteKeyValueInNamespace);

        globals.logger.debug('Registering REST endpoint DELETE /v4/keyvalues/{namespace}');
        fastify.delete('/v4/keyvalues/:namespace', apiDeleteNamespace, handlerDeleteNamespace);

        globals.logger.debug('Registering REST endpoint GET /v4/keylist/{namespace}');
        fastify.get('/v4/keylist/:namespace', apiGetKeysInNamespace, handlerGetKeyList);
    }
};
