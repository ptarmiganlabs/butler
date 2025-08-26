import apiPutSlackPostMessage from '../slack_post_message.js';

describe('slack_post_message API schemas', () => {
    describe('apiPutSlackPostMessage', () => {
        test('should export a valid schema object', () => {
            expect(apiPutSlackPostMessage).toBeDefined();
            expect(typeof apiPutSlackPostMessage).toBe('object');
            expect(apiPutSlackPostMessage.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiPutSlackPostMessage;

            expect(schema.summary).toBe('Send message to Slack.');
            expect(schema.description).toBe('Sends a basic message to Slack.');
        });

        test('should have valid request body schema', () => {
            const { body } = apiPutSlackPostMessage.schema;

            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
            expect(body.required).toEqual(['channel', 'from_user', 'msg']);
        });

        test('should have channel property with correct format', () => {
            const channel = apiPutSlackPostMessage.schema.body.properties.channel;

            expect(channel).toBeDefined();
            expect(channel.type).toBe('string');
            expect(channel.description).toContain('Prefix channel name with #');
            expect(channel.examples).toEqual(['#reload-notification']);
        });

        test('should have from_user property for sender name', () => {
            const fromUser = apiPutSlackPostMessage.schema.body.properties.from_user;

            expect(fromUser).toBeDefined();
            expect(fromUser.type).toBe('string');
            expect(fromUser.description).toContain('Name of sending user');
            expect(fromUser.examples).toEqual(['Butler the Bot']);
        });

        test('should have msg property for message content', () => {
            const msg = apiPutSlackPostMessage.schema.body.properties.msg;

            expect(msg).toBeDefined();
            expect(msg.type).toBe('string');
            expect(msg.description).toContain('Text going into the Slack message');
            expect(msg.examples).toEqual(['This is a message from Qlik Sense']);
        });

        test('should have optional emoji property', () => {
            const emoji = apiPutSlackPostMessage.schema.body.properties.emoji;

            expect(emoji).toBeDefined();
            expect(emoji.type).toBe('string');
            expect(emoji.description).toContain('Emoji to shown next to Slack message');
            expect(emoji.examples).toEqual(['thumbsup']);

            // Should not be in required fields
            expect(apiPutSlackPostMessage.schema.body.required).not.toContain('emoji');
        });

        test('should have valid response schemas', () => {
            const { response } = apiPutSlackPostMessage.schema;

            expect(response).toBeDefined();
            expect(response[201]).toBeDefined();
        });

        test('should have valid 201 success response', () => {
            const response201 = apiPutSlackPostMessage.schema.response[201];

            expect(response201.description).toBe('Message successfully sent to Slack.');
            expect(response201.type).toBe('object');
            expect(response201.properties).toBeDefined();
        });

        test('should mirror request properties in response', () => {
            const requestBody = apiPutSlackPostMessage.schema.body.properties;
            const responseBody = apiPutSlackPostMessage.schema.response[201].properties;

            // All required request fields should be in response
            ['channel', 'from_user', 'msg'].forEach((field) => {
                expect(responseBody[field]).toBeDefined();
                expect(responseBody[field].type).toBe(requestBody[field].type);
                expect(responseBody[field].examples).toEqual(requestBody[field].examples);
            });
        });

        test('should have all required fields as string type', () => {
            const body = apiPutSlackPostMessage.schema.body;

            body.required.forEach((field) => {
                expect(body.properties[field]).toBeDefined();
                expect(body.properties[field].type).toBe('string');
                expect(body.properties[field].examples).toBeDefined();
                expect(body.properties[field].examples).toHaveLength(1);
            });
        });

        test('should be JSON serializable', () => {
            expect(() => JSON.stringify(apiPutSlackPostMessage)).not.toThrow();

            const serialized = JSON.stringify(apiPutSlackPostMessage);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toEqual(apiPutSlackPostMessage);
        });

        test('should have appropriate number of required fields', () => {
            const required = apiPutSlackPostMessage.schema.body.required;

            expect(required).toHaveLength(3);
            expect(required).toContain('channel');
            expect(required).toContain('from_user');
            expect(required).toContain('msg');
        });

        test('should have descriptive examples for Slack context', () => {
            const props = apiPutSlackPostMessage.schema.body.properties;

            // Channel should start with #
            expect(props.channel.examples[0]).toMatch(/^#/);

            // From user should suggest bot context
            expect(props.from_user.examples[0]).toContain('Bot');

            // Message should mention Qlik Sense
            expect(props.msg.examples[0]).toContain('Qlik Sense');

            // Emoji should be a valid emoji name
            expect(props.emoji.examples[0]).toBe('thumbsup');
        });
    });
});
