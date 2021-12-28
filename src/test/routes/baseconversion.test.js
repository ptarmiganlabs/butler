/* eslint-disable camelcase */
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
let base16_1;
let base62_1;

beforeAll(async () => {
    base16_1 = '3199af08bfeeaf5d420f27ed9c01e74370077';
    base62_1 = '6DMW88LpSok9Z7P7hUK0wv7bF';
});

afterAll(async () => {
    //
});

/**
 * C1
 */
describe('C1: GET /v4/base16tobase62', () => {
    test('It should convert from base16 to base62', async () => {
        result = await instance.get('/v4/base16tobase62', {
            params: {
                base16: base16_1,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should be base62 encoded result', () => {
        expect(result.data.base16).toEqual(base16_1);
        expect(result.data.base62).toEqual(base62_1);
    });
});

/**
 * C2
 */
describe('C2: GET /v4/base62tobase16', () => {
    test('It should convert from base62 to base16', async () => {
        result = await instance.get('/v4/base62tobase16', {
            params: {
                base62: base62_1,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should be base16 encoded result', () => {
        expect(result.data.base16).toEqual(base16_1);
        expect(result.data.base62).toEqual(base62_1);
    });
});
