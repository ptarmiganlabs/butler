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

beforeAll(async () => {
    //
});

afterAll(async () => {
    //
});

/**
 * Get array of all apps on Sense server
 */
describe('GET /v4/apps/list', () => {
    test('It should respond with 200 when app list is retrieved', async () => {
        result = await instance.get(`/v4/apps/list`);

        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });
});
