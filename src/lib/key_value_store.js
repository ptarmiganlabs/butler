const Keyv = require('@keyvhq/core');

// Load global variables and functions
const globals = require('../globals');

// Main key-value store
// eslint-disable-next-line prefer-const
let kvStore = [];

function getNamespaceList() {
    const ns = [];
    kvStore.forEach((item) => ns.push(item.namespace));
    return ns;
}

function getNamespace(namespaceName) {
    const ns = kvStore.find((item) => item.namespace === namespaceName);
    return ns;
}

async function deleteNamespace(namespaceName) {
    try {
        // Remove all KV pairs from namespace
        const ns = kvStore.find((item) => item.namespace === namespaceName);
        await ns.keyv.clear();

        // Delete namespace
        const tmpNamespaceArray = kvStore.filter((x) => x.namespace !== namespaceName);
        kvStore = tmpNamespaceArray;
    } catch (err) {
        globals.logger.error(`Failed removing namespace from keyv: ${err}`);
    }
}

async function getValue(namespace, key) {
    try {
        const ns = getNamespace(namespace);
        if (ns !== undefined) {
            return ns.keyv.get(key);
        }

        return null;
    } catch (err) {
        globals.logger.error(`Error getting value for KV pair: ${err}`);
        return false;
    }
}

async function deleteKeyValuePair(namespace, key) {
    try {
        const ns = getNamespace(namespace);
        if (ns !== undefined) {
            return ns.keyv.delete(key);
        }

        return null;
    } catch (err) {
        globals.logger.error(`Error deleting KV pair: ${err}`);
        return false;
    }
}

async function addKeyValuePair(newNamespace, newKey, newValue, newTtl) {
    try {
        // Does namespace already exist?
        const kv = kvStore.find((item) => item.namespace === newNamespace);

        let ttl = 0;
        if (newTtl !== undefined) {
            // TTL parameter available, use it
            ttl = parseInt(newTtl, 10);
        }

        if (kv === undefined) {
            // New namespace. Create keyv object.
            let maxKeys = 1000;
            if (globals.config.has('Butler.keyValueStore.maxKeysPerNamespace')) {
                maxKeys = parseInt(globals.config.get('Butler.keyValueStore.maxKeysPerNamespace'), 10);
            }

            const newKeyvObj = new Keyv({ namespace: newNamespace, maxSize: maxKeys });

            if (ttl > 0) {
                await newKeyvObj.set(newKey, newValue, ttl);
            } else {
                await newKeyvObj.set(newKey, newValue);
            }

            kvStore.push({
                keyv: newKeyvObj,
                namespace: newNamespace,
            });
        } else {
            // Namespace already exists
            // eslint-disable-next-line no-lonely-if
            if (ttl > 0) {
                await kv.keyv.set(newKey, newValue, ttl);
                // hasTTL = true;
            } else {
                await kv.keyv.set(newKey, newValue);
                // hasTTL = false;
            }
        }
    } catch (err) {
        globals.logger.error(`Error while adding new KV pair: ${err}`);
    }
}

module.exports = {
    deleteNamespace,
    deleteKeyValuePair,
    getNamespace,
    getNamespaceList,
    addKeyValuePair,
    getValue,
};
