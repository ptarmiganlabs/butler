// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');
const Keyv = require('keyv');

var keyv = [];

/**
 * @swagger
 *
 * /v4/keyvaluenamespaces:
 *   get:
 *     description: |
 *       List all currently defined namespaces.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Array of all namespaces.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondGET_keyvaluenamespaces = function (req, res, next) {
    logRESTCall(req);

    try {
        let ns = [];
        keyv.forEach(item => ns.push(item.namespace));

        // res.send(JSON.stringify(ns, null, 2));
        res.send(200, { namespaces: ns });
        next();
    } catch (err) {
        globals.logger.error('KEYVALUE: Failed getting all namespaces');
        res.send(new errors.InternalError({}, 'Failed getting all namespaces'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/keyvalue/{namespace}:
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
 *       404:
 *         description: Key not found.
 *       409:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondGET_keyvalue = async function (req, res, next) {
    logRESTCall(req);

    try {
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

            if (req.query.key == undefined) {
                // No key specified.
                // In future version: Return list of all key-value pairs in this namespace
                // Now: Return error
                kvRes = new errors.MissingParameterError({}, `No key specified for namespace: ${req.params.namespace}`);
                res.send(kvRes);
            } else {
                // Key specified
                let value = await kv.keyv.get(req.query.key);
                if (value == undefined) {
                    // Key does not exist
                    kvRes = new errors.ResourceNotFoundError({}, `Key '${req.query.key}' not found in namespace: ${req.params.namespace}`);
                    res.send(kvRes);
                } else {
                    // Key found and value returned
                    kvRes = { key: req.query.key, value: value };
                    res.send(200, kvRes);
                }
            }
        }

        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed getting key '${req.query.key}' in namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed getting key-value data'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/keyvalue/{namespace}:
 *   post:
 *     description: |
 *       Set the value associated with a key, in a specific namespace.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: message
 *         description: Key-value pair to set
 *         in: body
 *         schema: 
 *           type: object
 *           required: 
 *             - key
 *             - value
 *           properties:
 *             key:
 *               type: string
 *               example: ce68c8ca-b3ff-4371-8285-7c9ce5040e42_parameter_1
 *             value:
 *               type: string
 *               example: 12345.789
 *     responses:
 *       201:
 *         description: Key and it's associated value returned.
 *       409:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPOST_keyvalue = async function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.params.namespace == undefined || req.body.key == undefined ||  req.body.key == '') {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter is missing'));
        } else {
            // Does namespace already exist?
            let kv = keyv.find(item => item.namespace == req.params.namespace);

            if (kv == undefined) {
                // New namespace. Create keyv object.

                let maxKeys = 1000;
                if (globals.config.has('Butler.keyValueStore.maxKeysPerNamespace')) {
                    maxKeys = parseInt(globals.config.get('Butler.keyValueStore.maxKeysPerNamespace'), 10);
                }

                let newKeyvObj = new Keyv(null, { namespace: req.params.namespace, maxSize: maxKeys });
                if (req.body.ttl != undefined) {
                    // TTL parameter available, use it
                    await newKeyvObj.set(req.body.key, req.body.value, parseInt(req.body.ttl, 10));
                } else {
                    await newKeyvObj.set(req.body.key, req.body.value);
                }

                keyv.push({
                    keyv: newKeyvObj,
                    namespace: req.params.namespace,
                    keys: [req.body.key],
                });
            } else {
                // Namespace already exists
                if (req.body.ttl != undefined) {
                    await kv.keyv.set(req.body.key, req.body.value, parseInt(req.body.ttl, 10));
                } else {
                    await kv.keyv.set(req.body.key, req.body.value);
                }
            }

            res.send(201, `Added key ${req.body.key} to namespace ${req.params.namespace}`);
        }
        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed adding key-value to namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed adding key-value to namespace'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/keyvalueclear/{namespace}:
 *   put:
 *     description: |
 *       Removes all key-value pairs from specified namespace.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: namespace
 *         description: Name of namespace.
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       201:
 *         description: Namespace has been emptied.
 *       409:
 *         description: Missing namespace.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_keyvalueClear = async function (req, res, next) {
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
                await kv.keyv.clear();

                globals.logger.verbose(`KEYVALUE: Cleared namespace: ${req.params.namespace}`);
                res.send(201, `Cleared namespace: ${req.params.namespace}`);
            }
        }

        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed clearing namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed clearing namespace'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/keyvalue/{namespace}:
 *   delete:
 *     description: |
 *       Removes all key-value pairs from specified namespace.
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
 *       201:
 *         description: Key-value pair has been deleted.
 *       409:
 *         description: Missing namespace or key.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondDELETE_keyvalue = async function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.params.namespace == undefined || req.body.key == undefined ||  req.body.key == '') {
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
                    if (value != undefined) {
                        // Key does not exist
                        kvRes = new errors.ResourceNotFoundError({}, `Key '${req.params.key}' not found in namespace: ${req.params.namespace}`);
                        res.send(kvRes);
                    } else {
                        // Key found and deleted
                        res.send(200, `Key '${req.params.key}' deleted from namespace: ${req.params.namespace}`);
                    }
                }
            }
        }

        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed deleting key '${req.params.key}' in namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
    }
};
