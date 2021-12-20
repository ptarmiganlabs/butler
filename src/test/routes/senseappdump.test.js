const axios = require('axios');
const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve('./config/');
process.env.NODE_ENV = 'production';
const config = require('config');

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 15000,
});

let result;
let appId1;

beforeAll(async () => {
    appId1 = 'c1e27bf7-56ae-45b9-87a6-cdfab255b269';
});

afterAll(async () => {
    //
});

/**
 * Serialize Sense app to JSON
 */
describe('GET /v4/app/:appId/dump', () => {
    test('It should respond with 200 when app is successfully serialized to JSON', async () => {
        result = await instance.get(`/v4/app/${appId1}/dump`);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('properties');
        expect(result.data).toHaveProperty('loadScript');
        expect(result.data).toHaveProperty('sheets');
        expect(result.data).toHaveProperty('stories');
        expect(result.data).toHaveProperty('masterobjects');
        expect(result.data).toHaveProperty('appprops');
        expect(result.data).toHaveProperty('dataconnections');
        expect(result.data).toHaveProperty('snapshots');
        expect(result.data).toHaveProperty('fields');
        expect(result.data).toHaveProperty('bookmarks');
        expect(result.data).toHaveProperty('dimensions');
        expect(result.data).toHaveProperty('measures');
        expect(result.data).toHaveProperty('variables');
        expect(result.data).toHaveProperty('embeddedmedia');
    });
});
