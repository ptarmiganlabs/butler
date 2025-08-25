import { apiFileCopy, apiFileMove, apiFileDelete, apiCreateDir, apiCreateDirQvd } from '../disk_utils.js';

describe('disk_utils API schemas', () => {
    describe('apiFileCopy', () => {
        test('should export a valid schema object', () => {
            expect(apiFileCopy).toBeDefined();
            expect(typeof apiFileCopy).toBe('object');
            expect(apiFileCopy.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiFileCopy;

            expect(schema.description).toContain('Copying of files is only posttible between pre-approved directories');
            expect(schema.summary).toBe('Copy file(s) between well defined, approved locations.');
        });

        test('should have valid request body schema', () => {
            const { body } = apiFileCopy.schema;

            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();

            // Check required properties
            expect(body.properties.fromFile).toBeDefined();
            expect(body.properties.toFile).toBeDefined();
            expect(body.properties.overwrite).toBeDefined();
            expect(body.properties.preserveTimestamp).toBeDefined();

            // Check property types
            expect(body.properties.fromFile.type).toBe('string');
            expect(body.properties.toFile.type).toBe('string');
            expect(body.properties.overwrite.type).toBe('boolean');
            expect(body.properties.preserveTimestamp.type).toBe('boolean');
        });

        test('should have valid response schemas', () => {
            const { response } = apiFileCopy.schema;

            expect(response).toBeDefined();
            expect(Object.keys(response)).toEqual(['201', '400', '403', '500']);
        });

        test('should have valid 201 success response', () => {
            const response201 = apiFileCopy.schema.response[201];

            expect(response201.description).toBe('File copied.');
            expect(response201.type).toBe('object');
            expect(response201.properties).toBeDefined();

            // Should mirror the request body properties
            expect(response201.properties.fromFile).toBeDefined();
            expect(response201.properties.toFile).toBeDefined();
            expect(response201.properties.overwrite).toBeDefined();
            expect(response201.properties.preserveTimestamp).toBeDefined();
        });
    });

    describe('apiFileMove', () => {
        test('should export a valid schema object', () => {
            expect(apiFileMove).toBeDefined();
            expect(typeof apiFileMove).toBe('object');
            expect(apiFileMove.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiFileMove;

            expect(schema.description).toContain('Moving of files is only posttible between pre-approved directories');
            expect(schema.summary).toBe('Move file(s) between well defined, approved locations.');
        });

        test('should have valid request body schema', () => {
            const { body } = apiFileMove.schema;

            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();

            // Check properties (should have one less than copy - no preserveTimestamp)
            expect(body.properties.fromFile).toBeDefined();
            expect(body.properties.toFile).toBeDefined();
            expect(body.properties.overwrite).toBeDefined();
            expect(body.properties.preserveTimestamp).toBeUndefined();
        });

        test('should have valid response schemas', () => {
            const { response } = apiFileMove.schema;

            expect(response).toBeDefined();
            expect(Object.keys(response)).toEqual(['201', '400', '403', '500']);
        });
    });

    describe('apiFileDelete', () => {
        test('should export a valid schema object', () => {
            expect(apiFileDelete).toBeDefined();
            expect(typeof apiFileDelete).toBe('object');
            expect(apiFileDelete.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiFileDelete;

            expect(schema.description).toContain('It is only possible to delete files in pre-approved directories');
            expect(schema.summary).toBe('Delete file(s) in well defined, approved locations.');
        });

        test('should have valid request body schema', () => {
            const { body } = apiFileDelete.schema;

            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
            expect(body.properties.deleteFile).toBeDefined();
            expect(body.properties.deleteFile.type).toBe('string');
        });

        test('should have 204 success response (no content)', () => {
            const response204 = apiFileDelete.schema.response[204];

            expect(response204).toBeDefined();
            expect(response204.description).toBe('File deleted.');
            expect(response204.type).toBe('object');
        });

        test('should have valid response schemas', () => {
            const { response } = apiFileDelete.schema;

            expect(response).toBeDefined();
            expect(Object.keys(response)).toEqual(['204', '400', '403', '500']);
        });
    });

    describe('apiCreateDir', () => {
        test('should export a valid schema object', () => {
            expect(apiCreateDir).toBeDefined();
            expect(typeof apiCreateDir).toBe('object');
            expect(apiCreateDir.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiCreateDir;

            expect(schema.description).toContain('If the directory already exists nothing will happen');
            expect(schema.summary).toBe('Creates a directory anywhere in the file system.');
        });

        test('should have valid request body schema', () => {
            const { body } = apiCreateDir.schema;

            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
            expect(body.properties.directory).toBeDefined();
            expect(body.properties.directory.type).toBe('string');
            expect(body.properties.directory.examples).toEqual(['/Users/joe/data/qvds/2020']);
        });

        test('should have valid response schemas', () => {
            const { response } = apiCreateDir.schema;

            expect(response).toBeDefined();
            expect(Object.keys(response)).toEqual(['201', '400', '500']);
        });
    });

    describe('apiCreateDirQvd', () => {
        test('should export a valid schema object', () => {
            expect(apiCreateDirQvd).toBeDefined();
            expect(typeof apiCreateDirQvd).toBe('object');
            expect(apiCreateDirQvd.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiCreateDirQvd;

            expect(schema.description).toBe("Creates a directory in QVD directory (which is defined in Butler's config file).");
            expect(schema.summary).toBe('Creates a directory in designated QVD directory.');
        });

        test('should have different directory example than apiCreateDir', () => {
            const createDirExample = apiCreateDir.schema.body.properties.directory.examples[0];
            const createDirQvdExample = apiCreateDirQvd.schema.body.properties.directory.examples[0];

            expect(createDirExample).not.toBe(createDirQvdExample);
            expect(createDirQvdExample).toBe('subfolder/2020-10');
        });
    });

    describe('Schema consistency', () => {
        test('all schemas should have standard error response structures', () => {
            const schemas = [apiFileCopy, apiFileMove, apiFileDelete, apiCreateDir, apiCreateDirQvd];

            schemas.forEach((apiSchema) => {
                const responses = apiSchema.schema.response;

                // Each should have at least 400 and 500 error responses
                if (responses['400']) {
                    expect(responses['400'].properties).toBeDefined();
                    expect(responses['400'].properties.statusCode).toBeDefined();
                    expect(responses['400'].properties.code).toBeDefined();
                    expect(responses['400'].properties.error).toBeDefined();
                    expect(responses['400'].properties.message).toBeDefined();
                    expect(responses['400'].properties.time).toBeDefined();
                }

                if (responses['500']) {
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
            const schemas = [apiFileCopy, apiFileMove, apiFileDelete, apiCreateDir, apiCreateDirQvd];

            schemas.forEach((schema) => {
                expect(() => JSON.stringify(schema)).not.toThrow();
            });
        });

        test('file operation schemas should have body parameters', () => {
            const fileSchemas = [apiFileCopy, apiFileMove, apiFileDelete, apiCreateDir, apiCreateDirQvd];

            fileSchemas.forEach((schema) => {
                expect(schema.schema.body).toBeDefined();
                expect(schema.schema.body.type).toBe('object');
                expect(schema.schema.body.properties).toBeDefined();
            });
        });
    });
});
