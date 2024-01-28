import config from 'config';
import axios from 'axios';

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 15000,
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
    // Task IDs to be started after successful reload
    appStartTaskSuccess = ['25732e8f-a96f-44c0-ba81-7407a2ef4c8a', '62a91752-0340-4db4-ab1f-4df4e671ea60'];
    appStartTaskFailure = ['4788dc51-2bf6-45f0-a4ad-8bd8d40e1d3f', 'd2902674-6bde-4d64-86c0-2e5d3a0c08f2'];
});

afterAll(async () => {
    //
});

/**
 * I1
 * Reload app without using a task
 */
describe('I1: PUT /v4/app/:appId/reload', () => {
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

/**
 * I2
 * Serialize Sense app to JSON
 */
describe('I2: GET /v4/app/:appId/dump', () => {
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

/**
 * I3
 * Get array of all apps on Sense server
 */
describe('I3: GET /v4/apps/list', () => {
    test('It should respond with 200 when app list is retrieved', async () => {
        result = await instance.get(`/v4/apps/list`);

        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });
});
