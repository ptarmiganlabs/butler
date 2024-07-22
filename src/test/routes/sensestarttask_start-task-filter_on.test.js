/* eslint-disable camelcase */
import config from 'config';
import axios from 'axios';

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 15000,
});

let result;

let taskId_valid1;
let taskId_valid2;
let taskId_valid3;
let taskId_invalid1;
let taskId_notallowed1;
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
    taskId_valid1 = '25732e8f-a96f-44c0-ba81-7407a2ef4c8a';
    taskId_valid2 = '62a91752-0340-4db4-ab1f-4df4e671ea60';
    taskId_valid3 = '61775211-8284-439e-b338-9a73e1e79e08';
    taskId_invalid1 = 'abc';
    taskId_notallowed1 = '16cd2478-6cf2-4133-8fc7-7e9b97a92337';
    taskTag1 = 'startTask1';
    taskTag2 = 'startTask2';
    taskTag_invalid1 = 'startTask_invalid1';
    // taskTag_notallowed1 = 'startTask_notallowed1';
    taskCPName1 = 'taskGroup';
    taskCPName_invalid1 = 'taskGroup_invalid1';
    // taskCPName_notallowed1 = 'taskGroup_notallowed1';
    taskCPValue1 = 'tasks1';
    taskCPValue2 = 'tasks2';
    taskCPValue_invalid1 = 'tasks_invalid1';
    // taskCPValue_notallowed1 = 'tasks_notallowed1';
    taskKVNamespace1 = 'TestNamespace';
    taskKVKey1 = 'Test key';
    taskKVValue1 = 'Test value';
    taskKVTtl1 = 0;
});

afterAll(async () => {
    //
});

// Dummy test to ensure there is at least one test enabled in the test file
describe('Config file', () => {
    test('Config file should be named production', async () => {
        expect(process.env.NODE_ENV).toBe('production');
    });
});

// NOTE: File in docs folder in GitHub repo contains full test case specification
if (config.get('Butler.startTaskFilter.enable') === true) {
    // Tests to run when task filtering/approval is enabled in the config file

    /**
     * A1
     */
    describe('A1: taskFilter=on: PUT /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(1);
            expect(result.data.tasksId.invalid.length).toBe(0);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
            expect(result.data.tasksId.started[0]).toHaveProperty('taskName');
        });
    });

    /**
     * A2
     */
    describe('A2: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(1);
            expect(result.data.tasksId.invalid.length).toBe(0);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
            expect(result.data.tasksId.started[0]).toHaveProperty('taskName');
        });
    });

    /**
     * A3
     */
    describe('A3: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A4
     */
    describe('A4: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=true flag when 1 invalid (URL) and 1 valid (body)', async () => {
            result = await instance.post(`/v4/reloadtask/${taskId_invalid1}/start`, [], {
                params: {
                    allTaskIdsMustExist: true,
                },
            });

            expect(result.status).toBe(200);
        });

        test('Response should be an object', () => {
            expect(result.data).toBeTruthy();
            expect(typeof result.data).toBe('object');
        });

        test('Response should contain correct fields', () => {
            expect(result.data).toHaveProperty('tasksId');
            expect(result.data).toHaveProperty('tasksTag');
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A5
     */
    describe('A5: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (URL) and 1 valid (body)', async () => {
            result = await instance.post(
                `/v4/reloadtask/${taskId_invalid1}/start`,
                [{ type: 'starttaskid', payload: { taskId: taskId_valid1 } }],
                {
                    params: {
                        allTaskIdsMustExist: false,
                    },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(1);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
            expect(result.data.tasksId.started[0]).toHaveProperty('taskName');
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A6
     */
    describe('A6: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=true flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(
                `/v4/reloadtask/${taskId_notallowed1}/start`,
                [{ type: 'starttaskid', payload: { taskId: taskId_invalid1 } }],
                {
                    params: {
                        allTaskIdsMustExist: true,
                    },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(1);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
            expect(result.data.tasksId.denied[0].taskId).toEqual(taskId_notallowed1);
        });
    });

    /**
     * A7
     */
    describe('A7: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(
                `/v4/reloadtask/${taskId_valid1}/start`,
                [{ type: 'starttaskid', payload: { taskId: taskId_invalid1 } }],
                {
                    params: {
                        allTaskIdsMustExist: false,
                    },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(1);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
            expect(result.data.tasksId.started[0]).toHaveProperty('taskName');
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A8
     */
    describe('A8: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(5);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A9
     */
    describe('A9: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(5);
            expect(result.data.tasksTagDenied.length).toBe(1);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
            expect(result.data.tasksTagDenied[0].tag).toEqual(taskTag_invalid1);
        });
    });

    /**
     * A10
     */
    describe('A10: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(4);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A11
     */
    describe('A11: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(4);
            expect(result.data.tasksCPDenied.length).toBe(2);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A12
     */
    describe('A12: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
        test('Test task start using taskIds, tags, CPs, KV pair', async () => {
            result = await instance.post(`/v4/reloadtask/${taskId_valid1}/start`, [
                { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
                { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
                { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
                { type: 'starttaskid', payload: { taskId: taskId_notallowed1 } },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(3);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(1);
            expect(result.data.tasksTag.length).toBe(5);
            expect(result.data.tasksTagDenied.length).toBe(1);
            expect(result.data.tasksCP.length).toBe(4);
            expect(result.data.tasksCPDenied.length).toBe(2);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
            expect(result.data.tasksId.denied[0].taskId).toEqual(taskId_notallowed1);
            expect(result.data.tasksTagDenied[0].tag).toEqual(taskTag_invalid1);
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

    /**
     * A29
     */
    describe('A29: taskFilter=off: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(`/v4/reloadtask/-/start`, [{ type: 'starttaskid', payload: { taskId: taskId_valid1 } }]);

            expect(result.status).toBe(200);
        });

        test('Response should be an object', () => {
            expect(result.data).toBeTruthy();
            expect(typeof result.data).toBe('object');
        });

        test('Response should contain correct fields', () => {
            expect(result.data).toHaveProperty('tasksId');
            expect(result.data).toHaveProperty('tasksTag');
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(1);
            expect(result.data.tasksId.invalid.length).toBe(0);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.started[0].taskId).toEqual(taskId_valid1);
            expect(result.data.tasksId.started[0]).toHaveProperty('taskName');
        });
    });

    /**
     * A30
     */
    describe('A30: taskFilter=off: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(`/v4/reloadtask/-/start`, [{ type: 'starttaskid', payload: { taskId: taskId_invalid1 } }]);

            expect(result.status).toBe(200);
        });

        test('Response should be an object', () => {
            expect(result.data).toBeTruthy();
            expect(typeof result.data).toBe('object');
        });

        test('Response should contain correct fields', () => {
            expect(result.data).toHaveProperty('tasksId');
            expect(result.data).toHaveProperty('tasksTag');
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(0);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A31
     */
    describe('A31: taskFilter=off: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(`/v4/reloadtask/-/start`, [
                { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
                { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
                { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
                { type: 'starttaskid', payload: { taskId: taskId_notallowed1 } },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(2);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(1);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
            expect(result.data.tasksId.denied[0].taskId).toEqual(taskId_notallowed1);
        });
    });

    /**
     * A32
     */
    describe('A32: taskFilter=off: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(
                `/v4/reloadtask/-/start`,
                [
                    { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
                    { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
                    { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
                    { type: 'starttaskid', payload: { taskId: taskId_notallowed1 } },
                ],
                {
                    params: {
                        allTaskIdsMustExist: true,
                    },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(3);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A35
     */
    describe('A32: taskFilter=off: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(
                `/v4/reloadtask/${taskId_valid1}/start`,
                [
                    { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
                    { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
                    { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
                    { type: 'starttaskid', payload: { taskId: taskId_notallowed1 } },
                ],
                {
                    params: {
                        allTaskIdsMustExist: true,
                    },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(0);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(4);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
        });
    });

    /**
     * A36
     */
    describe('A32: taskFilter=off: POST /v4/reloadtask/:taskId/start', () => {
        test('Test allTaskIdsMustExist=false flag when 1 invalid (body) and 1 valid (URL)', async () => {
            result = await instance.post(
                `/v4/reloadtask/${taskId_valid1}/start`,
                [
                    { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
                    { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
                    { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
                    { type: 'starttaskid', payload: { taskId: taskId_notallowed1 } },
                ],
                {
                    params: {
                        allTaskIdsMustExist: false,
                    },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(3);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(1);
            expect(result.data.tasksTag.length).toBe(0);
            expect(result.data.tasksTagDenied.length).toBe(0);
            expect(result.data.tasksCP.length).toBe(0);
            expect(result.data.tasksCPDenied.length).toBe(0);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
            expect(result.data.tasksId.denied[0].taskId).toEqual(taskId_notallowed1);
        });
    });

    /**
     * A38
     * Verify correct result code when "Expect: 100-Continue" is used in call to API
     */
    describe('A38: taskFilter=on: POST /v4/reloadtask/:taskId/start', () => {
        test('Test task start using taskIds, tags, CPs, KV pair', async () => {
            result = await instance.post(
                `/v4/reloadtask/${taskId_valid1}/start`,
                [
                    { type: 'starttaskid', payload: { taskId: taskId_valid2 } },
                    { type: 'starttaskid', payload: { taskId: taskId_invalid1 } },
                    { type: 'starttaskid', payload: { taskId: taskId_valid3 } },
                    { type: 'starttaskid', payload: { taskId: taskId_notallowed1 } },
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
                ],
                {
                    headers: { Expect: '100-Continue' },
                },
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
            expect(result.data).toHaveProperty('tasksTagDenied');
            expect(result.data).toHaveProperty('tasksCP');
            expect(result.data).toHaveProperty('tasksCPDenied');

            // Should be arrays
            expect(Array.isArray(result.data.tasksId.started)).toBe(true);
            expect(Array.isArray(result.data.tasksId.invalid)).toBe(true);
            expect(Array.isArray(result.data.tasksId.denied)).toBe(true);
            expect(Array.isArray(result.data.tasksTag)).toBe(true);
            expect(Array.isArray(result.data.tasksTagDenied)).toBe(true);
            expect(Array.isArray(result.data.tasksCP)).toBe(true);
            expect(Array.isArray(result.data.tasksCPDenied)).toBe(true);

            expect(result.data.tasksId.started.length).toBe(3);
            expect(result.data.tasksId.invalid.length).toBe(1);
            expect(result.data.tasksId.denied.length).toBe(1);
            expect(result.data.tasksTag.length).toBe(5);
            expect(result.data.tasksTagDenied.length).toBe(1);
            expect(result.data.tasksCP.length).toBe(4);
            expect(result.data.tasksCPDenied.length).toBe(2);

            // Detailed checks
            expect(result.data.tasksId.invalid[0].taskId).toEqual(taskId_invalid1);
            expect(result.data.tasksId.denied[0].taskId).toEqual(taskId_notallowed1);
            expect(result.data.tasksTagDenied[0].tag).toEqual(taskTag_invalid1);
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
}
