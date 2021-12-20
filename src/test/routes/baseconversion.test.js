const axios = require('axios');
const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve('./config/');
process.env.NODE_ENV = 'production';
// console.log(process.env["NODE_CONFIG_DIR"])
const config = require('config');

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 15000,
});

let result;

/**
 *
 */
describe('GET /v4/base16tobase62', () => {
    test('It should convert from base16 to base62', async () => {
        result = await instance.get('/v4/base16tobase62', {
            params: {
                base16: '3199af08bfeeaf5d420f27ed9c01e74370077',
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should be base62 encoded result', () => {
        expect(result.data.base16).toEqual('3199af08bfeeaf5d420f27ed9c01e74370077');
        expect(result.data.base62).toEqual('6DMW88LpSok9Z7P7hUK0wv7bF');
    });
});

/**
 *
 */
describe('GET /v4/base62tobase16', () => {
    test('It should convert from base62 to base16', async () => {
        result = await instance.get('/v4/base62tobase16', {
            params: {
                base62: '6DMW88LpSok9Z7P7hUK0wv7bF',
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should be base16 encoded result', () => {
        expect(result.data.base16).toEqual('3199af08bfeeaf5d420f27ed9c01e74370077');
        expect(result.data.base62).toEqual('6DMW88LpSok9Z7P7hUK0wv7bF');
    });
});
