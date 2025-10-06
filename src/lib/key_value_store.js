import Keyv from '@keyvhq/core';

// Load global variables and functions
import globals from '../globals.js';

// Main key-value store
let kvStore = [];

/**
 * Get the list of namespaces in the key-value store.
 * @returns {Array} - An array of namespace names.
 */
export function getNamespaceList() {
    const ns = [];
    kvStore.forEach((item) => ns.push(item.namespace));
    return ns;
}

/**
 * Get a specific namespace from the key-value store.
 * @param {string} namespaceName - The name of the namespace to retrieve.
 * @returns {Object} - The namespace object.
 */
export function getNamespace(namespaceName) {
    const ns = kvStore.find((item) => item.namespace === namespaceName);
    return ns;
}

/**
 * Delete a specific namespace from the key-value store.
 * @param {string} namespaceName - The name of the namespace to delete.
 */
export async function deleteNamespace(namespaceName) {
    try {
        // Remove all KV pairs from namespace
        const ns = kvStore.find((item) => item.namespace === namespaceName);
        await ns.keyv.clear();

        // Delete namespace
        const tmpNamespaceArray = kvStore.filter((x) => x.namespace !== namespaceName);
        kvStore = tmpNamespaceArray;
    } catch (err) {
        globals.logger.error(`Failed removing namespace from keyv: ${globals.getErrorMessage(err)}`);
    }
}

/**
 * Get the value of a specific key in a namespace.
 * @param {string} namespace - The namespace containing the key.
 * @param {string} key - The key to retrieve the value for.
 * @returns {Promise<*>} - The value of the key, or null if the namespace does not exist.
 */
export async function getValue(namespace, key) {
    try {
        const ns = getNamespace(namespace);
        if (ns !== undefined) {
            return ns.keyv.get(key);
        }

        return null;
    } catch (err) {
        globals.logger.error(`Error getting value for KV pair: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Delete a specific key-value pair from a namespace.
 * @param {string} namespace - The namespace containing the key-value pair.
 * @param {string} key - The key to delete.
 * @returns {Promise<boolean>} - True if the key was deleted, false otherwise.
 */
export async function deleteKeyValuePair(namespace, key) {
    try {
        const ns = getNamespace(namespace);
        if (ns !== undefined) {
            return ns.keyv.delete(key);
        }

        return null;
    } catch (err) {
        globals.logger.error(`Error deleting KV pair: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Add a new key-value pair to a namespace.
 * @param {string} newNamespace - The namespace to add the key-value pair to.
 * @param {string} newKey - The key to add.
 * @param {*} newValue - The value to add.
 * @param {number} [newTtl] - The time-to-live for the key-value pair, in milliseconds.
 */
export async function addKeyValuePair(newNamespace, newKey, newValue, newTtl) {
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
            if (ttl > 0) {
                await kv.keyv.set(newKey, newValue, ttl);
                // hasTTL = true;
            } else {
                await kv.keyv.set(newKey, newValue);
                // hasTTL = false;
            }
        }
    } catch (err) {
        globals.logger.error(`Error while adding new KV pair: ${globals.getErrorMessage(err)}`);
    }
}
