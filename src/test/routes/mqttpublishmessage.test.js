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

let mqttTopic;
let mqttMsg;

beforeAll(async () => {
    mqttTopic = 'butler-test/topic 123/subtopic 456/deepest topic 789';
    mqttMsg = "{value1: 'abc 123', value2: 'def åäö 456', value3: true}";
});

afterAll(async () => {
    //
});

/**
 * Send MQTT message
 */
describe('PUT /v4/mqttpublishmessage', () => {
    test('It should respond with 201 when MQTT message is successfully sent', async () => {
        result = await instance.put('/v4/mqttpublishmessage', { topic: mqttTopic, message: mqttMsg });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.topic).toBeTruthy();
        expect(result.data.message).toBeTruthy();
        expect(result.data.topic).toEqual(mqttTopic);
        expect(result.data.message).toEqual(mqttMsg);
    });
});
