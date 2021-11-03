const fs = require('fs/promises');
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

beforeAll(async () => {
    // Create directories needed for test
    await fs.mkdir('./dir1', { recursive: true });
    await fs.mkdir('./dir2', { recursive: true });

    // Create files to work with
    await fs.writeFile('./dir1/file1.txt', 'Foo');
    await fs.writeFile('./dir1/file2.txt', 'Bar');
});

afterAll(async () => {
    // Remove directories
    await fs.rm('./dir1', { recursive: true });
    await fs.rm('./dir2', { recursive: true });
});

/**
 * Copy file from dir1 to dir2
 * Overwrite
 * Preserve timestamp
 */
describe('PUT /v4/filecopy', () => {
    test('It should respond with 201 to the PUT method', async () => {
        result = await instance.put('/v4/filecopy', {
            fromFile: path.resolve('./dir1/file1.txt'),
            toFile: path.resolve('./dir2/file1.txt'),
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
        expect(result.data.fromFile).toEqual(path.resolve('./dir1/file1.txt'));
        expect(result.data.toFile).toEqual(path.resolve('./dir2/file1.txt'));
        expect(result.data.overwrite).toEqual(true);
        expect(result.data.preserveTimestamp).toEqual(true);
    });
});

/**
 * Copy file from dir1 to dir2
 * Do not overwrite
 * Preserve timestamp
 */
describe('PUT /v4/filecopy (overwrite=false)', () => {
    test('It should respond with 201 to the PUT method', async () => {
        result = await instance.put('/v4/filecopy', {
            fromFile: path.resolve('./dir1/file1.txt'),
            toFile: path.resolve('./dir2/file1.txt'),
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
        expect(result.data.fromFile).toEqual(path.resolve('./dir1/file1.txt'));
        expect(result.data.toFile).toEqual(path.resolve('./dir2/file1.txt'));
        expect(result.data.overwrite).toEqual(false);
        expect(result.data.preserveTimestamp).toEqual(true);
    });
});

/**
 * Move file from dir1 to dir2
 * Overwrite
 */
let file1Stat;
describe('PUT /v4/filemove (overwrite=true)', () => {
    test('It should respond with 201 to the PUT method', async () => {
        // Create files to work with
        await fs.writeFile('./dir1/file1.txt', 'Foo');

        result = await instance.put('/v4/filemove', {
            fromFile: path.resolve('./dir1/file1.txt'),
            toFile: path.resolve('./dir2/file1.txt'),
            overwrite: true,
        });

        try {
            file1Stat = await fs.stat(path.resolve('./dir1/file1.txt'));
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
        expect(result.data.fromFile).toEqual(path.resolve('./dir1/file1.txt'));
        expect(result.data.toFile).toEqual(path.resolve('./dir2/file1.txt'));
        expect(result.data.overwrite).toEqual(true);
    });
});

/**
 * Move file from dir1 to dir2
 * Do not overwrite
 */
describe('PUT /v4/filemove (overwrite=false)', () => {
    test('It should respond with 500 to the PUT method', async () => {
        // Create files to work with
        await fs.writeFile(path.resolve('./dir1/file1.txt'), 'Foo');
        await fs.writeFile(path.resolve('./dir2/file1.txt'), 'Bar');

        try {
            result = await instance.put('/v4/filemove', {
                fromFile: path.resolve('./dir1/file1.txt'),
                toFile: path.resolve('./dir2/file1.txt'),
                overwrite: false,
            });
        } catch (err) {
            result = err.response;
        }

        try {
            file1Stat = await fs.stat(path.resolve('./dir1/file1.txt'));
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
        expect(result.data.statusCode).toBeTruthy();
        expect(result.data.error).toBeTruthy();
        expect(result.data.message).toBeTruthy();
        expect(result.data.statusCode).toEqual(500);
    });
});

/**
 * Delete file from dir2
 * Do not overwrite
 */
describe('DELETE /v4/filedelete', () => {
    test('It should respond with 204 to the DELETE method', async () => {
        // Create files to work with
        await fs.writeFile(path.resolve('./dir2/file2.txt'), 'Bar');

        try {
            result = await instance.delete('/v4/filedelete', {
                data: {
                    deleteFile: path.resolve('./dir2/file2.txt'),
                },
            });
        } catch (err) {
            result = err.response;
        }

        try {
            file1Stat = await fs.stat(path.resolve('./dir2/file2.txt'));
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
 * Create directory under top level QVD dir
 */
const dirQvd = 'qvdDir1';
describe('POST /v4/createdirqvd', () => {
    test('It should respond with 201 to the POST method', async () => {
        // Make sure the directory doesn't aleady exist
        const p = path.join(config.get('Butler.configDirectories.qvdPath'), dirQvd);
        try {
            await fs.rm(p, { recursive: true });
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
            file1Stat = await fs.stat(p);
        } catch (err) {
            file1Stat = null;
        }

        // Clean up
        try {
            await fs.rm(p, { recursive: true });
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
 * Create directory anywhere in file system
 */
const dirTest = './testDir1';
const p = path.resolve(dirTest);
describe('POST /v4/createdir', () => {
    test('It should respond with 201 to the POST method', async () => {
        // Make sure the directory doesn't aleady exist
        try {
            await fs.rm(p, { recursive: true });
        } catch {
            //
        }

        try {
            result = await instance.post('/v4/createdir', {
                directory: p,
            });
        } catch (err) {
            result = err.response;
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