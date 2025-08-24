import { jest } from '@jest/globals';

let Fastify;
let kvPlugin;

// In-memory KV mocks
const namespaces = new Set(['ns1', 'ns2']);
const data = new Map([
    ['ns1', new Map([['k1', 'v1']])],
    ['ns2', new Map()],
]);

const mockKVLib = {
    getNamespaceList: jest.fn(() => Array.from(namespaces)),
    getNamespace: jest.fn((ns) => {
        if (!namespaces.has(ns)) return undefined;
        const map = data.get(ns);
        return {
            keyv: {
                iterator: () => map.entries(),
            },
        };
    }),
    deleteNamespace: jest.fn(async (ns) => {
        namespaces.delete(ns);
        data.delete(ns);
        return true;
    }),
    addKeyValuePair: jest.fn(async (ns, key, value, ttl) => {
        if (!namespaces.has(ns)) {
            namespaces.add(ns);
            data.set(ns, new Map());
        }
        data.get(ns).set(key, value);
        return true;
    }),
    deleteKeyValuePair: jest.fn(async (ns, key) => {
        if (!namespaces.has(ns)) return false;
        if (!data.get(ns).has(key)) return false;
        data.get(ns).delete(key);
        return true;
    }),
    getValue: jest.fn(async (ns, key) => (namespaces.has(ns) ? data.get(ns).get(key) : undefined)),
};

const mockGlobals = {
    config: {
        has: jest.fn((key) => key === 'Butler.restServerEndpointsEnable.keyValueStore'),
        get: jest.fn((key) => (key === 'Butler.restServerEndpointsEnable.keyValueStore' ? true : undefined)),
    },
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
};

describe('REST: key value store routes', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('../../../lib/key_value_store.js', () => mockKVLib);
        Fastify = (await import('fastify')).default;
        kvPlugin = (await import('../key_value_store.js')).default;

        app = Fastify({ logger: false });
        await app.register(kvPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('GET /v4/keyvaluesnamespaces returns namespaces', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/keyvaluesnamespaces' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual(['ns1', 'ns2']);
    });

    test('GET value in namespace works and errors when missing', async () => {
        // success
        const res1 = await app.inject({ method: 'GET', url: '/v4/keyvalues/ns1?key=k1' });
        expect(res1.statusCode).toBe(200);
        expect(res1.json()).toEqual({ namespace: 'ns1', key: 'k1', value: 'v1' });
        // missing key param
        const res2 = await app.inject({ method: 'GET', url: '/v4/keyvalues/ns1' });
        expect(res2.statusCode).toBe(400);
        // namespace not found
        const res3 = await app.inject({ method: 'GET', url: '/v4/keyvalues/nope?key=x' });
        expect(res3.statusCode).toBe(400);
        // key not found
        const res4 = await app.inject({ method: 'GET', url: '/v4/keyvalues/ns1?key=nope' });
        expect(res4.statusCode).toBe(400);
    });

    test('GET keyexists returns presence and value when found', async () => {
        const res1 = await app.inject({ method: 'GET', url: '/v4/keyvalues/ns1/keyexists?key=k1' });
        expect(res1.statusCode).toBe(200);
        expect(res1.json()).toEqual({ keyExists: true, keyValue: { namespace: 'ns1', key: 'k1', value: 'v1' } });
        const res2 = await app.inject({ method: 'GET', url: '/v4/keyvalues/ns1/keyexists?key=nope' });
        expect(res2.statusCode).toBe(200);
        expect(res2.json()).toEqual({ keyExists: false, keyValue: {} });
    });

    test('POST adds a key and returns 201', async () => {
        const res = await app.inject({ method: 'POST', url: '/v4/keyvalues/ns3', payload: { key: 'kX', value: 'vX', ttl: 42 } });
        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual({ namespace: 'ns3', key: 'kX', value: 'vX', ttl: 42 });
        expect(mockKVLib.addKeyValuePair).toHaveBeenCalledWith('ns3', 'kX', 'vX', 42);
    });

    test('POST with missing key returns 400', async () => {
        const res = await app.inject({ method: 'POST', url: '/v4/keyvalues/ns3', payload: { value: 'vX' } });
        expect(res.statusCode).toBe(400);
    });

    test('DELETE key returns 204 when removed and 400 when missing', async () => {
        const res1 = await app.inject({ method: 'DELETE', url: '/v4/keyvalues/ns1/k1' });
        expect(res1.statusCode).toBe(204);
        const res2 = await app.inject({ method: 'DELETE', url: '/v4/keyvalues/ns1/nope' });
        expect(res2.statusCode).toBe(400);
        const res3 = await app.inject({ method: 'DELETE', url: '/v4/keyvalues/nope/k1' });
        expect(res3.statusCode).toBe(400);
    });

    test('DELETE namespace returns 204 when found and 400 when missing', async () => {
        const res1 = await app.inject({ method: 'DELETE', url: '/v4/keyvalues/ns2' });
        expect(res1.statusCode).toBe(204);
        const res2 = await app.inject({ method: 'DELETE', url: '/v4/keyvalues/nope' });
        expect(res2.statusCode).toBe(400);
    });

    test('GET keylist returns namespace and keys', async () => {
        // Prepare ns4 with keys
        namespaces.add('ns4');
        data.set(
            'ns4',
            new Map([
                ['a', '1'],
                ['b', '2'],
            ]),
        );
        const res = await app.inject({ method: 'GET', url: '/v4/keylist/ns4' });
        expect(res.statusCode).toBe(200);
        const parsed = JSON.parse(res.body);
        expect(parsed.namespace).toBe('ns4');
        expect(parsed.keys).toEqual([{ key: 'a' }, { key: 'b' }]);
    });

    test('GET keyexists missing key query returns 400; keylist missing/unknown namespace returns 400', async () => {
        const res1 = await app.inject({ method: 'GET', url: '/v4/keyvalues/ns1/keyexists' });
        expect(res1.statusCode).toBe(400);
        const res2 = await app.inject({ method: 'GET', url: '/v4/keylist/nope' });
        expect(res2.statusCode).toBe(400);
    });
});
