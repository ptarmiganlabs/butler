import apiPostNewRelicEvent from '../newrelic_event.js';

describe('newrelic_event API schemas', () => {
    describe('apiPostNewRelicEvent', () => {
        test('should export a valid schema object', () => {
            expect(apiPostNewRelicEvent).toBeDefined();
            expect(typeof apiPostNewRelicEvent).toBe('object');
            expect(apiPostNewRelicEvent.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiPostNewRelicEvent;
            
            expect(schema.summary).toBe('Post events to New Relic.');
            expect(schema.description).toBe('This endpoint posts events to the New Relic event API.');
        });

        test('should have valid request body schema', () => {
            const { body } = apiPostNewRelicEvent.schema;
            
            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
            expect(body.required).toEqual(['eventType']);
        });

        test('should have eventType property with correct constraints', () => {
            const eventType = apiPostNewRelicEvent.schema.body.properties.eventType;
            
            expect(eventType).toBeDefined();
            expect(eventType.type).toBe('string');
            expect(eventType.description).toContain('alphanumeric characters, _ underscores, and : colons');
            expect(eventType.examples).toEqual(['relead-failed']);
            expect(eventType.maxLength).toBe(254);
        });

        test('should have timestamp property with Unix time description', () => {
            const timestamp = apiPostNewRelicEvent.schema.body.properties.timestamp;
            
            expect(timestamp).toBeDefined();
            expect(timestamp.type).toBe('number');
            expect(timestamp.description).toContain('Unix time');
            expect(timestamp.description).toContain('UTC time zone');
            expect(timestamp.examples).toEqual([1642164296053]);
        });

        test('should have attributes array with proper structure', () => {
            const attributes = apiPostNewRelicEvent.schema.body.properties.attributes;
            
            expect(attributes).toBeDefined();
            expect(attributes.type).toBe('array');
            expect(attributes.description).toContain('Dimensions/attributs');
            expect(attributes.items).toBeDefined();
            expect(attributes.items.type).toBe('object');
            expect(attributes.items.properties).toBeDefined();
        });

        test('should have proper attribute item structure', () => {
            const attributeItem = apiPostNewRelicEvent.schema.body.properties.attributes.items;
            
            expect(attributeItem.properties.name).toBeDefined();
            expect(attributeItem.properties.name.type).toBe('string');
            expect(attributeItem.properties.name.maxLength).toBe(254);
            expect(attributeItem.properties.name.examples).toEqual(['host.name']);

            expect(attributeItem.properties.value).toBeDefined();
            expect(attributeItem.properties.value.type).toBe('string');
            expect(attributeItem.properties.value.maxLength).toBe(4096);
            expect(attributeItem.properties.value.examples).toEqual(['dev.server.com']);
        });

        test('should have valid response schemas', () => {
            const { response } = apiPostNewRelicEvent.schema;
            
            expect(response).toBeDefined();
            // Check if it has 202 response
            expect(response[202]).toBeDefined();
        });

        test('should have valid 202 success response', () => {
            const response202 = apiPostNewRelicEvent.schema.response[202];
            
            expect(response202.description).toBe('Data accepted and sent to New Relic.');
            expect(response202.type).toBe('object');
            expect(response202.properties).toBeDefined();
            
            expect(response202.properties.newRelicResultCode).toBeDefined();
            expect(response202.properties.newRelicResultCode.type).toBe('number');
            expect(response202.properties.newRelicResultCode.examples).toEqual(['202']);
            
            expect(response202.properties.newRelicResultText).toBeDefined();
            expect(response202.properties.newRelicResultText.type).toBe('string');
            expect(response202.properties.newRelicResultText.examples).toEqual(['Data accepted.']);
        });

        test('should be JSON serializable', () => {
            expect(() => JSON.stringify(apiPostNewRelicEvent)).not.toThrow();
            
            const serialized = JSON.stringify(apiPostNewRelicEvent);
            const deserialized = JSON.parse(serialized);
            expect(deserialized).toEqual(apiPostNewRelicEvent);
        });

        test('should validate required fields are minimal', () => {
            const required = apiPostNewRelicEvent.schema.body.required;
            
            expect(required).toHaveLength(1);
            expect(required).toContain('eventType');
        });

        test('should have consistent maxLength constraints', () => {
            const body = apiPostNewRelicEvent.schema.body;
            
            // Event type should have reasonable max length
            expect(body.properties.eventType.maxLength).toBe(254);
            
            // Attribute name should have same limit as event type
            expect(body.properties.attributes.items.properties.name.maxLength).toBe(254);
            
            // Attribute value should have larger limit
            expect(body.properties.attributes.items.properties.value.maxLength).toBe(4096);
        });
    });
});