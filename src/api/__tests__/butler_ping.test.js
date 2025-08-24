import apiGetButlerPing from '../butler_ping.js';

describe('butler_ping API schema', () => {
    test('should export a valid schema object', () => {
        expect(apiGetButlerPing).toBeDefined();
        expect(typeof apiGetButlerPing).toBe('object');
        expect(apiGetButlerPing.schema).toBeDefined();
    });

    test('should have correct schema structure', () => {
        const { schema } = apiGetButlerPing;
        
        expect(schema.description).toBe('Tests if Butler is alive and responding');
        expect(schema.summary).toBe('Tests if Butler is alive and responding');
        expect(schema.response).toBeDefined();
        expect(typeof schema.response).toBe('object');
    });

    test('should have valid 200 response schema', () => {
        const response200 = apiGetButlerPing.schema.response[200];
        
        expect(response200).toBeDefined();
        expect(response200.description).toBe('Butler is alive and well.');
        expect(response200.type).toBe('object');
        expect(response200.properties).toBeDefined();
        
        // Check response properties
        expect(response200.properties.response).toBeDefined();
        expect(response200.properties.response.type).toBe('string');
        expect(response200.properties.response.example).toBe('Butler reporting for duty');
        
        expect(response200.properties.butlerVersion).toBeDefined();
        expect(response200.properties.butlerVersion.type).toBe('string');
        expect(response200.properties.butlerVersion.example).toBe('5.5.0');
    });

    test('should have valid 500 error response schema', () => {
        const response500 = apiGetButlerPing.schema.response[500];
        
        expect(response500).toBeDefined();
        expect(response500.description).toBe('Internal error.');
        expect(response500.type).toBe('object');
        expect(response500.properties).toBeDefined();
        
        // Check error properties
        const requiredErrorProps = ['statusCode', 'code', 'error', 'message', 'time'];
        requiredErrorProps.forEach(prop => {
            expect(response500.properties[prop]).toBeDefined();
            expect(response500.properties[prop].type).toBeDefined();
        });
        
        expect(response500.properties.statusCode.type).toBe('number');
        expect(response500.properties.code.type).toBe('string');
        expect(response500.properties.error.type).toBe('string');
        expect(response500.properties.message.type).toBe('string');
        expect(response500.properties.time.type).toBe('string');
    });

    test('should only have 200 and 500 response codes defined', () => {
        const responseKeys = Object.keys(apiGetButlerPing.schema.response);
        expect(responseKeys).toEqual(['200', '500']);
    });

    test('should be a JSON serializable object', () => {
        expect(() => JSON.stringify(apiGetButlerPing)).not.toThrow();
        
        const serialized = JSON.stringify(apiGetButlerPing);
        const deserialized = JSON.parse(serialized);
        expect(deserialized).toEqual(apiGetButlerPing);
    });
});