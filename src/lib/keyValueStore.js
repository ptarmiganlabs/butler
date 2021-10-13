const Keyv = require('keyv');

// Load global variables and functions
const globals = require('../globals');

// Main key-value store
// eslint-disable-next-line prefer-const
let keyv = [];

// As the keyv library doesn't allow for enumeration over all KV pairs in a namespace, we have to
// add this feature ourselves.
// This variable keeps a list of {namespace: 'foo', keys: [{key: 'bar'}]}.
let keyvIndex = [];

function keyvIndexAddKey(namespace, key) {
    try {
        // Add if it doesn't already exist. There should be no duplicates.
        const nsExistingIndex = keyvIndex.findIndex((ns) => ns.namespace === namespace);
        if (nsExistingIndex === -1) {
            // Namespace doesn't exist.
            keyvIndex.push({ namespace, keys: [{ key }] });
        } else {
            // Namespace exists
            // Add key if it doesn't already exist
            const keyExistingIndex = keyvIndex[nsExistingIndex].keys.findIndex(
                (x) => x.key === key
            );
            if (keyExistingIndex === -1) {
                // Key does not already exist. Add it.
                keyvIndex[nsExistingIndex].keys.push({
                    key,
                });
            } else {
                // Key already exists, all good.
                globals.logger.debug(
                    `Namespace/key ${namespace}/${key} already exists, not adding it again`
                );
            }
        }
    } catch (err) {
        globals.logger.error(`Failed removing key from ns/key list: ${err}`);
    }
}

function keyvIndexDeleteKey(namespace, key) {
    try {
        // Delete namespace/key pair from shadow list that keep tracks of what ns/keys exist.
        const nsExistingIndex = keyvIndex.findIndex((ns) => ns.namespace === namespace);
        if (nsExistingIndex === -1) {
            // Namespace doesn't exist, nothing to do.
        } else {
            // Namespace exists
            // Delete key if it exists
            const keyExistingIndex = keyvIndex[nsExistingIndex].keys.findIndex(
                (x) => x.key === key
            );
            if (keyExistingIndex === -1) {
                // Key does not exist. Nothing to do.
            } else {
                // Key exists, delete it.
                const tmpKeysArray = keyvIndex[nsExistingIndex].keys.filter((x) => x.key !== key);
                keyvIndex[nsExistingIndex].keys = tmpKeysArray;
            }
        }
    } catch (err) {
        globals.logger.error(`Failed removing key from ns/key list: ${err}`);
    }
}

function keyvIndexDeleteNamespace(namespace) {
    try {
        // Delete namespace/key pair from shadow list that keep tracks of what ns/keys exist.
        const tmpNamespaceArray = keyvIndex.filter((x) => x.namespace !== namespace);
        keyvIndex = tmpNamespaceArray;
    } catch (err) {
        globals.logger.error(`Failed removing namespace from ns/key list: ${err}`);
    }
}

/**
 * Set up timer that periodically syncs shadow namespace/key with the master one
 *
 * 1. Loop over all namespaces in keyvIndex
 *    1. Find the current namespace in keyv
 *    2. If it doesn't exist, removed it from keyvIndex
 *    3. If it exists, loop over all keys in keyvIndex.namespace
 *       1. Create empty temp key array
 *       2. Test if the key in keyvIndex exists in keyv.
 *       3. If it does exist, add it to the temp key array
 *       4. If it doesn't exist, don't add the key to temp key array
 */
setInterval(async () => {
    try {
        const tmpNamespaceArray = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const ns of keyvIndex) {
            // Does namespace exist in master keyv?
            const nsIndex = keyv.findIndex((item) => item.namespace === ns.namespace);
            if (nsIndex === -1) {
                // Namespace in keyvIndex was not found in keyv. Don't add it to the new temp array
            } else {
                // Namespace in keyvIndex exists in keyv. Check its keys
                const tmpKeyArray = [];
                // eslint-disable-next-line no-restricted-syntax
                for (const key of ns.keys) {
                    // Does this key exist in keyv?
                    // eslint-disable-next-line no-await-in-loop
                    const existsInKeyv = await keyv[nsIndex].keyv.get(key.key);
                    if (existsInKeyv === undefined) {
                        // Key from keyvIndex does NOT exist in keyv. Don't add it to temp array. Could be a keyv record that has TTL:ed.
                    } else {
                        // Key from keyvIndex DOES exist in keyv. Add it to the temp array
                        tmpKeyArray.push(key);
                    }
                }
                // Add all keys that should be kept to the namespace
                tmpNamespaceArray.push({ namespace: ns.namespace, keys: tmpKeyArray });
            }
        }

        keyvIndex = tmpNamespaceArray;
        globals.logger.silly(`New array: ${JSON.stringify(keyvIndex, null, 2)}`);
    } catch (err) {
        globals.logger.error(`Error while syncing keyv with keyvIndex: ${err}`);
    }
}, 300000); // Every 5 minutes

/**
 *
 * @param {*} kvData
 */

async function addKeyValuePair(newNamespace, newKey, newValue, newTtl) {
    try {
        // Does namespace already exist?
        const kv = keyv.find((item) => item.namespace === newNamespace);

        let ttl = 0;
        if (newTtl !== undefined) {
            // TTL parameter available, use it
            ttl = parseInt(newTtl, 10);
        }

        if (kv === undefined) {
            // New namespace. Create keyv object.
            let maxKeys = 1000;
            if (globals.config.has('Butler.keyValueStore.maxKeysPerNamespace')) {
                maxKeys = parseInt(
                    globals.config.get('Butler.keyValueStore.maxKeysPerNamespace'),
                    10
                );
            }

            const newKeyvObj = new Keyv(null, { namespace: newNamespace, maxSize: maxKeys });
            let hasTTL;

            if (ttl > 0) {
                await newKeyvObj.set(newKey, newValue, ttl);
                hasTTL = true;
            } else {
                await newKeyvObj.set(newKey, newValue);
                hasTTL = false;
            }

            keyv.push({
                keyv: newKeyvObj,
                namespace: newNamespace,
                ttl,
            });

            keyvIndexAddKey(newNamespace, newKey, hasTTL);
        } else {
            // Namespace already exists
            kv.ttl = ttl;
            let hasTTL;

            if (ttl > 0) {
                await kv.keyv.set(newKey, newValue, ttl);
                hasTTL = true;
            } else {
                await kv.keyv.set(newKey, newValue);
                hasTTL = false;
            }

            keyvIndexAddKey(kv.namespace, newKey, hasTTL);
        }

        // console.log(`keyvIndex: ${JSON.stringify(keyvIndex, null, 2)}`);
    } catch (err) {
        globals.logger.error(`Error while adding new KV pair: ${err}`);
    }
}

module.exports = {
    keyv,
    keyvIndex,
    keyvIndexAddKey,
    keyvIndexDeleteKey,
    keyvIndexDeleteNamespace,
    addKeyValuePair,
};
