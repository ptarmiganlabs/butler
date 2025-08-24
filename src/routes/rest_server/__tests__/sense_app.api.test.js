import { jest } from '@jest/globals';

let Fastify;
let routePlugin;

describe('REST: sense_app reload route', () => {
    let app;
    let mockSession;
    let mockStartTask;
    let appObj;
    let reloadResult;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('fs', () => ({ readFileSync: jest.fn(() => '{}') }));

        mockStartTask = jest.fn();
        await jest.unstable_mockModule('../../../qrs_util/sense_start_task.js', () => ({ default: mockStartTask }));

        reloadResult = true;
        appObj = {
            doReload: jest.fn(async () => reloadResult),
            doSave: jest.fn(async () => undefined),
        };
        mockSession = {
            open: jest.fn(async () => ({
                engineVersion: jest.fn(async () => ({ qComponentVersion: '99.9.9' })),
                openDoc: jest.fn(async () => appObj),
            })),
            close: jest.fn(async () => true),
        };
        const mockEnigma = { create: jest.fn(() => mockSession) };
        await jest.unstable_mockModule('enigma.js', () => ({ default: mockEnigma }));

        const mockGlobals = {
            config: {
                has: jest.fn((k) => k === 'Butler.restServerEndpointsEnable.senseAppReload'),
                get: jest.fn((k) => {
                    if (k === 'Butler.restServerEndpointsEnable.senseAppReload') return true;
                    if (k === 'Butler.configEngine.rejectUnauthorized') return false;
                    return undefined;
                }),
            },
            configEngine: {
                engineVersion: '12.999.0',
                host: 'example.local',
                port: 4747,
                key: 'k',
                cert: 'c',
            },
            getEngineHttpHeaders: jest.fn(() => ({ 'X-Header': 'v' })),
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn(), silly: jest.fn() },
        };
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        Fastify = (await import('fastify')).default;
        routePlugin = (await import('../sense_app.js')).default;

        app = Fastify({ logger: false });
        await app.register(routePlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('PUT /v4/app/:appId/reload returns 201 and triggers downstream tasks on success', async () => {
        const payload = {
            reloadMode: 0,
            partialReload: false,
            startQSEoWTaskOnSuccess: ['task-success-1', 'task-success-2'],
            startQSEoWTaskOnFailure: ['task-failure-ignored'],
        };
        const res = await app.inject({ method: 'PUT', url: '/v4/app/abc123/reload', payload });
        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual({ appId: 'abc123' });
        // success tasks should be triggered, failure ones shouldn't when reload succeeds
        expect(mockStartTask).toHaveBeenCalledWith('task-success-1');
        expect(mockStartTask).toHaveBeenCalledWith('task-success-2');
    });

    test('Triggers failure tasks on reload failure and normalizes params', async () => {
        // Arrange: set reload to fail and clear previous calls
        reloadResult = false;
        mockStartTask.mockClear();
        appObj.doSave.mockClear();
        appObj.doReload.mockClear();

        const payload = {
            reloadMode: 99, // out of allowed [0..2] -> should default to 0
            partialReload: 'true', // string truthy should be treated as true
            startQSEoWTaskOnSuccess: ['should-not-run'],
            startQSEoWTaskOnFailure: ['fail-1', 'fail-2'],
        };

        const res = await app.inject({ method: 'PUT', url: '/v4/app/xyz789/reload', payload });
        expect(res.statusCode).toBe(201);
        expect(res.json()).toEqual({ appId: 'xyz789' });

        // Failure tasks should run, success should not
        expect(mockStartTask).toHaveBeenCalledWith('fail-1');
        expect(mockStartTask).toHaveBeenCalledWith('fail-2');
        expect(mockStartTask).not.toHaveBeenCalledWith('should-not-run');

        // No save on failure
        expect(appObj.doSave).not.toHaveBeenCalled();

        // doReload receives normalized args: reloadMode 0, partialReload true
        const lastArgs = appObj.doReload.mock.calls.at(-1);
        expect(lastArgs).toEqual([0, true]);

        // Restore default for any later tests
        reloadResult = true;
    });

    test('Returns 500 if session.open fails', async () => {
        // Make session.open throw for this call
        mockSession.open.mockImplementationOnce(async () => {
            throw new Error('open failed');
        });
        const res = await app.inject({ method: 'PUT', url: '/v4/app/bad/reload', payload: {} });
        expect(res.statusCode).toBe(500);
        expect(res.json().message).toMatch(/Failed getting list of Sense apps/i);
    });

    test('Returns 500 if openDoc fails before sending response', async () => {
        // Configure open to return a global whose openDoc throws
        mockSession.open.mockImplementationOnce(async () => ({
            engineVersion: jest.fn(async () => ({ qComponentVersion: '99.9.9' })),
            openDoc: jest.fn(async () => {
                throw new Error('openDoc failed');
            }),
        }));
        const res = await app.inject({ method: 'PUT', url: '/v4/app/boom/reload', payload: {} });
        expect(res.statusCode).toBe(500);
        expect(res.json().message).toMatch(/Failed getting list of Sense apps/i);
    });

    test('Logs error if session.close fails (response remains 201)', async () => {
        // Close should throw after reply was already sent
        mockSession.close.mockImplementationOnce(() => {
            throw new Error('close failed');
        });

        const globalsModule = await import('../../../globals.js');
        const logger = globalsModule.default.logger;
        jest.spyOn(logger, 'error');

        const res = await app.inject({ method: 'PUT', url: '/v4/app/app123/reload', payload: {} });
        expect(res.statusCode).toBe(201);
        expect(logger.error).toHaveBeenCalled();
        const msgs = logger.error.mock.calls.map((c) => String(c[0]));
        expect(msgs.some((m) => m.includes('Error closing connection to Sense engine'))).toBe(true);
    });

    test('Missing appId yields 404 (router enforces required path param)', async () => {
        const res = await app.inject({ method: 'PUT', url: '/v4/app/reload', payload: {} });
        expect(res.statusCode).toBe(404);
    });
});
