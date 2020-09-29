// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');
const Keyv = require('keyv');

var keyv = [];

// Function for handling GET /keyvaluenamespaces REST endpoint
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

// Function for handling GET /keyvalue REST endpoint
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

// Function for handling POST /keyvalue REST endpoint
module.exports.respondPOST_keyvalue = async function (req, res, next) {
    logRESTCall(req);

    try {
        // Does namespace already exist?
        let kv = keyv.find(item => item.namespace == req.params.namespace);

        if (kv == undefined) {
            // New namespace. Create keyv object.

            let newKeyvObj = new Keyv(null, { namespace: req.params.namespace });
            if (req.body.ttl != undefined) {
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

            // // Keep track of the new key (unless it's a new one)
            // if (kv.keys.find(item => item.key == req.body.key) == undefined) {
            //     // Key didn't exist. Add it.
            //     kv.keys.push(req.body.key);
            // }
        }

        res.send(201, `Added key ${req.body.key} to namespace ${req.params.namespace}`);
        // res.send(201);
        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed adding key-value to namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed adding key-value to namespace'));
        next();
    }
};

// Function for handling POST /keyvalueClear REST endpoint
module.exports.respondPOST_keyvalueClear = async function (req, res, next) {
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
            // Namespace exists
            await kv.keyv.clear();

            globals.logger.verbose(`KEYVALUE: Cleared namespace: ${req.params.namespace}`);
            res.send(200, `Cleared namespace: ${req.params.namespace}`);
        }

        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed clearing namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed clearing namespace'));
        next();
    }
};



// Function for handling DELETE /keyvalue REST endpoint
module.exports.respondDELETE_keyvalue = async function (req, res, next) {
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

        next();
    } catch (err) {
        globals.logger.error(`KEYVALUE: Failed deleting key '${req.params.key}' in namespace: ${req.params.namespace}`);
        res.send(new errors.InternalError({}, 'Failed deleting key-value data'));
        next();
    }
};