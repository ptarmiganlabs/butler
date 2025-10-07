import { jest } from '@jest/globals';

let Fastify;
let routePlugin;

describe('REST: sense_start_task routes', () => {
    let app;
    let started;

    beforeAll(async () => {
        started = [];
        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../qrs_util/does_task_exist.js', () => ({
            default: jest.fn(async (id) => ({ exists: id === 'good-guid', task: { taskId: id, taskName: `Task ${id}` } })),
        }));
        await jest.unstable_mockModule('../../../qrs_util/get_tasks.js', () => ({
            default: jest.fn(async () => [{ taskId: 'tag-guid', taskName: 'ByTag' }]),
        }));
        await jest.unstable_mockModule('../../../qrs_util/sense_start_task.js', () => ({
            default: jest.fn((id) => started.push(id)),
        }));
        await jest.unstable_mockModule('../../../lib/key_value_store.js', () => ({
            addKeyValuePair: jest.fn(async () => undefined),
        }));
        await jest.unstable_mockModule('../../../lib/config_util.js', () => ({
            verifyTaskId: jest.fn((id) => id === '-' || /guid$/.test(id)),
        }));

        const mockGlobals = {
            config: {
                has: jest.fn((k) =>
                    [
                        'Butler.restServerEndpointsEnable.senseStartTask',
                        'Butler.startTaskFilter.enable',
                        'Butler.startTaskFilter.allowTask.taskId',
                        'Butler.startTaskFilter.allowTask.tag',
                        'Butler.startTaskFilter.allowTask.customProperty',
                        'Butler.restServerEndpointsEnable.keyValueStore',
                    ].includes(k),
                ),
                get: jest.fn((k) => {
                    switch (k) {
                        case 'Butler.restServerEndpointsEnable.senseStartTask':
                            return true;
                        case 'Butler.startTaskFilter.enable':
                            return true;
                        case 'Butler.startTaskFilter.allowTask.taskId':
                            return ['good-guid'];
                        case 'Butler.startTaskFilter.allowTask.tag':
                            return ['good-tag'];
                        case 'Butler.startTaskFilter.allowTask.customProperty':
                            return [{ name: 'team', value: 'eng' }];
                        case 'Butler.restServerEndpointsEnable.keyValueStore':
                            return true;
                        default:
                            return undefined;
                    }
                }),
            },
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn(), silly: jest.fn() },
            getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        };
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));

        Fastify = (await import('fastify')).default;
        routePlugin = (await import('../sense_start_task.js')).default;

        app = Fastify({ logger: false });
        await app.register(routePlugin);
        await app.ready();
    });

    afterEach(() => {
        started.length = 0;
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    test('PUT /v4/reloadtask/:taskId/start starts valid allowed task and ignores invalid', async () => {
        const res = await app.inject({ method: 'PUT', url: '/v4/reloadtask/good-guid/start', payload: [] });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tasksId.started).toEqual([{ taskId: 'good-guid', taskName: 'Task good-guid' }]);
        expect(started).toContain('good-guid');
    });

    test('POST /v4/reloadtask/-/start accepts body with starttaskid and kv store', async () => {
        const payload = [
            { type: 'keyvaluestore', payload: { namespace: 'ns', key: 'k', value: 'v', ttl: 10 } },
            { type: 'starttaskid', payload: { taskId: 'good-guid' } },
        ];
        const res = await app.inject({ method: 'POST', url: '/v4/reloadtask/-/start', payload });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tasksId.started.some((x) => x.taskId === 'good-guid')).toBe(true);
        expect(started).toContain('good-guid');
    });
});
