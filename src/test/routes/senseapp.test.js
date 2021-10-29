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

let appId1;
let appPartialReload1;
let appReloadMode1;
let appStartTaskSuccess;
let appStartTaskFailure;

beforeAll(async () => {
    appId1 = 'c1e27bf7-56ae-45b9-87a6-cdfab255b269';
    appPartialReload1 = true;
    appReloadMode1 = 0;
    appStartTaskSuccess = ['e3b27f50-b1c0-4879-88fc-c7cdd9c1cf3e', '7552d9fc-d1bb-4975-9a38-18357de531ea'];
    appStartTaskFailure = ['fb0f317d-da91-4b86-aafa-0174ae1e8c8f', 'fa93345c-f7a3-4f43-ab24-4da4245e16e8'];
});

afterAll(async () => {
    //
});

/**
 * Reload app without using a task
 */
describe('PUT /v4/app/:appId/reload', () => {
    test('It should respond with 201 when app is successfully reloaded', async () => {
        result = await instance.put(`/v4/app/${appId1}/reload`, {
            reloadMode: appReloadMode1,
            partialReload: appPartialReload1,
            startQSEoWTaskOnSuccess: appStartTaskSuccess,
            startQSEoWTaskOnFailure: appStartTaskFailure,
        });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.appId).toBeTruthy();
        expect(result.data.appId).toBe(appId1);
    });
});
