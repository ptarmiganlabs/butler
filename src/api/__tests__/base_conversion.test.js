import { apiGetBase62ToBase16, apiGetBase16ToBase62 } from '../base_conversion.js';

describe('base_conversion API schemas', () => {
    describe('apiGetBase62ToBase16', () => {
        test('should export a valid schema object', () => {
            expect(apiGetBase62ToBase16).toBeDefined();
            expect(typeof apiGetBase62ToBase16).toBe('object');
            expect(apiGetBase62ToBase16.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiGetBase62ToBase16;
            
            expect(schema.description).toBe('Converts strings from base62 to base16.');
            expect(schema.summary).toBe('Converts strings from base62 to base16.');
        });

        test('should have valid querystring schema', () => {
            const { querystring } = apiGetBase62ToBase16.schema;
            
            expect(querystring).toBeDefined();
            expect(querystring.type).toBe('object');
            expect(querystring.properties).toBeDefined();
            expect(querystring.required).toEqual(['base62']);
            
            const base62Prop = querystring.properties.base62;
            expect(base62Prop.type).toBe('string');
            expect(base62Prop.description).toBe('The base62 encoded string that should be converted to base16');
            expect(base62Prop.examples).toEqual(['6DMW88LpSok9Z7P7hUK0wv7bF']);
        });

        test('should have valid response schemas', () => {
            const { response } = apiGetBase62ToBase16.schema;
            
            expect(response).toBeDefined();
            expect(Object.keys(response)).toEqual(['200', '400', '500']);
        });

        test('should have valid 200 response schema', () => {
            const response200 = apiGetBase62ToBase16.schema.response[200];
            
            expect(response200.description).toBe('Base conversion successful.');
            expect(response200.type).toBe('object');
            expect(response200.properties).toBeDefined();
            
            expect(response200.properties.base62).toBeDefined();
            expect(response200.properties.base62.type).toBe('string');
            expect(response200.properties.base16).toBeDefined();
            expect(response200.properties.base16.type).toBe('string');
            
            expect(response200.examples).toBeDefined();
            expect(response200.examples[0]).toEqual({
                base62: '6DMW88LpSok9Z7P7hUK0wv7bF',
                base16: '3199af08bfeeaf5d420f27ed9c01e74370077'
            });
        });

        test('should have valid error response schemas', () => {
            const response400 = apiGetBase62ToBase16.schema.response[400];
            const response500 = apiGetBase62ToBase16.schema.response[500];
            
            [response400, response500].forEach(response => {
                expect(response.type).toBe('object');
                expect(response.properties).toBeDefined();
                
                const requiredErrorProps = ['statusCode', 'code', 'error', 'message', 'time'];
                requiredErrorProps.forEach(prop => {
                    expect(response.properties[prop]).toBeDefined();
                    expect(response.properties[prop].type).toBeDefined();
                });
            });
            
            expect(response400.description).toBe('Required parameter missing.');
            expect(response500.description).toBe('Internal error.');
        });
    });

    describe('apiGetBase16ToBase62', () => {
        test('should export a valid schema object', () => {
            expect(apiGetBase16ToBase62).toBeDefined();
            expect(typeof apiGetBase16ToBase62).toBe('object');
            expect(apiGetBase16ToBase62.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiGetBase16ToBase62;
            
            expect(schema.description).toBe('Converts strings from base16 to base62.');
            expect(schema.summary).toBe('Converts strings from base16 to base62.');
        });

        test('should have valid querystring schema', () => {
            const { querystring } = apiGetBase16ToBase62.schema;
            
            expect(querystring).toBeDefined();
            expect(querystring.type).toBe('object');
            expect(querystring.properties).toBeDefined();
            expect(querystring.required).toEqual(['base16']);
            
            const base16Prop = querystring.properties.base16;
            expect(base16Prop.type).toBe('string');
            expect(base16Prop.description).toBe('The base16 encoded string that should be converted to base62');
            expect(base16Prop.examples).toEqual(['3199af08bfeeaf5d420f27ed9c01e74370077']);
        });

        test('should have valid 200 response schema', () => {
            const response200 = apiGetBase16ToBase62.schema.response[200];
            
            expect(response200.description).toBe('Base conversion successful.');
            expect(response200.type).toBe('object');
            expect(response200.properties).toBeDefined();
            
            expect(response200.properties.base62).toBeDefined();
            expect(response200.properties.base62.type).toBe('string');
            expect(response200.properties.base16).toBeDefined();
            expect(response200.properties.base16.type).toBe('string');
            
            expect(response200.examples).toBeDefined();
            expect(response200.examples[0]).toEqual({
                base16: '3199af08bfeeaf5d420f27ed9c01e74370077',
                base62: '6DMW88LpSok9Z7P7hUK0wv7bF'
            });
        });

        test('should have symmetric conversion examples', () => {
            const base62To16 = apiGetBase62ToBase16.schema.response[200].examples[0];
            const base16To62 = apiGetBase16ToBase62.schema.response[200].examples[0];
            
            // The examples should be symmetric conversions
            expect(base62To16.base62).toBe(base16To62.base62);
            expect(base62To16.base16).toBe(base16To62.base16);
        });

        test('should be JSON serializable', () => {
            expect(() => JSON.stringify(apiGetBase62ToBase16)).not.toThrow();
            expect(() => JSON.stringify(apiGetBase16ToBase62)).not.toThrow();
        });
    });

    describe('Schema consistency', () => {
        test('both schemas should have consistent error response structures', () => {
            const schema1Responses = apiGetBase62ToBase16.schema.response;
            const schema2Responses = apiGetBase16ToBase62.schema.response;
            
            ['400', '500'].forEach(statusCode => {
                const resp1 = schema1Responses[statusCode];
                const resp2 = schema2Responses[statusCode];
                
                expect(resp1.type).toBe(resp2.type);
                expect(resp1.description).toBe(resp2.description);
                expect(Object.keys(resp1.properties)).toEqual(Object.keys(resp2.properties));
            });
        });

        test('both schemas should have querystring with single required parameter', () => {
            expect(apiGetBase62ToBase16.schema.querystring.required).toHaveLength(1);
            expect(apiGetBase16ToBase62.schema.querystring.required).toHaveLength(1);
        });
    });
});