import apiPutMqttMessage from '../mqtt_publish_message.js';

describe('mqtt_publish_message API schemas', () => {
    describe('apiPutMqttMessage', () => {
        test('should export a valid schema object', () => {
            expect(apiPutMqttMessage).toBeDefined();
            expect(typeof apiPutMqttMessage).toBe('object');
            expect(apiPutMqttMessage.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiPutMqttMessage;
            
            expect(schema.summary).toBe('Publish a message to a MQTT topic.');
            expect(schema.description).toBe('');
        });

        test('should have valid request body schema', () => {
            const { body } = apiPutMqttMessage.schema;
            
            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
            expect(body.required).toEqual(['topic', 'message']);
        });

        test('should have topic property with MQTT path example', () => {
            const topic = apiPutMqttMessage.schema.body.properties.topic;
            
            expect(topic).toBeDefined();
            expect(topic.type).toBe('string');
            expect(topic.description).toContain('Topic to which message should be published');
            expect(topic.examples).toEqual(['qliksense/new_data_notification/sales']);
        });

        test('should have message property with flexible content', () => {
            const message = apiPutMqttMessage.schema.body.properties.message;
            
            expect(message).toBeDefined();
            expect(message.type).toBe('string');
            expect(message.description).toContain('generic text string');
            expect(message.description).toContain('JSON, key-value pairs, plain text');
            expect(message.examples).toEqual(['dt=20201028']);
        });

        test('should have valid response schema', () => {
            const { response } = apiPutMqttMessage.schema;
            
            expect(response).toBeDefined();
            expect(response[201]).toBeDefined();
        });

        test('should have valid 201 success response', () => {
            const response201 = apiPutMqttMessage.schema.response[201];
            
            expect(response201.description).toBe('MQTT message successfully published.');
            expect(response201.type).toBe('object');
            expect(response201.properties).toBeDefined();
            
            expect(response201.properties.topic).toBeDefined();
            expect(response201.properties.topic.type).toBe('string');
            expect(response201.properties.topic.example).toBe('qliksense/new_data_notification/sales');
            
            expect(response201.properties.message).toBeDefined();
            expect(response201.properties.message.type).toBe('string');
            expect(response201.properties.message.example).toBe('dt=20201028');
        });

        test('should mirror request properties in response', () => {
            const requestBody = apiPutMqttMessage.schema.body.properties;
            const responseBody = apiPutMqttMessage.schema.response[201].properties;
            
            // Both topic and message should be in response
            expect(responseBody.topic).toBeDefined();
            expect(responseBody.message).toBeDefined();
            
            // Types should match
            expect(responseBody.topic.type).toBe(requestBody.topic.type);
            expect(responseBody.message.type).toBe(requestBody.message.type);
        });

        test('should require both topic and message', () => {
            const required = apiPutMqttMessage.schema.body.required;
            
            expect(required).toHaveLength(2);
            expect(required).toContain('topic');
            expect(required).toContain('message');
        });

        test('should be JSON serializable', () => {
            expect(() => JSON.stringify(apiPutMqttMessage)).not.toThrow();
            
            const serialized = JSON.stringify(apiPutMqttMessage);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toEqual(apiPutMqttMessage);
        });

        test('should have MQTT-appropriate examples', () => {
            const props = apiPutMqttMessage.schema.body.properties;
            
            // Topic should follow MQTT topic conventions (letters, numbers, underscores, slashes)
            expect(props.topic.examples[0]).toMatch(/^[a-z0-9_/]+$/);
            expect(props.topic.examples[0]).toContain('/');
            
            // Message should be a simple key-value example
            expect(props.message.examples[0]).toMatch(/^[a-z0-9=]+$/);
        });

        test('should handle empty description gracefully', () => {
            const { schema } = apiPutMqttMessage;
            
            expect(schema.description).toBe('');
            expect(typeof schema.description).toBe('string');
        });
    });
});