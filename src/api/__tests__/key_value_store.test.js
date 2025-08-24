import { 
    apiGetAllNamespaces,
    apiGetKVPair,
    apiGetKVExists,
    apiPostKVPair,
    apiDeleteKVPair,
    apiDeleteNamespace,
    apiGetKeysInNamespace
} from '../key_value_store.js';

describe('key_value_store API schemas', () => {
    describe('apiGetAllNamespaces', () => {
        test('should export a valid schema object', () => {
            expect(apiGetAllNamespaces).toBeDefined();
            expect(typeof apiGetAllNamespaces).toBe('object');
            expect(apiGetAllNamespaces.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiGetAllNamespaces;
            
            expect(schema.summary).toBe('List all currently defined namespaces.');
            expect(schema.description).toBe('');
        });

        test('should have valid response schemas', () => {
            const { response } = apiGetAllNamespaces.schema;
            
            expect(response).toBeDefined();
            expect(Object.keys(response)).toEqual(['200', '500']);
        });

        test('should have valid 200 response as array of strings', () => {
            const response200 = apiGetAllNamespaces.schema.response[200];
            
            expect(response200.description).toBe('Array of all namespaces.');
            expect(response200.type).toBe('array');
            expect(response200.items).toBeDefined();
            expect(response200.items.type).toBe('string');
            expect(response200.examples).toBeDefined();
            expect(response200.examples[0]).toEqual(['Weekly sales app', 'Sales ETL step 1', 'Sales ETL step 2']);
        });
    });

    describe('apiGetKVPair', () => {
        test('should export a valid schema object', () => {
            expect(apiGetKVPair).toBeDefined();
            expect(typeof apiGetKVPair).toBe('object');
            expect(apiGetKVPair.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiGetKVPair;
            
            expect(schema.summary).toBe('Get the value associated with a key, in a specific namespace.');
            expect(schema.description).toBe('');
        });

        test('should have valid params schema for namespace', () => {
            const { params } = apiGetKVPair.schema;
            
            expect(params).toBeDefined();
            expect(params.type).toBe('object');
            expect(params.properties.namespace).toBeDefined();
            expect(params.properties.namespace.type).toBe('string');
            expect(params.properties.namespace.examples).toEqual(['Sales ETL step 2']);
        });

        test('should have valid querystring schema for key', () => {
            const { querystring } = apiGetKVPair.schema;
            
            expect(querystring).toBeDefined();
            expect(querystring.type).toBe('object');
            expect(querystring.properties.key).toBeDefined();
            expect(querystring.properties.key.type).toBe('string');
            expect(querystring.properties.key.examples).toEqual(['Last extract timestamp']);
        });
    });

    describe('apiGetKVExists', () => {
        test('should export a valid schema object', () => {
            expect(apiGetKVExists).toBeDefined();
            expect(typeof apiGetKVExists).toBe('object');
            expect(apiGetKVExists.schema).toBeDefined();
        });

        test('should have correct summary', () => {
            const { schema } = apiGetKVExists;
            
            expect(schema.summary).toBe('Checks if a key exists in a namespace.');
        });
    });

    describe('apiPostKVPair', () => {
        test('should export a valid schema object', () => {
            expect(apiPostKVPair).toBeDefined();
            expect(typeof apiPostKVPair).toBe('object');
            expect(apiPostKVPair.schema).toBeDefined();
        });

        test('should have correct summary for POST operation', () => {
            const { schema } = apiPostKVPair;
            
            expect(schema.summary).toBe('Create a new key-value pair in the specified namespace.');
        });

        test('should have body schema for POST data', () => {
            const { body } = apiPostKVPair.schema;
            
            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
        });
    });

    describe('apiDeleteKVPair', () => {
        test('should export a valid schema object', () => {
            expect(apiDeleteKVPair).toBeDefined();
            expect(typeof apiDeleteKVPair).toBe('object');
            expect(apiDeleteKVPair.schema).toBeDefined();
        });

        test('should have correct summary for DELETE operation', () => {
            const { schema } = apiDeleteKVPair;
            
            expect(schema.summary).toBe('Delete a key-value pair in a specific namespace.');
        });
    });

    describe('apiDeleteNamespace', () => {
        test('should export a valid schema object', () => {
            expect(apiDeleteNamespace).toBeDefined();
            expect(typeof apiDeleteNamespace).toBe('object');
            expect(apiDeleteNamespace.schema).toBeDefined();
        });

        test('should have correct summary for namespace deletion', () => {
            const { schema } = apiDeleteNamespace;
            
            expect(schema.summary).toBe('Delete a namespace and all key-value pairs in it.');
        });
    });

    describe('apiGetKeysInNamespace', () => {
        test('should export a valid schema object', () => {
            expect(apiGetKeysInNamespace).toBeDefined();
            expect(typeof apiGetKeysInNamespace).toBe('object');
            expect(apiGetKeysInNamespace.schema).toBeDefined();
        });

        test('should have correct summary for listing keys', () => {
            const { schema } = apiGetKeysInNamespace;
            
            expect(schema.summary).toBe('Retrieve a list of all keys present in the specified namespace.');
        });
    });

    describe('Schema consistency', () => {
        test('all schemas should have the basic required structure', () => {
            const schemas = [
                apiGetAllNamespaces,
                apiGetKVPair,
                apiGetKVExists,
                apiPostKVPair,
                apiDeleteKVPair,
                apiDeleteNamespace,
                apiGetKeysInNamespace
            ];

            schemas.forEach(apiSchema => {
                expect(apiSchema.schema).toBeDefined();
                expect(apiSchema.schema.summary).toBeDefined();
                expect(typeof apiSchema.schema.summary).toBe('string');
                expect(apiSchema.schema.summary.length).toBeGreaterThan(0);
            });
        });

        test('all schemas should have standard error responses', () => {
            const schemas = [
                apiGetAllNamespaces,
                apiGetKVPair,
                apiGetKVExists,
                apiPostKVPair,
                apiDeleteKVPair,
                apiDeleteNamespace,
                apiGetKeysInNamespace
            ];

            schemas.forEach(apiSchema => {
                const responses = apiSchema.schema.response;
                if (responses && responses['500']) {
                    expect(responses['500'].properties).toBeDefined();
                    expect(responses['500'].properties.statusCode).toBeDefined();
                    expect(responses['500'].properties.code).toBeDefined();
                    expect(responses['500'].properties.error).toBeDefined();
                    expect(responses['500'].properties.message).toBeDefined();
                    expect(responses['500'].properties.time).toBeDefined();
                }
            });
        });

        test('all schemas should be JSON serializable', () => {
            const schemas = [
                apiGetAllNamespaces,
                apiGetKVPair,
                apiGetKVExists,
                apiPostKVPair,
                apiDeleteKVPair,
                apiDeleteNamespace,
                apiGetKeysInNamespace
            ];

            schemas.forEach(schema => {
                expect(() => JSON.stringify(schema)).not.toThrow();
            });
        });

        test('schemas with params should have namespace parameter', () => {
            const schemasWithParams = [
                apiGetKVPair,
                apiGetKVExists,
                apiPostKVPair,
                apiDeleteKVPair,
                apiDeleteNamespace,
                apiGetKeysInNamespace
            ];

            schemasWithParams.forEach(apiSchema => {
                if (apiSchema.schema.params) {
                    expect(apiSchema.schema.params.properties.namespace).toBeDefined();
                    expect(apiSchema.schema.params.properties.namespace.type).toBe('string');
                }
            });
        });
    });
});