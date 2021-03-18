/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');
const Keyv = require('keyv');

var keyv = [];

/**
 *
 * @param {*} kvData
 */
async function addKeyValuePair(newNamespace, newKey, newValue, newTtl) {
    // Does namespace already exist?
    let kv = keyv.find(item => item.namespace == newNamespace);

    let ttl = 0;
    if (newTtl != undefined) {
        // TTL parameter available, use it
        ttl = parseInt(newTtl, 10);
    }

    if (kv == undefined) {
        // New namespace. Create keyv object.
        let maxKeys = 1000;
        if (globals.config.has('Butler.keyValueStore.maxKeysPerNamespace')) {
            maxKeys = parseInt(globals.config.get('Butler.keyValueStore.maxKeysPerNamespace'), 10);
        }

        let newKeyvObj = new Keyv(null, { namespace: newNamespace, maxSize: maxKeys });

        if (ttl > 0) {
            await newKeyvObj.set(newKey, newValue, ttl);
        } else {
            await newKeyvObj.set(newKey, newValue);
        }

        keyv.push({
            keyv: newKeyvObj,
            namespace: newNamespace,
            ttl: ttl,
        });
    } else {
        // Namespace already exists
        kv.ttl = ttl;

        if (ttl > 0) {
            await kv.keyv.set(newKey, newValue, ttl);
        } else {
            await kv.keyv.set(newKey, newValue);
        }
    }
}

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
function respondGET_keyvaluesnamespaces(req, res, next) {
    logRESTCall(req);

    try {
        let ns = [];
        keyv.forEach(item => ns.push(item.namespace));

        res.send(200, ns);
        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed getting all namespaces, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed getting all namespaces'));
        next();
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
 *       404:
 *         description: Namespace or key not found.
 *       409:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
async function respondGET_keyvalues(req, res, next) {
    logRESTCall(req);

    try {
        // Does namespace exist?
        let kv = keyv.find(item => item.namespace == req.params.namespace);
        let kvRes;

        if (kv == undefined) {
            // Namespace does not exist. Error.
            globals.logger.error('KEYVALUE: Namespace parameter missing.');

            kvRes = new errors.MissingParameterError({}, `Namespace not found: ${req.params.namespace}`);
            res.send(kvRes);
        } else {
            // Namespace exists. Is there a key specified?

            if (req.query.key == undefined) {
                // No key specified.
                // In future version: Return list of all key-value pairs in this namespace
                // Now: Return error
                globals.logger.error(`KEYVALUE: Key parameter missing. Namespace: ${req.params.namespace}.`);

                kvRes = new errors.MissingParameterError({}, `No key specified for namespace: ${req.params.namespace}`);
                res.send(kvRes);
            } else {
                // Key specified
                let value = await kv.keyv.get(req.query.key);
                if (value == undefined) {
                    // Key does not exist
                    globals.logger.error(`KEYVALUE: Key ${req.query.key} not found in namespace ${req.params.namespace}.`);
                    kvRes = new errors.ResourceNotFoundError({}, `Key '${req.query.key}' not found in namespace: ${req.params.namespace}`);
                    res.send(kvRes);
                } else {
                    // Key found and value returned
                    kvRes = { namespace: req.params.namespace, key: req.query.key, value: value, ttl: kv.ttl };
                    res.send(200, kvRes);
                }
            }
        }

        next();
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting key '${req.query.key}' in namespace: ${req.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        res.send(new errors.InternalError({}, 'Failed getting key-value data'));
        next();
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
 *       409:
 *         description: Namespace does not exist.
 *       500:
 *         description: Internal error.
 *
 */
async function respondGET_keyvalueExists(req, res, next) {
    logRESTCall(req);

    try {
        // Does namespace exist?
        let kv = keyv.find(item => item.namespace == req.params.namespace);
        let kvRes;

        if (kv == undefined) {
            // Namespace does not exist. Error.
            globals.logger.error('KEYVALUE: Namespace parameter missing.');

            kvRes = new errors.MissingParameterError({}, `Namespace not found: ${req.params.namespace}`);
            res.send(kvRes);
        } else {
            // Namespace exists. Is there a key specified?

            if (req.query.key == undefined) {
                // No key specified.
                // In future version: Return list of all key-value pairs in this namespace
                // Now: Return error
                globals.logger.error(`KEYVALUE: Key parameter missing. Namespace: ${req.params.namespace}.`);

                kvRes = new errors.MissingParameterError({}, `No key specified for namespace: ${req.params.namespace}`);
                res.send(kvRes);
            } else {
                // Key specified
                let value = await kv.keyv.get(req.query.key);
                if (value == undefined) {
                    // Key does not exist
                    kvRes = { keyExists: false };
                    kvRes.keyValue = {};
                } else {
                    // Key exists
                    kvRes = { keyExists: true };
                    kvRes.keyValue = {
                        namespace: req.params.namespace,
                        key: req.query.key,
                        value: value,
                        ttl: kv.ttl,
                    };
                }
                res.send(200, kvRes);
            }
        }

        next();
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed getting key '${req.query.key}' in namespace: ${req.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        res.send(new errors.InternalError({}, 'Failed getting key-value data'));
        next();
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
 *       409:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
async function respondPOST_keyvalues(req, res, next) {
    logRESTCall(req);

    try {
        if (req.params.namespace == undefined || req.body.key == undefined || req.body.key == '') {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter is missing'));
        } else {
            let ttl = 0;
            if (req.body.ttl != undefined) {
                // TTL parameter available, use it
                ttl = parseInt(req.body.ttl, 10);
            }

            // eslint-disable-next-line no-unused-vars
            let result = await addKeyValuePair(req.params.namespace, req.body.key, req.body.value, req.body.ttl);

            res.send(201, {
                namespace: req.params.namespace,
                key: req.body.key,
                value: req.body.value,
                ttl: ttl,
            });
        }
        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed adding key-value to namespace: ${req.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed adding key-value to namespace'));
        next();
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
 *       409:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
async function respondDELETE_keyvalues(req, res, next) {
    logRESTCall(req);

    try {
        if (req.params.namespace == undefined || req.params.key == undefined || req.params.key == '') {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter is missing'));
        } else {
            // Does namespace exist?
            let kv = keyv.find(item => item.namespace == req.params.namespace);
            let kvRes;

            if (kv == undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${req.params.namespace}`);

                kvRes = new errors.MissingParameterError({}, `Namespace not found: ${req.params.namespace}`);
                res.send(kvRes);
            } else {
                // Namespace exists. Is there a key specified?

                if (req.params.key == undefined) {
                    // No key specified.
                    // In future version: Return list of all key-value pairs in this namespace
                    // Now: Return error
                    kvRes = new errors.MissingParameterError({}, `No key specified for namespace: ${req.params.namespace}`);
                    res.send(kvRes);
                } else {
                    // Key specified
                    let value = await kv.keyv.delete(req.params.key);
                    if (value == false) {
                        // Key does not exist
                        kvRes = new errors.ResourceNotFoundError({}, `Key '${req.params.key}' not found in namespace: ${req.params.namespace}`);
                        res.send(kvRes);
                    } else {
                        // Key found and deleted
                        res.send(204);
                    }
                }
            }
        }

        next();
    } catch (err) {
        globals.logger.error(
            `KEYVALUE: Failed deleting key '${req.params.key}' in namespace: ${req.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
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
 *       409:
 *         description: Missing namespace.
 *       500:
 *         description: Internal error.
 *
 */
async function respondDELETE_keyvaluesDelete(req, res, next) {
    logRESTCall(req);

    try {
        if (req.params.namespace == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'No namespace specified'));
        } else {
            // Does namespace exist?
            let kv = keyv.find(item => item.namespace == req.params.namespace);
            let kvRes;

            if (kv == undefined) {
                // Namespace does not exist. Error.
                globals.logger.error(`KEYVALUE: Namespace not found: ${req.params.namespace}`);

                kvRes = new errors.MissingParameterError({}, `Namespace not found: ${req.params.namespace}`);
                res.send(kvRes);
            } else {
                // Namespace exists

                // Remove all KV pairs from namespace
                await kv.keyv.clear();

                // Delete the namespace
                keyv = keyv.filter(item => item.namespace == req.params.namespace);

                globals.logger.verbose(`KEYVALUE: Cleared namespace: ${req.params.namespace}`);
                res.send(204);
            }
        }

        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed clearing namespace: ${req.params.namespace}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed clearing namespace'));
        next();
    }
}

module.exports = {
    addKeyValuePair,
    respondGET_keyvaluesnamespaces,
    respondGET_keyvalues,
    respondGET_keyvalueExists,
    respondPOST_keyvalues,
    respondDELETE_keyvalues,
    respondDELETE_keyvaluesDelete,
};
