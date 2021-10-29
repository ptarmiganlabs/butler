const axios = require('axios');
const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve('./config/');
process.env.NODE_ENV = 'production';
const config = require('config');

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 5000,
});

let result;

let expectedNamespace1;
let expectedNamespace2;
let expectedKey1;
let expectedKey2;
let expectedValue;

beforeAll(async () => {
    expectedNamespace1 = 'testns1';
    expectedNamespace2 = 'testns2';
    expectedKey1 = 'test key 1';
    expectedKey2 = 'test key 2';
    expectedValue = 'test value 1';
});

afterAll(async () => {
    //
});

/**
 * List currently available namespaces
 * First create a couple of KV pairs in different namespaces, then verify that list of namespaces contains one of the ones created.
 */
describe('GET /v4/keyvaluesnamespaces', () => {
    test('It should respond with 200 to the GET method', async () => {
        // Create new namespace and KV pair
        try {
            result = await instance.post(`/v4/keyvalues/${expectedNamespace1}`, {
                key: expectedKey1,
                value: expectedValue,
            });
            result = await instance.post(`/v4/keyvalues/${expectedNamespace2}`, {
                key: expectedKey1,
                value: expectedValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }

        result = await instance.get('/v4/keyvaluesnamespaces');

        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });

    test('Match even if received list of namespaces contains additional elements', () => {
        expect(result.data).toEqual(expect.arrayContaining([expectedNamespace1]));
    });
});

/**
 * Create new KV pair, verify it can be read out again.
 */
describe('GET /v4/keyvalues/:namespace', () => {
    test('It should respond with 201 when creating a KV pair', async () => {
        // Create new namespace and KV pair
        try {
            result = await instance.post(`/v4/keyvalues/${expectedNamespace1}`, {
                key: expectedKey1,
                value: expectedValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(201);
    });

    test('It should respond with 200 when reading KV pair', async () => {
        // Read KV pair that was just created
        try {
            result = await instance.get(`/v4/keyvalues/${expectedNamespace1}`, { params: { key: expectedKey1 } });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.namespace).toBeTruthy();
        expect(result.data.key).toBeTruthy();
        expect(result.data.value).toBeTruthy();
        expect(result.data.namespace).toEqual(expectedNamespace1);
        expect(result.data.key).toEqual(expectedKey1);
        expect(result.data.value).toEqual(expectedValue);
    });
});

/**
 * Check if a key exists in a particular namespace
 */
describe('GET /v4/keyvalues/:namespace/keyexists', () => {
    test('Create key, then verify it exists', async () => {
        // Create new namespace and KV pair
        try {
            result = await instance.post(`/v4/keyvalues/${expectedNamespace1}`, {
                key: expectedKey1,
                value: expectedValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(201);

        result = await instance.get(`/v4/keyvalues/${expectedNamespace1}/keyexists`, { params: { key: expectedKey1 } });
        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.keyExists).toBeTruthy();
        expect(result.data.keyValue.namespace).toBeTruthy();
        expect(result.data.keyValue.key).toBeTruthy();
        expect(result.data.keyValue.value).toBeTruthy();

        expect(result.data.keyExists).toEqual(true);
        expect(result.data.keyValue.namespace).toEqual(expectedNamespace1);
        expect(result.data.keyValue.key).toEqual(expectedKey1);
        expect(result.data.keyValue.value).toEqual(expectedValue);
    });

    // Test when key does not exist
    test('Create key, then test in that namespace on a key that does not exist', async () => {
        // Create new namespace and KV pair
        try {
            result = await instance.post(`/v4/keyvalues/${expectedNamespace1}`, {
                key: expectedKey1,
                value: expectedValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(201);

        result = await instance.get(`/v4/keyvalues/${expectedNamespace1}/keyexists`, { params: { key: expectedKey2 } });
        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.keyExists).toBeFalsy();
        expect(result.data.keyValue.namespace).toBeFalsy();
        expect(result.data.keyValue.key).toBeFalsy();
        expect(result.data.keyValue.value).toBeFalsy();
        expect(result.data.keyExists).toEqual(false);
    });
});

/**
 * Verify delete of KV pairs
 */
describe('DELETE /v4/keyvalues/:namespace/:key', () => {
    test('Create and delete KV pair', async () => {
        // Create new namespace and KV pair
        try {
            result = await instance.post(`/v4/keyvalues/${expectedNamespace1}`, {
                key: expectedKey1,
                value: expectedValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(201);

        result = await instance.delete(`/v4/keyvalues/${expectedNamespace1}/${expectedKey1}`);
        expect(result.status).toBe(204);
    });

    test('Response from delete operation should be empty', () => {
        expect(result.data).toEqual('');
    });

    test('Verify KV pair is gone', async () => {
        // Create new namespace and KV pair
        try {
            result = await instance.get(`/v4/keyvalues/${expectedNamespace1}/keyexists`, {
                params: { key: expectedKey1 },
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.keyExists).toBeFalsy();
        expect(result.data.keyExists).toEqual(false);
    });
});

/**
 * Verify delete of namespace
 */
describe('DELETE /v4/keyvalues/:namespace', () => {
    test('Create and delete KV pairs', async () => {
        try {
            result = await instance.post(`/v4/keyvalues/${expectedNamespace1}`, {
                key: expectedKey1,
                value: expectedValue,
            });
            result = await instance.post(`/v4/keyvalues/${expectedNamespace2}`, {
                key: expectedKey1,
                value: expectedValue,
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(201);
    });

    test('Verify KV pair exists', async () => {
        try {
            result = await instance.get(`/v4/keyvalues/${expectedNamespace1}/keyexists`, {
                params: { key: expectedKey1 },
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(200);
        expect(result.data.keyExists).toBeTruthy();
        expect(result.data.keyExists).toEqual(true);
    });

    test('Delete namespace', async () => {
        try {
            result = await instance.delete(`/v4/keyvalues/${expectedNamespace1}`);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(204);
    });

    test('Verify deleted namespace is gone', async () => {
        try {
            result = await instance.get('/v4/keyvaluesnamespaces');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }
        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });

    test('Make sure not deleted namespace is in array of existing namespaces', () => {
        expect(result.data).toEqual(expect.arrayContaining([expectedNamespace2]));
    });
});
