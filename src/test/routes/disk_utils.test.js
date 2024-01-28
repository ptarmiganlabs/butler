/* eslint-disable no-console */
/* eslint-disable camelcase */
import config from 'config';
import fs from 'fs/promises';
import upath from 'upath';
import axios from 'axios';
import isDirectoryChildOf from '../../lib/disk_utils.js';

const instance = axios.create({
    baseURL: `http://localhost:${config.get('Butler.restServerConfig.serverPort')}`,
    timeout: 15000,
});

let result;
let dir1;
let dir1Dir2;
let dir2;
let dir2Dir3;

let dir1File1_1;
let dir1Dir2File1_1;
let dir1File2_1;
let dir2File1_1;
let dir2File2_1;
let dir2Dir3File1_1;
let dir2Dir3File2_1;
let dirQvd;

beforeAll(async () => {
    dir1 = './dir1';
    dir1Dir2 = './dir1/dir2';
    dir2 = './dir2';
    dir2Dir3 = './dir2/dir3';

    dir1File1_1 = './dir1/file1.txt';
    dir1Dir2File1_1 = './dir1/dir2/file1.txt';
    dir1File2_1 = './dir1/file2.txt';
    dir2File1_1 = './dir2/file1.txt';
    dir2File2_1 = './dir2/file2.txt';
    dir2Dir3File1_1 = './dir2/dir3/file1.txt';
    dir2Dir3File2_1 = './dir2/dir3/file2.txt';
    dirQvd = 'qvdDir1';

    // Create directories needed for test
    await fs.mkdir(dir1, { recursive: true });
    await fs.mkdir(dir1Dir2, { recursive: true });
    await fs.mkdir(dir2, { recursive: true });
    await fs.mkdir(dir2Dir3, { recursive: true });

    // Create files to work with
    await fs.writeFile(dir1File1_1, 'Foo1');
    await fs.writeFile(dir1Dir2File1_1, 'Foo1');
    await fs.writeFile(dir1File2_1, 'Bar1');
    await fs.writeFile(dir2Dir3File1_1, 'Foo3');
    await fs.writeFile(dir2Dir3File2_1, 'Bar3');
});

afterAll(async () => {
    // Remove directories
    await fs.rm(dir1, { recursive: true });
    await fs.rm(dir2, { recursive: true });
});

/**
 * E1
 * Copy file from dir1 to dir2
 * Overwrite
 * Preserve timestamp
 */
describe('E1: PUT /v4/filecopy', () => {
    test('Copy from/to root of approved dir. It should respond with 201 to the PUT method', async () => {
        result = await instance.put('/v4/filecopy', {
            fromFile: upath.resolve(dir1File1_1),
            toFile: upath.resolve(dir2File1_1),
            overwrite: true,
            preserveTimestamp: true,
        });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.fromFile).toBeTruthy();
        expect(result.data.toFile).toBeTruthy();
        expect(result.data.overwrite).toBeTruthy();
        expect(result.data.preserveTimestamp).toBeTruthy();
        expect(result.data.fromFile).toEqual(upath.normalizeSafe(upath.resolve(dir1File1_1)));
        expect(result.data.toFile).toEqual(upath.resolve(dir2File1_1));
        expect(result.data.overwrite).toEqual(true);
        expect(result.data.preserveTimestamp).toEqual(true);
    });

    //
    test('Copy from/to subdir of approved dir. It should respond with 201 to the PUT method', async () => {
        result = await instance.put('/v4/filecopy', {
            fromFile: upath.resolve(dir1Dir2File1_1),
            toFile: upath.resolve(dir2Dir3File2_1),
            overwrite: true,
            preserveTimestamp: true,
        });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.fromFile).toBeTruthy();
        expect(result.data.toFile).toBeTruthy();
        expect(result.data.overwrite).toBeTruthy();
        expect(result.data.preserveTimestamp).toBeTruthy();
        expect(result.data.fromFile).toEqual(upath.normalizeSafe(upath.resolve(dir1Dir2File1_1)));
        expect(result.data.toFile).toEqual(upath.resolve(dir2Dir3File2_1));
        expect(result.data.overwrite).toEqual(true);
        expect(result.data.preserveTimestamp).toEqual(true);
    });
});

/**
 * E2
 * Copy file from dir1 to dir2
 * Do not overwrite
 * Preserve timestamp
 */
describe('E2: PUT /v4/filecopy (overwrite=false)', () => {
    test('It should respond with 201 to the PUT method', async () => {
        result = await instance.put('/v4/filecopy', {
            fromFile: upath.resolve(dir1File1_1),
            toFile: upath.resolve(dir2File1_1),
            overwrite: false,
            preserveTimestamp: true,
        });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(result.data.fromFile).toEqual(upath.normalizeSafe(upath.resolve(dir1File1_1)));
        expect(result.data.toFile).toEqual(upath.resolve(dir2File1_1));
        expect(result.data.overwrite).toEqual(false);
        expect(result.data.preserveTimestamp).toEqual(true);
    });
});

/**
 * E3
 * Move file from dir1 to dir2
 * Overwrite
 */
let file1Stat;
describe('E3: PUT /v4/filemove (overwrite=true)', () => {
    test('Move from/to root of approved dir. It should respond with 201 to the PUT method', async () => {
        // Create files to work with
        await fs.writeFile(dir1File1_1, 'Foo');

        result = await instance.put('/v4/filemove', {
            fromFile: upath.resolve(dir1File1_1),
            toFile: upath.resolve(dir2File1_1),
            overwrite: true,
        });

        try {
            // Does source file still exist?
            file1Stat = await fs.stat(upath.resolve(dir1File1_1));
        } catch (err) {
            file1Stat = null;
        }

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(file1Stat).toBeFalsy();
        expect(result.data.fromFile).toEqual(upath.normalizeSafe(upath.resolve(dir1File1_1)));
        expect(result.data.toFile).toEqual(upath.resolve(dir2File1_1));
        expect(result.data.overwrite).toEqual(true);
    });

    //
    test('Move from/to subdir of approved dir. It should respond with 201 to the PUT method', async () => {
        result = await instance.put('/v4/filemove', {
            fromFile: upath.resolve(dir1Dir2File1_1),
            toFile: upath.resolve(dir2Dir3File2_1),
            overwrite: true,
        });

        expect(result.status).toBe(201);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Response should contain correct fields', () => {
        expect(file1Stat).toBeFalsy();
        expect(result.data.fromFile).toEqual(upath.normalizeSafe(upath.resolve(dir1Dir2File1_1)));
        expect(result.data.toFile).toEqual(upath.resolve(dir2Dir3File2_1));
        expect(result.data.overwrite).toEqual(true);
    });
});

/**
 * E4
 * Move file from dir1 to dir2
 * Do not overwrite
 */
describe('E4: PUT /v4/filemove (overwrite=false)', () => {
    test('It should respond with 500 to the PUT method', async () => {
        // Create files to work with
        await fs.writeFile(upath.resolve(dir1File1_1), 'Foo');
        await fs.writeFile(upath.resolve(dir2File1_1), 'Bar');

        try {
            result = await instance.put('/v4/filemove', {
                fromFile: upath.resolve(dir1File1_1),
                toFile: upath.resolve(dir2File1_1),
                overwrite: false,
            });
        } catch (err) {
            result = err.response;
        }

        try {
            // Does source file still exist?
            file1Stat = await fs.stat(upath.resolve(dir1File1_1));
        } catch (err) {
            file1Stat = null;
        }

        expect(result.status).toBe(500);
    });

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('Source file should still exist', () => {
        expect(file1Stat).toBeTruthy();
    });

    test('Response should contain correct fields', () => {
        expect(file1Stat).toBeTruthy();
        expect(result.data.statusCode).toBeTruthy();
        expect(result.data.error).toBeTruthy();
        expect(result.data.message).toBeTruthy();
        expect(result.data.statusCode).toEqual(500);
    });
});

/**
 * E5
 * Delete file from dir2
 * Do not overwrite
 */
describe('E5: DELETE /v4/filedelete', () => {
    test('It should respond with 204 to the DELETE method', async () => {
        // Create files to work with
        await fs.writeFile(upath.resolve(dir2File2_1), 'Bar');

        try {
            result = await instance.delete('/v4/filedelete', {
                data: {
                    deleteFile: upath.resolve(dir2File2_1),
                },
            });
        } catch (err) {
            result = err.response;
        }

        try {
            file1Stat = await fs.stat(upath.resolve(dir2File2_1));
        } catch (err) {
            file1Stat = null;
        }

        expect(result.status).toBe(204);
    });

    test('Response should be empty', () => {
        expect(result.data).toEqual('');
    });

    test('Source file should no longer exist', () => {
        expect(file1Stat).toBeFalsy();
    });

    //
    test('Delete file in subdir of approved dir. It should respond with 201 to the PUT method', async () => {
        try {
            result = await instance.delete('/v4/filedelete', {
                data: {
                    deleteFile: upath.resolve(dir2Dir3File2_1),
                },
            });
        } catch (err) {
            result = err.response;
        }

        try {
            file1Stat = await fs.stat(upath.resolve(dir2Dir3File2_1));
        } catch (err) {
            file1Stat = null;
        }

        expect(result.status).toBe(204);
    });

    test('Response should be empty', () => {
        expect(result.data).toEqual('');
    });

    test('Source file should no longer exist', () => {
        expect(file1Stat).toBeFalsy();
    });
});

/**
 * E6
 * Create directory under top level QVD dir
 */
describe('E6: POST /v4/createdirqvd', () => {
    test('It should respond with 201 to the POST method', async () => {
        // Make sure the directory doesn't aleady exist
        const p2 = upath.join(config.get('Butler.configDirectories.qvdPath'), dirQvd);
        try {
            await fs.rm(p2, { recursive: true });
        } catch {
            //
        }

        try {
            result = await instance.post('/v4/createdirqvd', {
                directory: dirQvd,
            });
        } catch (err) {
            result = err.response;
        }

        // Wait for a bit
        await new Promise((r) => setTimeout(r, 2000));

        try {
            file1Stat = await fs.stat(p2);
        } catch (err) {
            file1Stat = null;
        }

        // Clean up
        try {
            await fs.rm(p2, { recursive: true });
        } catch {
            //
        }

        // console.log(file1Stat);
        expect(result.status).toBe(201);
    }, 10000);

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('New QVD directory should exist', async () => {
        // Wait for a bit
        await new Promise((r) => setTimeout(r, 2000));
        expect(file1Stat).toBeTruthy();
    });

    test('Response should contain correct fields', () => {
        expect(result.data.directory).toBeTruthy();
        expect(result.data.directory).toEqual(dirQvd);
    });
});

/**
 * E7
 * Create directory anywhere in file system
 */
const dirTest = './testDir1';
const p = upath.resolve(dirTest);
describe('E7: POST /v4/createdir', () => {
    test('It should respond with 201 to the POST method', async () => {
        // Make sure the directory doesn't aleady exist
        try {
            await fs.rm(p, { recursive: true });
        } catch {
            //
            console.log('Error deleting test directory. Does not exist? (1)');
        }

        try {
            result = await instance.post('/v4/createdir', {
                directory: p,
            });
        } catch (err) {
            result = err.response;
            console.log('Error creating test directory');
        }

        // Wait for a bit
        await new Promise((r) => setTimeout(r, 2000));

        try {
            file1Stat = await fs.stat(p);
        } catch (err) {
            file1Stat = null;
        }

        // Clean up
        try {
            await fs.rm(p, { recursive: true });
        } catch {
            //
            console.log('Error deleting test directory. Does not exist? (2)');
        }

        // console.log(file1Stat);
        expect(result.status).toBe(201);
    }, 10000);

    test('Response should be an object', () => {
        expect(result.data).toBeTruthy();
        expect(typeof result.data).toBe('object');
    });

    test('New directory should exist', () => {
        expect(file1Stat).toBeTruthy();
    });

    test('Response should contain correct fields', () => {
        expect(result.data.directory).toBeTruthy();
        expect(result.data.directory).toEqual(p);
    });
});

/**
 * E8
 * Ensure that isDirectoryChildOf works as expected
 */
const dirParent1 = './testDir1';
const dirParent2 = './testDir1/testDir2';
const dirParent3 = './testDir1/testDir2/';

const dirChild1 = './testDir1';
const dirChild2 = './testDir1/testDir2';
const dirChild3 = './testDir1/testDir2/';
const dirChild4 = './testDir1/testDir2/testDir3';
const dirChild5 = './testDir1/testDir2/testDir3/testDir4';
const dirChild6 = './testDir1/testDir2/testDir3/testDir4/';

describe('E8: isDirectoryChildOf', () => {
    test(`"${dirChild1}" is a child of "${dirParent1}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild1, dirParent1);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild2}" is a child of "${dirParent2}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild2, dirParent2);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild3}" is a child of "${dirParent2}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild3, dirParent2);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild3}" is a child of "${dirParent3}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild3, dirParent3);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild2}" is a child of "${dirParent3}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild2, dirParent3);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild4}" is a child of "${dirParent2}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild4, dirParent2);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild5}" is a child of "${dirParent2}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild5, dirParent2);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    test(`"${dirChild6}" is a child of "${dirParent2}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild6, dirParent2);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(true);
    }, 5000);

    // Test failure cases where child directory is not a child of parent
    test(`"${dirChild1}" is not a child of "${dirParent2}"`, async () => {
        try {
            result = isDirectoryChildOf(dirChild1, dirParent2);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(false);
    }, 5000);

    test(`"${dirParent1}" is not a child of "${dirChild4}"`, async () => {
        try {
            result = isDirectoryChildOf(dirParent1, dirChild4);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(false);
    }, 5000);

    test(`"${dirParent1}" is not a child of "${dirChild5}"`, async () => {
        try {
            result = isDirectoryChildOf(dirParent1, dirChild5);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(false);
    }, 5000);

    test(`"${dirParent1}" is not a child of "${dirChild6}"`, async () => {
        try {
            result = isDirectoryChildOf(dirParent1, dirChild6);
        } catch (err) {
            result = err.response;
            console.log('Error testing isDirectoryChildOf');
        }

        expect(result).toBe(false);
    }, 5000);
});
