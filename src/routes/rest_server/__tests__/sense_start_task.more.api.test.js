import { jest } from '@jest/globals';

let Fastify;
let routePlugin;

describe('REST: sense_start_task routes - extended coverage', () => {
    let app;
    let started;
    let cfg;

    beforeAll(async () => {
        started = [];
        cfg = {
            senseStartTask: true,
            filterEnabled: true,
            allowTaskIds: ['good-guid'],
            allowTags: ['good-tag'],
            allowCP: [{ name: 'team', value: 'eng' }],
            kvEnabled: true,
        };

        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../qrs_util/does_task_exist.js', () => ({
            default: jest.fn(async (id) => ({ exists: id === 'good-guid', task: { taskId: id, taskName: `Task ${id}` } })),
        }));
        await jest.unstable_mockModule('../../../qrs_util/get_tasks.js', () => ({
            default: jest.fn(async (arg) => {
                if (arg?.tag) return [{ taskId: 'tag-guid', taskName: 'ByTag' }];
                if (arg?.customProperty) return [{ taskId: 'cp-guid', taskName: 'ByCP' }];
                return [];
            }),
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
                            return cfg.senseStartTask;
                        case 'Butler.startTaskFilter.enable':
                            return cfg.filterEnabled;
                        case 'Butler.startTaskFilter.allowTask.taskId':
                            return cfg.allowTaskIds;
                        case 'Butler.startTaskFilter.allowTask.tag':
                            return cfg.allowTags;
                        case 'Butler.startTaskFilter.allowTask.customProperty':
                            return cfg.allowCP;
                        case 'Butler.restServerEndpointsEnable.keyValueStore':
                            return cfg.kvEnabled;
                        default:
                            return undefined;
                    }
                }),
            },
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn(), silly: jest.fn() },
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

    test('denies URL taskId not in allow list when filtering enabled', async () => {
        const res = await app.inject({ method: 'PUT', url: '/v4/reloadtask/bad-guid/start', payload: [] });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tasksId.started).toEqual([]);
        expect(body.tasksId.denied).toEqual([{ taskId: 'bad-guid' }]);
    });

    test('allTaskIdsMustExist=true prevents starting valid when body includes invalid taskId', async () => {
        const payload = [{ type: 'starttaskid', payload: { taskId: 'invalid' } }];
        const res = await app.inject({ method: 'PUT', url: '/v4/reloadtask/good-guid/start?allTaskIdsMustExist=true', payload });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tasksId.started).toEqual([]);
        expect(body.tasksId.invalid).toEqual([{ taskId: 'invalid' }]);
        expect(body.tasksId.denied).toContainEqual({ taskId: 'good-guid' });
    });

    test('start tasks by allowed tag and deny disallowed tag', async () => {
        const payload = [
            { type: 'starttasktag', payload: { tag: 'good-tag' } },
            { type: 'starttasktag', payload: { tag: 'bad-tag' } },
        ];
        const res = await app.inject({ method: 'POST', url: '/v4/reloadtask/-/start', payload });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tasksTag).toEqual([{ taskId: 'tag-guid', taskName: 'ByTag' }]);
        expect(body.tasksTagDenied).toEqual([{ tag: 'bad-tag' }]);
    });

    test('start tasks by allowed custom property and deny disallowed property', async () => {
        const payload = [
            { type: 'starttaskcustomproperty', payload: { customPropertyName: 'team', customPropertyValue: 'eng' } },
            { type: 'starttaskcustomproperty', payload: { customPropertyName: 'team', customPropertyValue: 'sales' } },
        ];
        const res = await app.inject({ method: 'POST', url: '/v4/reloadtask/-/start', payload });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.tasksCP).toEqual([{ taskId: 'cp-guid', taskName: 'ByCP' }]);
        expect(body.tasksCPDenied).toEqual([{ name: 'team', value: 'sales' }]);
    });

    test('key value store disabled logs warning and continues', async () => {
        // Turn off KV store
        const { default: globals } = await import('../../../globals.js');
        cfg.kvEnabled = false;

        const payload = [{ type: 'keyvaluestore', payload: { namespace: 'ns', key: 'k', value: 'v', ttl: 0 } }];
        const res = await app.inject({ method: 'POST', url: '/v4/reloadtask/-/start', payload });
        expect(res.statusCode).toBe(200);
        expect(globals.logger.warn).toHaveBeenCalledWith('STARTTASK: Trying to store key-value data, but KV store is not enabled.');
        cfg.kvEnabled = true;
    });
});
