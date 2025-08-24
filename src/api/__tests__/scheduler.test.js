import { 
    apiGETSchedules,
    apiPOSTSchedules,
    apiDELETESchedules,
    apiPUTSchedulesStart,
    apiPUTSchedulesStop,
    apiPUTSchedulesStartAll,
    apiPUTSchedulesStopAll,
    apiGETSchedulerStatus
} from '../scheduler.js';

describe('scheduler API schemas', () => {
    describe('apiGETSchedules', () => {
        test('should export a valid schema object', () => {
            expect(apiGETSchedules).toBeDefined();
            expect(typeof apiGETSchedules).toBe('object');
            expect(apiGETSchedules.schema).toBeDefined();
        });

        test('should have correct basic schema properties', () => {
            const { schema } = apiGETSchedules;
            
            expect(schema.summary).toBe('Get all information available for existing schedule(s).');
            expect(schema.description).toContain('If a schedule ID is specified using a query parameter');
        });

        test('should have querystring schema for optional id parameter', () => {
            const { querystring } = apiGETSchedules.schema;
            
            expect(querystring).toBeDefined();
            expect(querystring.type).toBe('object');
            expect(querystring.properties.id).toBeDefined();
            expect(querystring.properties.id.type).toBe('string');
            expect(querystring.properties.id.description).toBe('Scheduld ID');
            expect(querystring.properties.id.examples).toEqual(['e4b1c455-aa15-4a51-a9cf-c5e4cfc91339']);
        });

        test('should have valid 200 response as array', () => {
            const response200 = apiGETSchedules.schema.response[200];
            
            expect(response200.description).toBe('Schedule successfully retrieved.');
            expect(response200.type).toBe('array');
            expect(response200.items).toBeDefined();
            expect(response200.items.type).toBe('object');
            expect(response200.items.properties).toBeDefined();
        });

        test('should have comprehensive schedule object properties', () => {
            const scheduleProps = apiGETSchedules.schema.response[200].items.properties;
            
            const expectedProps = ['id', 'created', 'name', 'cronSchedule', 'timezone', 'qlikSenseTaskId'];
            expectedProps.forEach(prop => {
                expect(scheduleProps[prop]).toBeDefined();
                expect(scheduleProps[prop].type).toBe('string');
                expect(scheduleProps[prop].examples).toBeDefined();
            });
        });
    });

    describe('apiPOSTSchedules', () => {
        test('should export a valid schema object', () => {
            expect(apiPOSTSchedules).toBeDefined();
            expect(typeof apiPOSTSchedules).toBe('object');
            expect(apiPOSTSchedules.schema).toBeDefined();
        });

        test('should have correct summary for creation', () => {
            const { schema } = apiPOSTSchedules;
            
            expect(schema.summary).toBe('Create a new schedule.');
        });

        test('should have body schema for creating schedules', () => {
            const { body } = apiPOSTSchedules.schema;
            
            expect(body).toBeDefined();
            expect(body.type).toBe('object');
            expect(body.properties).toBeDefined();
        });
    });

    describe('apiDELETESchedules', () => {
        test('should export a valid schema object', () => {
            expect(apiDELETESchedules).toBeDefined();
            expect(typeof apiDELETESchedules).toBe('object');
            expect(apiDELETESchedules.schema).toBeDefined();
        });

        test('should have correct summary for deletion', () => {
            const { schema } = apiDELETESchedules;
            
            expect(schema.summary).toBe('Delete a schedule.');
        });
    });

    describe('apiPUTSchedulesStart', () => {
        test('should export a valid schema object', () => {
            expect(apiPUTSchedulesStart).toBeDefined();
            expect(typeof apiPUTSchedulesStart).toBe('object');
            expect(apiPUTSchedulesStart.schema).toBeDefined();
        });

        test('should have correct summary for starting schedule', () => {
            const { schema } = apiPUTSchedulesStart;
            
            expect(schema.summary).toBe('Start a schedule.');
        });
    });

    describe('apiPUTSchedulesStop', () => {
        test('should export a valid schema object', () => {
            expect(apiPUTSchedulesStop).toBeDefined();
            expect(typeof apiPUTSchedulesStop).toBe('object');
            expect(apiPUTSchedulesStop.schema).toBeDefined();
        });

        test('should have correct summary for stopping schedule', () => {
            const { schema } = apiPUTSchedulesStop;
            
            expect(schema.summary).toBe('Stop a schedule.');
        });
    });

    describe('apiPUTSchedulesStartAll', () => {
        test('should export a valid schema object', () => {
            expect(apiPUTSchedulesStartAll).toBeDefined();
            expect(typeof apiPUTSchedulesStartAll).toBe('object');
            expect(apiPUTSchedulesStartAll.schema).toBeDefined();
        });

        test('should have correct summary for starting all schedules', () => {
            const { schema } = apiPUTSchedulesStartAll;
            
            expect(schema.summary).toBe('Start all schedules.');
        });
    });

    describe('apiPUTSchedulesStopAll', () => {
        test('should export a valid schema object', () => {
            expect(apiPUTSchedulesStopAll).toBeDefined();
            expect(typeof apiPUTSchedulesStopAll).toBe('object');
            expect(apiPUTSchedulesStopAll.schema).toBeDefined();
        });

        test('should have correct summary for stopping all schedules', () => {
            const { schema } = apiPUTSchedulesStopAll;
            
            expect(schema.summary).toBe('Stop all schedules.');
        });
    });

    describe('apiGETSchedulerStatus', () => {
        test('should export a valid schema object', () => {
            expect(apiGETSchedulerStatus).toBeDefined();
            expect(typeof apiGETSchedulerStatus).toBe('object');
            expect(apiGETSchedulerStatus.schema).toBeDefined();
        });

        test('should have correct summary for status check', () => {
            const { schema } = apiGETSchedulerStatus;
            
            expect(schema.summary).toBe('Get scheduler status.');
        });
    });

    describe('Schema consistency', () => {
        test('all schemas should have the basic required structure', () => {
            const schemas = [
                apiGETSchedules,
                apiPOSTSchedules,
                apiDELETESchedules,
                apiPUTSchedulesStart,
                apiPUTSchedulesStop,
                apiPUTSchedulesStartAll,
                apiPUTSchedulesStopAll,
                apiGETSchedulerStatus
            ];

            schemas.forEach(apiSchema => {
                expect(apiSchema.schema).toBeDefined();
                expect(apiSchema.schema.summary).toBeDefined();
                expect(typeof apiSchema.schema.summary).toBe('string');
                expect(apiSchema.schema.summary.length).toBeGreaterThan(0);
            });
        });

        test('all schemas should have response objects', () => {
            const schemas = [
                apiGETSchedules,
                apiPOSTSchedules,
                apiDELETESchedules,
                apiPUTSchedulesStart,
                apiPUTSchedulesStop,
                apiPUTSchedulesStartAll,
                apiPUTSchedulesStopAll,
                apiGETSchedulerStatus
            ];

            schemas.forEach(apiSchema => {
                expect(apiSchema.schema.response).toBeDefined();
                expect(typeof apiSchema.schema.response).toBe('object');
            });
        });

        test('all schemas should be JSON serializable', () => {
            const schemas = [
                apiGETSchedules,
                apiPOSTSchedules,
                apiDELETESchedules,
                apiPUTSchedulesStart,
                apiPUTSchedulesStop,
                apiPUTSchedulesStartAll,
                apiPUTSchedulesStopAll,
                apiGETSchedulerStatus
            ];

            schemas.forEach(schema => {
                expect(() => JSON.stringify(schema)).not.toThrow();
            });
        });

        test('schemas with schedule IDs should have consistent ID format', () => {
            // Check that schedule ID examples follow GUID format
            const schemasWithIds = [apiGETSchedules];
            
            schemasWithIds.forEach(apiSchema => {
                if (apiSchema.schema.querystring?.properties?.id?.examples) {
                    const idExample = apiSchema.schema.querystring.properties.id.examples[0];
                    // Should be GUID format
                    expect(idExample).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                }
            });
        });
    });
});