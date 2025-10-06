import { jest } from '@jest/globals';

let Fastify;
let schedulerPlugin;

// Simple in-memory schedules
const schedules = [
    { id: 'a', name: 'A', enabled: true },
    { id: 'b', name: 'B', enabled: false },
];

const mockLib = {
    // Per API schema this endpoint returns a string (text/plain)
    getSchedulesStatus: jest.fn(() => 'running:a;stopped:b'),
    existsSchedule: jest.fn((id) => schedules.some((s) => s.id === id)),
    getAllSchedules: jest.fn(() => schedules),
    addSchedule: jest.fn((s) => schedules.push(s)),
    deleteSchedule: jest.fn((id) => {
        const idx = schedules.findIndex((s) => s.id === id);
        if (idx >= 0) {
            schedules.splice(idx, 1);
            return true;
        }
        return false;
    }),
    startSchedule: jest.fn((id) => schedules.some((s) => s.id === id)),
    stopSchedule: jest.fn((id) => schedules.some((s) => s.id === id)),
    getSchedule: jest.fn((id) => schedules.find((s) => s.id === id)),
    startAllSchedules: jest.fn(async () => undefined),
    stopAllSchedules: jest.fn(async () => undefined),
};

const mockGlobals = {
    config: {
        has: jest.fn((key) =>
            [
                'Butler.restServerEndpointsEnable.scheduler.getSchedule',
                'Butler.restServerEndpointsEnable.scheduler.createNewSchedule',
                'Butler.restServerEndpointsEnable.scheduler.deleteSchedule',
                'Butler.restServerEndpointsEnable.scheduler.startSchedule',
                'Butler.restServerEndpointsEnable.scheduler.stopSchedule',
                'Butler.restServerEndpointsEnable.scheduler.getScheduleStatusAll',
            ].includes(key),
        ),
        get: jest.fn((key) =>
            [
                'Butler.restServerEndpointsEnable.scheduler.getSchedule',
                'Butler.restServerEndpointsEnable.scheduler.createNewSchedule',
                'Butler.restServerEndpointsEnable.scheduler.deleteSchedule',
                'Butler.restServerEndpointsEnable.scheduler.startSchedule',
                'Butler.restServerEndpointsEnable.scheduler.stopSchedule',
                'Butler.restServerEndpointsEnable.scheduler.getScheduleStatusAll',
            ].includes(key)
                ? true
                : undefined,
        ),
    },
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
    getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
};

describe('REST: Scheduler routes', () => {
    let app;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../lib/scheduler.js', () => mockLib);
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        schedulerPlugin = (await import('../scheduler.js')).default;

        app = Fastify({ logger: false });
        await app.register(schedulerPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('GET /v4/schedules returns all schedules', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/schedules' });
        expect(res.statusCode).toBe(200);
        // Fastify serializes response based on schema and may drop unknown props like 'enabled'
        expect(res.json()).toEqual(schedules.map((s) => ({ id: s.id, name: s.name })));
    });

    test('GET /v4/schedules?id=a returns array with the schedule', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/schedules?id=a' });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual([schedules[0]]);
    });

    test('GET /v4/schedules?id=nope returns 400', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/schedules?id=nope' });
        expect(res.statusCode).toBe(400);
    });

    test('POST /v4/schedules creates a new schedule and returns 201', async () => {
        const payload = {
            name: 'C',
            // Satisfy body schema required fields
            cronSchedule: '*/5 * * * *',
            timezone: 'Europe/Stockholm',
            qlikSenseTaskId: '210832b5-6174-4572-bd19-3e61eda675ef',
            startupState: 'started',
        };
        const res = await app.inject({ method: 'POST', url: '/v4/schedules', payload });
        expect(res.statusCode).toBe(201);
        const created = JSON.parse(res.body);
        expect(created.name).toBe('C');
        expect(created.id).toBeTruthy();

        // Test UUID functionality specifically
        expect(typeof created.id).toBe('string');
        expect(created.id.length).toBe(36);
        // Test UUID v4 format
        const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        expect(created.id).toMatch(uuidv4Regex);
        // Test that it includes timestamp
        expect(created.created).toBeTruthy();
        expect(new Date(created.created)).toBeInstanceOf(Date);
    });

    test('DELETE /v4/schedules/:scheduleId deletes or errors', async () => {
        const id = schedules[0].id;
        const res1 = await app.inject({ method: 'DELETE', url: `/v4/schedules/${id}` });
        expect(res1.statusCode).toBe(204);
        const res2 = await app.inject({ method: 'DELETE', url: `/v4/schedules/nope` });
        expect(res2.statusCode).toBe(400);
    });

    test('PUT /v4/schedules/:id/start and /startall', async () => {
        const anyId = schedules[0]?.id || 'b';
        const res1 = await app.inject({ method: 'PUT', url: `/v4/schedules/${anyId}/start` });
        expect(res1.statusCode).toBe(200);
        const res2 = await app.inject({ method: 'PUT', url: `/v4/schedules/startall` });
        expect(res2.statusCode).toBe(200);
    });

    test('PUT /v4/schedules/:id/stop and /stopall', async () => {
        const anyId = schedules[0]?.id || 'b';
        const res1 = await app.inject({ method: 'PUT', url: `/v4/schedules/${anyId}/stop` });
        expect(res1.statusCode).toBe(200);
        const res2 = await app.inject({ method: 'PUT', url: `/v4/schedules/stopall` });
        expect(res2.statusCode).toBe(200);
    });

    test('PUT /v4/schedules/:id/start with invalid id returns 400', async () => {
        const res = await app.inject({ method: 'PUT', url: `/v4/schedules/does-not-exist/start` });
        expect(res.statusCode).toBe(400);
    });

    test('PUT /v4/schedules/:id/stop with invalid id returns 400', async () => {
        const res = await app.inject({ method: 'PUT', url: `/v4/schedules/does-not-exist/stop` });
        expect(res.statusCode).toBe(400);
    });

    test('POST /v4/schedules missing required fields returns 400', async () => {
        const res = await app.inject({ method: 'POST', url: '/v4/schedules', payload: { name: 'X' } });
        expect(res.statusCode).toBe(400);
    });

    test('GET /v4/schedules/status returns scheduler status', async () => {
        const res = await app.inject({ method: 'GET', url: '/v4/schedules/status' });
        expect(res.statusCode).toBe(200);
        // API is defined as text/plain; ensure we got a string and it contains our mock content
        expect(typeof res.body).toBe('string');
        expect(res.body).toBe('running:a;stopped:b');
    });
});
