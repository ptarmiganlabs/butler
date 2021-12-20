/* eslint-disable camelcase */
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

let slackChannel;
let slackMsg;
let slackEmoji;
let slackFromUser;

beforeAll(async () => {
    slackChannel = '#general';
    slackMsg = 'CI testing of message from Butler REST API';
    slackEmoji = 'ghost';
    slackFromUser = 'Butler the TEST bot';
});

afterAll(async () => {
    //
});

/**
 * Post message to Slack
 */
describe('PUT /v4/slackpostmessage', () => {
    test('It should respond with 201 when posting message to Slack', async () => {
        result = await instance.put(`/v4/slackpostmessage`, {
            channel: slackChannel,
            from_user: slackFromUser,
            msg: slackMsg,
            emoji: slackEmoji,
        });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('channel');
        expect(result.data).toHaveProperty('from_user');
        expect(result.data).toHaveProperty('msg');
        expect(result.data).toHaveProperty('emoji');

        expect(result.data.channel).toEqual(slackChannel);
        expect(result.data.from_user).toEqual(slackFromUser);
        expect(result.data.msg).toEqual(slackMsg);
        expect(result.data.emoji).toEqual(slackEmoji);
    });
});
