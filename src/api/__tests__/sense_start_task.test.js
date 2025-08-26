import Ajv from 'ajv';
import apiPutStartTask from '../sense_start_task.js';

describe('sense_start_task schema', () => {
    test('exports expected top-level structure', () => {
        expect(apiPutStartTask).toBeDefined();
        expect(apiPutStartTask.schema).toBeDefined();

        const { schema } = apiPutStartTask;
        expect(schema.summary).toMatch(/Start a Qlik Sense task/);
        const taskIdDesc = schema.params?.properties?.taskId?.description;
        expect(taskIdDesc).toContain('magic');
        expect(taskIdDesc).toContain('task ID of "-"');

        // Ensure key sections exist
        expect(schema.params).toBeDefined();
        expect(schema.querystring).toBeDefined();
        expect(schema.body).toBeDefined();
        expect(schema.response).toBeDefined();
    });

    test('body schema enum contains all supported types', () => {
        const { body } = apiPutStartTask.schema;
        // Drill down to the enum on items.type
        const typeEnum = body?.items?.properties?.type?.enum;
        ['keyvaluestore', 'starttaskid', 'starttasktag', 'starttaskcustomproperty'].forEach((t) => {
            expect(typeEnum).toContain(t);
        });
    });

    describe('Ajv validation', () => {
        const ajv = new Ajv({ allErrors: true, strict: false });

        test('params schema validates optional taskId string when present', () => {
            const validate = ajv.compile(apiPutStartTask.schema.params);
            // Valid with taskId
            expect(validate({ taskId: '210832b5-6174-4572-bd19-3e61eda675ef' })).toBe(true);
            // Also valid when params empty (no required fields)
            expect(validate({})).toBe(true);
        });

        test('querystring schema enforces boolean type', () => {
            const validate = ajv.compile(apiPutStartTask.schema.querystring);
            expect(validate({ allTaskIdsMustExist: true })).toBe(true);
            expect(validate({ allTaskIdsMustExist: false })).toBe(true);
            // Invalid: wrong type
            expect(validate({ allTaskIdsMustExist: 'true' })).toBe(false);
        });

        test('body schema accepts valid example and rejects invalid enum value', () => {
            const validate = ajv.compile(apiPutStartTask.schema.body);

            // Should validate the documented example
            const example = apiPutStartTask.schema.body.examples?.[0];
            expect(Array.isArray(example)).toBe(true);
            expect(validate(example)).toBe(true);

            // Invalid: type explicitly set to a non-enum value
            const invalidBody = [{ type: 'not-a-valid-type', payload: { foo: 'bar' } }];
            expect(validate(invalidBody)).toBe(false);
        });

        test('response 200 example conforms to generic object schema', () => {
            const resp200Schema = apiPutStartTask.schema.response[200];
            const validate = ajv.compile(resp200Schema);
            const example = resp200Schema.examples?.[0];
            expect(validate(example)).toBe(true);
        });
    });
});
