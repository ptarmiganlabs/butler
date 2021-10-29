const axios = require('axios');
const path = require('path');

process.env.NODE_CONFIG_DIR = path.resolve('./config/');
process.env.NODE_ENV = 'production';
const config = require('config');

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 5000,
});

let result;

let scheduleName1;
let scheduleCron1;
let scheduleTimezone1;
let scheduleTaskId1;
let scheduleStartupState1;
let scheduleTag1;
let scheduleTag2;
let idExisting;

beforeAll(async () => {
    scheduleName1 = 'TEST Reload sales metrics';
    scheduleCron1 = '0,30 6 * * 1-5';
    scheduleTimezone1 = 'Europe/Stockholm';
    scheduleTaskId1 = '210832b5-6174-4572-bd19-3e61eda675ef';
    scheduleStartupState1 = 'started';
    scheduleTag1 = 'tag 1';
    scheduleTag2 = 'tag 2';
});

afterAll(async () => {
    //
});

/**
 * Create new schedule
 */
describe('POST /v4/schedules', () => {
    test('It should respond with 201 when new schedule is successfully created', async () => {
        result = await instance.post('/v4/schedules', {
            name: scheduleName1,
            cronSchedule: scheduleCron1,
            timezone: scheduleTimezone1,
            qlikSenseTaskId: scheduleTaskId1,
            startupState: scheduleStartupState1,
            tags: [scheduleTag1, scheduleTag2],
        });

        expect(result.status).toBe(201);

        // Get ID of created task
        idExisting = result.data.id;
        expect(idExisting).toBeTruthy();
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.name).toEqual(scheduleName1);
        expect(result.data.cronSchedule).toEqual(scheduleCron1);
        expect(result.data.timezone).toEqual(scheduleTimezone1);
        expect(result.data.qlikSenseTaskId).toEqual(scheduleTaskId1);
        expect(result.data.startupState).toEqual(scheduleStartupState1);
        expect(result.data.tags).toEqual([scheduleTag1, scheduleTag2]);
        expect(result.data.id).toBeTruthy();
        expect(result.data.created).toBeTruthy();
        expect(result.data.lastKnownState).toEqual('started');
    });

    test('It should respond with 204 when deleting an existing schedule', async () => {
        result = await instance.delete(`/v4/schedules/${idExisting}`);

        expect(result.status).toBe(204);
    });

    test('Response from delete operation should be empty', () => {
        expect(result.data).toEqual('');
    });
});

/**
 * Get info about a specific schedule
 */
describe('GET /v4/schedules', () => {
    test('Create new schedule', async () => {
        result = await instance.post('/v4/schedules', {
            name: scheduleName1,
            cronSchedule: scheduleCron1,
            timezone: scheduleTimezone1,
            qlikSenseTaskId: scheduleTaskId1,
            startupState: scheduleStartupState1,
            tags: [scheduleTag1, scheduleTag2],
        });

        expect(result.status).toBe(201);

        // Get ID of created schedule
        idExisting = result.data.id;
        expect(idExisting).toBeTruthy();
    });

    test('It should respond with 200 when getting new schedule', async () => {
        result = await instance.get('/v4/schedules', {
            params: {
                id: idExisting,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.name).toEqual(scheduleName1);
        expect(result.data.cronSchedule).toEqual(scheduleCron1);
        expect(result.data.timezone).toEqual(scheduleTimezone1);
        expect(result.data.qlikSenseTaskId).toEqual(scheduleTaskId1);
        expect(result.data.startupState).toEqual(scheduleStartupState1);
        expect(result.data.tags).toEqual([scheduleTag1, scheduleTag2]);
        expect(result.data.id).toBeTruthy();
        expect(result.data.created).toBeTruthy();
        expect(result.data.lastKnownState).toEqual('started');
    });

    test('It should respond with 204 when deleting an existing schedule', async () => {
        result = await instance.delete(`/v4/schedules/${idExisting}`);

        expect(result.status).toBe(204);
    });

    test('Response from delete operation should be empty', () => {
        expect(result.data).toEqual('');
    });
});

/**
 * Get info about all schedules
 */
describe('GET /v4/schedules', () => {
    test('It should respond with 200 when getting all schedules', async () => {
        result = await instance.get('/v4/schedules');

        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });
});

/**
 * Start a specific schedule
 */
describe('PUT /v4/schedules/:scheduleId/start', () => {
    test('Create new schedule', async () => {
        result = await instance.post('/v4/schedules', {
            name: scheduleName1,
            cronSchedule: scheduleCron1,
            timezone: scheduleTimezone1,
            qlikSenseTaskId: scheduleTaskId1,
            startupState: 'stopped',
            tags: [scheduleTag1, scheduleTag2],
        });

        expect(result.status).toBe(201);

        // Get ID of created schedule
        idExisting = result.data.id;
        expect(idExisting).toBeTruthy();
    });

    test('It should respond with 200 when getting new schedule', async () => {
        result = await instance.get('/v4/schedules', {
            params: {
                id: idExisting,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object and last known state stopped', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
        expect(result.data.lastKnownState).toBe('stopped');
    });

    test('It should respond with 200 when starting an existing schedule', async () => {
        result = await instance.put(`/v4/schedules/${idExisting}/start`, {});

        expect(result.status).toBe(200);
    });

    test('Get the schedule again', async () => {
        result = await instance.get('/v4/schedules', {
            params: {
                id: idExisting,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object and last known state started', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
        expect(result.data.lastKnownState).toBe('started');
    });

    test('It should respond with 204 when deleting an existing schedule', async () => {
        result = await instance.delete(`/v4/schedules/${idExisting}`);

        expect(result.status).toBe(204);
    });

    test('Response from delete operation should be empty', () => {
        expect(result.data).toEqual('');
    });
});

/**
 * Start all schedules
 */
describe('PUT /v4/schedules/startall', () => {
    test('It should respond with 200 when starting all schedules', async () => {
        result = await instance.put('/v4/schedules/startall', {});

        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });

    test('All jobs in array should be started', () => {
        expect(result.data).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    lastKnownState: 'stopped',
                }),
            ])
        );
    });
});

/**
 * Stop a specific schedule
 */
describe('PUT /v4/schedules/:scheduleId/stop', () => {
    test('Create new schedule', async () => {
        result = await instance.post('/v4/schedules', {
            name: scheduleName1,
            cronSchedule: scheduleCron1,
            timezone: scheduleTimezone1,
            qlikSenseTaskId: scheduleTaskId1,
            startupState: 'started',
            tags: [scheduleTag1, scheduleTag2],
        });

        expect(result.status).toBe(201);

        // Get ID of created schedule
        idExisting = result.data.id;
        expect(idExisting).toBeTruthy();
    });

    test('It should respond with 200 when getting new schedule', async () => {
        result = await instance.get('/v4/schedules', {
            params: {
                id: idExisting,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object and last known state started', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
        expect(result.data.lastKnownState).toBe('started');
    });

    test('It should respond with 200 when stopping an existing schedule', async () => {
        result = await instance.put(`/v4/schedules/${idExisting}/stop`, {});

        expect(result.status).toBe(200);
    });

    test('Get the schedule again', async () => {
        result = await instance.get('/v4/schedules', {
            params: {
                id: idExisting,
            },
        });

        expect(result.status).toBe(200);
    });

    test('Response should be an object and last known state started', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
        expect(result.data.lastKnownState).toBe('stopped');
    });

    test('It should respond with 204 when deleting an existing schedule', async () => {
        result = await instance.delete(`/v4/schedules/${idExisting}`);

        expect(result.status).toBe(204);
    });

    test('Response from delete operation should be empty', () => {
        expect(result.data).toEqual('');
    });
});

/**
 * Stop all schedules
 */
describe('PUT /v4/schedules/stopall', () => {
    test('It should respond with 200 when stopping all schedules', async () => {
        result = await instance.put('/v4/schedules/stopall', {});

        expect(result.status).toBe(200);
    });

    test('Response should be an array', () => {
        expect(Array.isArray(result.data)).toBe(true);
    });

    test('All jobs in array should be stopped', () => {
        expect(result.data).toEqual(
            expect.not.arrayContaining([
                expect.objectContaining({
                    lastKnownState: 'started',
                }),
            ])
        );
    });
});

/**
 * Get low-level info on all jobs
 */
describe('GET /v4/schedules/status', () => {
    test('It should respond with 200 when getting status', async () => {
        result = await instance.get('/v4/schedules/status', {});

        expect(result.status).toBe(200);
    });

    test('Response should be a string', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('string');
    });
});
