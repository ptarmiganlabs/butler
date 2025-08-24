import { jest } from '@jest/globals';

describe('lib/key_value_store', () => {
    let getNamespaceList;
    let getNamespace;
    let deleteNamespace;
    let getValue;
    let deleteKeyValuePair;
    let addKeyValuePair;

    const instances = new Map();

    class MockKeyv {
        constructor(opts = {}) {
            this.namespace = opts.namespace;
            this.maxSize = opts.maxSize;
            this._store = new Map();
            instances.set(this.namespace, this);
        }

        async set(key, value) {
            this._store.set(key, value);
            return true;
        }

        async get(key) {
            return this._store.get(key);
        }

        async delete(key) {
            return this._store.delete(key);
        }

        async clear() {
            this._store.clear();
        }
    }

    const mockGlobals = {
        config: {
            has: jest.fn((k) => k === 'Butler.keyValueStore.maxKeysPerNamespace'),
            get: jest.fn((k) => {
                const map = {
                    'Butler.keyValueStore.maxKeysPerNamespace': '123',
                };
                return map[k];
            }),
        },
        logger: {
            error: jest.fn(),
        },
    };

    const loadModule = async () => {
        jest.resetModules();
        await jest.unstable_mockModule('@keyvhq/core', () => ({ default: MockKeyv }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        const mod = await import('../key_value_store.js');
        ({ getNamespaceList, getNamespace, deleteNamespace, getValue, deleteKeyValuePair, addKeyValuePair } = mod);
    };

    beforeEach(async () => {
        instances.clear();
        jest.clearAllMocks();
        await loadModule();
    });

    test('creates namespace on first set and retrieves values', async () => {
        await addKeyValuePair('ns1', 'k1', 'v1');
        expect(getNamespaceList()).toEqual(['ns1']);
        await addKeyValuePair('ns1', 'k2', 'v2');
        expect(getNamespaceList()).toEqual(['ns1']);
        await addKeyValuePair('ns2', 'k9', 'v9');
        expect(getNamespaceList().sort()).toEqual(['ns1', 'ns2']);

        await expect(getValue('ns1', 'k1')).resolves.toBe('v1');
        await expect(getValue('ns1', 'k2')).resolves.toBe('v2');
        await expect(getValue('ns2', 'k9')).resolves.toBe('v9');

        // maxKeys taken from config
        expect(instances.get('ns1').maxSize).toBe(123);
    });

    test('supports TTL branch and non-TTL branch', async () => {
        await addKeyValuePair('ttlNS', 'k', 'v', 5000);
        await expect(getValue('ttlNS', 'k')).resolves.toBe('v');

        await addKeyValuePair('noTtlNS', 'k', 'v');
        await expect(getValue('noTtlNS', 'k')).resolves.toBe('v');
    });

    test('delete key and namespace', async () => {
        await addKeyValuePair('nsDel', 'k1', 'v1');
        await addKeyValuePair('nsDel', 'k2', 'v2');

        await expect(deleteKeyValuePair('nsDel', 'k1')).resolves.toBe(true);
        await expect(getValue('nsDel', 'k1')).resolves.toBeUndefined();

        // delete namespace triggers clear and removes it from list
        const clearSpy = jest.spyOn(instances.get('nsDel'), 'clear');
        await deleteNamespace('nsDel');
        expect(clearSpy).toHaveBeenCalled();
        expect(getNamespaceList()).not.toContain('nsDel');
    });

    test('error paths: namespace not found and thrown errors are handled', async () => {
        // getValue returns null when namespace missing
        await expect(getValue('missing', 'k')).resolves.toBeNull();

        // prepare a namespace and force its keyv.get to throw
        await addKeyValuePair('errNS', 'k', 'v');
        const ns = getNamespace('errNS');
        ns.keyv.get = () => {
            throw new Error('boom');
        };
        await expect(getValue('errNS', 'k')).resolves.toBe(false);
        expect(mockGlobals.logger.error).toHaveBeenCalled();

        // deleteKeyValuePair: missing namespace returns null
        await expect(deleteKeyValuePair('missing', 'k')).resolves.toBeNull();

        // deleteKeyValuePair: delete throws -> false
        ns.keyv.delete = () => {
            throw new Error('boom-del');
        };
        await expect(deleteKeyValuePair('errNS', 'k')).resolves.toBe(false);
        expect(mockGlobals.logger.error).toHaveBeenCalled();

        // deleteNamespace: deleting missing namespace triggers catch
        await deleteNamespace('nope');
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });
});
