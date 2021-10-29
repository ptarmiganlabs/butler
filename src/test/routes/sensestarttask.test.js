/* eslint-disable camelcase */
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

let taskId_valid1;
let taskId_valid2;
let taskId_valid3;
let taskId_invalid1;
let taskTag1;
let taskTag2;
let taskTag_invalid1;
let taskCPName1;
let taskCPName_invalid1;
let taskCPValue1;
let taskCPValue2;
let taskCPValue_invalid1;
let taskKVNamespace1;
let taskKVKey1;
let taskKVValue1;
let taskKVTtl1;

beforeAll(async () => {
    taskId_valid1 = 'e3b27f50-b1c0-4879-88fc-c7cdd9c1cf3e';
    taskId_valid2 = '7552d9fc-d1bb-4975-9a38-18357de531ea';
    taskId_valid3 = 'fb0f317d-da91-4b86-aafa-0174ae1e8c8f';
    taskId_invalid1 = 'abc';
    taskTag1 = 'startTask1';
    taskTag2 = 'startTask2';
    taskTag_invalid1 = 'startTask_invalid1';
    taskCPName1 = 'taskGroup';
    taskCPName_invalid1 = 'taskGroup_invalid1';
    taskCPValue1 = 'tasks1';
    taskCPValue2 = 'tasks2';
    taskCPValue_invalid1 = 'tasks_invalid1';
    taskKVNamespace1 = 'TestNamespace';
    taskKVKey1 = 'Test key';
    taskKVValue1 = 'Test value';
    taskKVTtl1 = 0;
});

afterAll(async () => {
    //
});

/**
 * Start task using task ID (PUT)
 */
describe('PUT /v4/reloadtask/:taskId/start', () => {
    test('It should respond with 200 when task is started', async () => {
        result = await instance.put(`/v4/reloadtask/${taskId_valid1}/start`, []);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
        expect(result.data.tasksId.started[0]).toHaveProperty('taskName');

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start task using task ID (POST)
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('It should respond with 200 when task is started', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_valid1}/start`, []);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
        expect(result.data.tasksId.started[0]).toHaveProperty('taskName');

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start task using invalid task ID (POST)
 * Invalid (not started) tasks should be returned in separate array
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('It should respond with 200 and invalid tasks in separate when task ID is invalid', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_invalid1}/start`, []);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start 2 tasks
 * One valid (in body) and one invalid (in URL) task ID
 * Set allTaskIdsMustExist to true => no task should be started
 * Invalid (not started) tasks should be returned in separate array
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test allTaskIdsMustExist=true flag when 1 invalid (URL) and 1 valid (body)', async () => {
        result = await instance.post(
            `/v4/reloadtask/${taskId_invalid1}/start`,
            [{ type: 'starttaskid', payload: { taskId: taskId_valid1 } }],
            {
                params: {
                    allTaskIdsMustExist: true,
                },
            }
        );

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(0);
        expect(result.data.tasksId.invalid.length).toBe(1);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start 2 tasks
 * One valid (in body) and one invalid (in URL) task ID
 * Set allTaskIdsMustExist to false => the tasks that are valid should be started
 * Invalid (not started) tasks should be returned in separate array
 *
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test allTaskIdsMustExist=false flag when 1 invalid (URL) and 1 valid (body)', async () => {
        result = await instance.post(
            `/v4/reloadtask/${taskId_invalid1}/start`,
            [{ type: 'starttaskid', payload: { taskId: taskId_valid1 } }],
            {
                params: {
                    allTaskIdsMustExist: false,
                },
            }
        );

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(1);
        expect(result.data.tasksId.invalid.length).toBe(1);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start 2 tasks
 * One valid (in URL) and one invalid (in body) task ID
 * Set allTaskIdsMustExist to true => no task should be started
 * Invalid (not started) tasks should be returned in separate array
 *
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test allTaskIdsMustExist=true flag when 1 invalid (body) and 1 valid (URL)', async () => {
        result = await instance.post(
            `/v4/reloadtask/${taskId_valid1}/start`,
            [{ type: 'starttaskid', payload: { taskId: taskId_invalid1 } }],
            {
                params: {
                    allTaskIdsMustExist: true,
                },
            }
        );

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(0);
        expect(result.data.tasksId.invalid.length).toBe(1);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start 2 tasks
 * One valid (in URL) and one invalid (in body) task ID
 * Set allTaskIdsMustExist to false => the tasks that are valid should be started
 * Invalid (not started) tasks should be returned in separate array
 *
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
        result = await instance.post(
            `/v4/reloadtask/${taskId_valid1}/start`,
            [{ type: 'starttaskid', payload: { taskId: taskId_invalid1 } }],
            {
                params: {
                    allTaskIdsMustExist: false,
                },
            }
        );

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(1);
        expect(result.data.tasksId.invalid.length).toBe(1);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start tasks using 2 tags that exist in Sense
 * Use invalid taskId in URL
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test task start using 2 tags that exist in Sense', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_invalid1}/start`, [
            { type: 'starttasktag', payload: { tag: taskTag1 } },
            { type: 'starttasktag', payload: { tag: taskTag2 } },
        ]);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(0);
        expect(result.data.tasksId.invalid.length).toBe(1);
        expect(result.data.tasksTag.length).toBe(4);
        expect(result.data.tasksCP.length).toBe(0);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start tasks using 2 tags that exist in Sense, and 1 tag that doesn't
 * Use invalid taskId in URL
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test task start using 2 tags that exist in Sense', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_invalid1}/start`, [
            { type: 'starttasktag', payload: { tag: taskTag1 } },
            { type: 'starttasktag', payload: { tag: taskTag2 } },
            { type: 'starttasktag', payload: { tag: taskTag_invalid1 } },
        ]);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(0);
        expect(result.data.tasksId.invalid.length).toBe(1);
        expect(result.data.tasksTag.length).toBe(4);
        expect(result.data.tasksCP.length).toBe(0);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start tasks using 2 custom property/value that exist in Sense
 * Use invalid taskId in URL
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test task start using 2 CPs that exist in Sense', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_invalid1}/start`, [
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue1 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue2 },
            },
        ]);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(0);
        expect(result.data.tasksId.invalid.length).toBe(1);
        expect(result.data.tasksTag.length).toBe(0);
        expect(result.data.tasksCP.length).toBe(4);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start tasks using 2 custom property/value that exist in Sense, 1 CP that doesn't exist, 1 CP that exist but value that doesn't exist
 * Use invalid taskId in URL
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test task start using 2 CPs that exist in Sense and 2 that does not exist', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_invalid1}/start`, [
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue1 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue2 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName_invalid1, customPropertyValue: taskCPValue1 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue_invalid1 },
            },
        ]);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(0);
        expect(result.data.tasksId.invalid.length).toBe(1);
        expect(result.data.tasksTag.length).toBe(0);
        expect(result.data.tasksCP.length).toBe(4);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });
});

/**
 * Start tasks using
 *   - 1 valid taskId in URL
 *   - 2 valid taskId in body
 *   - 1 invalid taskId in body
 *
 *   - 2 custom property/value that exist in Sense
 *   - 1 CP that doesn't exist Sense
 *   - 1 CP that exist but value that doesn't exist
 *
 *   - 2 tags that exist in Sense
 *   - 1 tag that doesn't exist in Sense
 *
 *   - 1 KV pair (ttl=0)
 * Use invalid taskId in URL
 */
describe('POST /v4/reloadtask/:taskId/start', () => {
    test('Test task start using taskIds, tags, CPs, KV pair', async () => {
        result = await instance.post(`/v4/reloadtask/${taskId_valid1}/start`, [
            { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
            { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
            { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
            { type: 'starttasktag', payload: { tag: taskTag1 } },
            { type: 'starttasktag', payload: { tag: taskTag2 } },
            { type: 'starttasktag', payload: { tag: taskTag_invalid1 } },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue1 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue2 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName_invalid1, customPropertyValue: taskCPValue1 },
            },
            {
                type: 'starttaskcustomproperty',
                payload: { customPropertyName: taskCPName1, customPropertyValue: taskCPValue_invalid1 },
            },
            {
                type: 'keyvaluestore',
                payload: { namespace: taskKVNamespace1, key: taskKVKey1, value: taskKVValue1, ttl: taskKVTtl1 },
            },
        ]);

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data).toHaveProperty('tasksId');
        expect(result.data).toHaveProperty('tasksTag');
        expect(result.data).toHaveProperty('tasksCP');

        expect(result.data.tasksId.started.length).toBe(3);
        expect(result.data.tasksId.invalid.length).toBe(1);
        expect(result.data.tasksTag.length).toBe(4);
        expect(result.data.tasksCP.length).toBe(4);

        // Should be arrays
        expect(Array.isArray(result.data.tasksId.started)).toBe(true);
        expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
        expect(Array.isArray(result.data.tasksTag)).toBe(true);
        expect(Array.isArray(result.data.tasksCP)).toBe(true);
    });

    // Verify that KV pair was created
    test('It should respond with 200 when reading KV pair', async () => {
        // Read KV pair that was just created
        try {
            result = await instance.get(`/v4/keyvalues/${taskKVNamespace1}`, { params: { key: taskKVKey1 } });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.log(`err: ${err}`);
        }

        expect(result.status).toBe(200);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.namespace).toBeTruthy();
        expect(result.data.key).toBeTruthy();
        expect(result.data.value).toBeTruthy();
        expect(result.data.namespace).toEqual(taskKVNamespace1);
        expect(result.data.key).toEqual(taskKVKey1);
        expect(result.data.value).toEqual(taskKVValue1);
    });
});
