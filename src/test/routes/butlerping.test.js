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

/**
 * D1
 * Ping Butler, get response
 */
describe('D1: GET /v4/butlerping', () => {
    test('It should respond with 200 to the GET method', async () => {
        result = await instance.get('/v4/butlerping', {});

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.response).toBeTruthy();
        expect(result.data.response).toEqual('Butler reporting for duty');

        expect(result.data.butlerVersion).toBeTruthy();
        // eslint-disable-next-line global-require
        expect(result.data.butlerVersion).toEqual(require('../../package.json').version);
    });
});
