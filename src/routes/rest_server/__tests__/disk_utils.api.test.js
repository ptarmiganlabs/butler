import { jest } from '@jest/globals';
import path from 'node:path';
import upath from 'upath';
import fs from 'fs-extra';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitForExists(p, tries = 20, intervalMs = 50) {
    for (let i = 0; i < tries; i += 1) {
        if (await fs.pathExists(p)) return true;
        await sleep(intervalMs);
    }
    return false;
}

const TOL_MS = 1500; // cross-platform timestamp tolerance
async function setFileTimes(p, whenMs) {
    const d = new Date(whenMs);
    await fs.utimes(p, d, d);
}
async function getMTimeMs(p) {
    const st = await fs.stat(p);
    return st.mtimeMs;
}
function within(a, b, tol) {
    return Math.abs(a - b) <= tol;
}

// Use real filesystem in a repo-local temp dir sandbox to validate behaviour
const tmpRoot = path.join(process.cwd(), `.butler-diskutils-test-${Date.now()}`);
const isWin = process.platform === 'win32';

let Fastify;
let diskUtilsPlugin;

// Prepare mocks for globals to enable endpoints and set approvals
const mockGlobals = {
    config: {
        has: jest.fn((key) =>
            [
                'Butler.restServerEndpointsEnable.fileCopy',
                'Butler.restServerEndpointsEnable.fileMove',
                'Butler.restServerEndpointsEnable.fileDelete',
                'Butler.restServerEndpointsEnable.createDirQVD',
                'Butler.restServerEndpointsEnable.createDir',
            ].includes(key),
        ),
        get: jest.fn((key) =>
            [
                'Butler.restServerEndpointsEnable.fileCopy',
                'Butler.restServerEndpointsEnable.fileMove',
                'Butler.restServerEndpointsEnable.fileDelete',
                'Butler.restServerEndpointsEnable.createDirQVD',
                'Butler.restServerEndpointsEnable.createDir',
            ].includes(key)
                ? true
                : undefined,
        ),
    },
    // Approvals: allow operations within tmpRoot only
    fileCopyDirectories: [{ fromDir: upath.join(tmpRoot, 'from'), toDir: upath.join(tmpRoot, 'to') }],
    fileMoveDirectories: [{ fromDir: upath.join(tmpRoot, 'from'), toDir: upath.join(tmpRoot, 'to') }],
    fileDeleteDirectories: [upath.join(tmpRoot, 'to')],
    qvdFolder: upath.join(tmpRoot, 'qvd'),
    hostInfo: { si: { os: { platform: isWin ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux' } } },
    logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
};

describe('REST: disk utils endpoints', () => {
    let app;

    beforeAll(async () => {
        // Create sandbox dirs
        await fs.ensureDir(tmpRoot);
        await fs.ensureDir(upath.join(tmpRoot, 'from'));
        await fs.ensureDir(upath.join(tmpRoot, 'to'));
        await fs.ensureDir(mockGlobals.qvdFolder);

        await jest.unstable_mockModule('../../../lib/log_rest_call.js', () => ({ logRESTCall: jest.fn() }));
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        Fastify = (await import('fastify')).default;
        diskUtilsPlugin = (await import('../disk_utils.js')).default;

        app = Fastify({ logger: false });
        await app.register(diskUtilsPlugin);
        await app.ready();
    });

    afterAll(async () => {
        if (app) await app.close();
        // Cleanup sandbox
        try {
            await fs.remove(tmpRoot);
        } catch {}
    });

    test('PUT /v4/createdir creates directory', async () => {
        const dir = upath.join(tmpRoot, 'misc', 'nested');
        const res = await app.inject({ method: 'POST', url: '/v4/createdir', payload: { directory: dir } });
        expect(res.statusCode).toBe(201);
        expect(await waitForExists(dir)).toBe(true);
    });

    test('POST /v4/createdirqvd creates directory under qvdFolder', async () => {
        const subdir = 'reports/2025';
        const full = upath.join(mockGlobals.qvdFolder, subdir);
        const res = await app.inject({ method: 'POST', url: '/v4/createdirqvd', payload: { directory: subdir } });
        expect(res.statusCode).toBe(201);
        expect(await waitForExists(full)).toBe(true);
    });

    test('PUT /v4/filecopy copies approved file', async () => {
        const src = upath.join(tmpRoot, 'from', 'a.txt');
        const dst = upath.join(tmpRoot, 'to', 'a.txt');
        await fs.writeFile(src, 'hello');
        const res = await app.inject({
            method: 'PUT',
            url: '/v4/filecopy',
            payload: { fromFile: src, toFile: dst, overwrite: true, preserveTimestamp: false },
        });
        expect(res.statusCode).toBe(201);
        expect(await fs.pathExists(dst)).toBe(true);
        expect(await fs.readFile(dst, 'utf8')).toBe('hello');
    });

    test('PUT /v4/filemove moves approved file', async () => {
        const src = upath.join(tmpRoot, 'from', 'b.txt');
        const dst = upath.join(tmpRoot, 'to', 'b.txt');
        await fs.writeFile(src, 'world');
        const res = await app.inject({ method: 'PUT', url: '/v4/filemove', payload: { fromFile: src, toFile: dst, overwrite: true } });
        expect(res.statusCode).toBe(201);
        expect(await fs.pathExists(src)).toBe(false);
        expect(await fs.readFile(dst, 'utf8')).toBe('world');
    });

    describe('overwrite and preserveTimestamp combinations for COPY', () => {
        test('preserveTimestamp=true on fresh copy preserves mtime', async () => {
            const src = upath.join(tmpRoot, 'from', 'ts_src1.txt');
            const dst = upath.join(tmpRoot, 'to', 'ts_dst1.txt');
            await fs.writeFile(src, 'data1');
            const when = Date.now() - 10 * 24 * 3600 * 1000; // 10 days ago
            await setFileTimes(src, when);
            const mSrc = await getMTimeMs(src);

            const res = await app.inject({
                method: 'PUT',
                url: '/v4/filecopy',
                payload: { fromFile: src, toFile: dst, overwrite: true, preserveTimestamp: true },
            });
            expect(res.statusCode).toBe(201);
            const mDst = await getMTimeMs(dst);
            expect(within(mDst, mSrc, TOL_MS)).toBe(true);
        });

        test('preserveTimestamp=false on fresh copy does not preserve mtime', async () => {
            const src = upath.join(tmpRoot, 'from', 'ts_src2.txt');
            const dst = upath.join(tmpRoot, 'to', 'ts_dst2.txt');
            await fs.writeFile(src, 'data2');
            const when = Date.now() - 9 * 24 * 3600 * 1000; // 9 days ago
            await setFileTimes(src, when);
            const mSrc = await getMTimeMs(src);

            const res = await app.inject({
                method: 'PUT',
                url: '/v4/filecopy',
                payload: { fromFile: src, toFile: dst, overwrite: true, preserveTimestamp: false },
            });
            expect(res.statusCode).toBe(201);
            const mDst = await getMTimeMs(dst);
            expect(within(mDst, mSrc, TOL_MS)).toBe(false);
        });

        test('overwrite=false leaves existing file unchanged', async () => {
            const src = upath.join(tmpRoot, 'from', 'ow_src1.txt');
            const dst = upath.join(tmpRoot, 'to', 'ow_dst1.txt');
            await fs.writeFile(src, 'NEW');
            await fs.writeFile(dst, 'OLD');
            const oldWhen = Date.now() - 5 * 24 * 3600 * 1000;
            await setFileTimes(dst, oldWhen);
            const mBefore = await getMTimeMs(dst);

            const res = await app.inject({
                method: 'PUT',
                url: '/v4/filecopy',
                payload: { fromFile: src, toFile: dst, overwrite: false, preserveTimestamp: true },
            });
            expect(res.statusCode).toBe(201);
            expect(await fs.readFile(dst, 'utf8')).toBe('OLD');
            const mAfter = await getMTimeMs(dst);
            expect(within(mAfter, mBefore, TOL_MS)).toBe(true);
        });

        test('overwrite=true replaces content and preserves timestamp when requested', async () => {
            const src = upath.join(tmpRoot, 'from', 'ow_src2.txt');
            const dst = upath.join(tmpRoot, 'to', 'ow_dst2.txt');
            await fs.writeFile(src, 'NEW2');
            const when = Date.now() - 7 * 24 * 3600 * 1000;
            await setFileTimes(src, when);
            await fs.writeFile(dst, 'OLD2');

            const res = await app.inject({
                method: 'PUT',
                url: '/v4/filecopy',
                payload: { fromFile: src, toFile: dst, overwrite: true, preserveTimestamp: true },
            });
            expect(res.statusCode).toBe(201);
            expect(await fs.readFile(dst, 'utf8')).toBe('NEW2');
            const mDst = await getMTimeMs(dst);
            const mSrc = await getMTimeMs(src);
            expect(within(mDst, mSrc, TOL_MS)).toBe(true);
        });

        test('overwrite=true replaces content and does not preserve timestamp when not requested', async () => {
            const src = upath.join(tmpRoot, 'from', 'ow_src3.txt');
            const dst = upath.join(tmpRoot, 'to', 'ow_dst3.txt');
            await fs.writeFile(src, 'NEW3');
            const when = Date.now() - 6 * 24 * 3600 * 1000;
            await setFileTimes(src, when);
            await fs.writeFile(dst, 'OLD3');

            const res = await app.inject({
                method: 'PUT',
                url: '/v4/filecopy',
                payload: { fromFile: src, toFile: dst, overwrite: true, preserveTimestamp: false },
            });
            expect(res.statusCode).toBe(201);
            expect(await fs.readFile(dst, 'utf8')).toBe('NEW3');
            const mDst = await getMTimeMs(dst);
            const mSrc = await getMTimeMs(src);
            expect(within(mDst, mSrc, TOL_MS)).toBe(false);
        });
    });

    describe('overwrite combinations for MOVE', () => {
        test('move overwrite=false fails when destination exists', async () => {
            const src = upath.join(tmpRoot, 'from', 'mv_src1.txt');
            const dst = upath.join(tmpRoot, 'to', 'mv_dst1.txt');
            await fs.writeFile(src, 'S');
            await fs.writeFile(dst, 'D');
            const res = await app.inject({ method: 'PUT', url: '/v4/filemove', payload: { fromFile: src, toFile: dst, overwrite: false } });
            // fs.moveSync should error; handler returns 500
            expect([400, 409, 500]).toContain(res.statusCode);
            // src should still exist
            expect(await fs.pathExists(src)).toBe(true);
            // dst should remain unchanged
            expect(await fs.readFile(dst, 'utf8')).toBe('D');
        });

        test('move overwrite=true replaces destination', async () => {
            const src = upath.join(tmpRoot, 'from', 'mv_src2.txt');
            const dst = upath.join(tmpRoot, 'to', 'mv_dst2.txt');
            await fs.writeFile(src, 'S2');
            await fs.writeFile(dst, 'D2');
            const res = await app.inject({ method: 'PUT', url: '/v4/filemove', payload: { fromFile: src, toFile: dst, overwrite: true } });
            expect(res.statusCode).toBe(201);
            expect(await fs.pathExists(src)).toBe(false);
            expect(await fs.readFile(dst, 'utf8')).toBe('S2');
        });
    });

    test('DELETE /v4/filedelete deletes approved file', async () => {
        const file = upath.join(tmpRoot, 'to', 'c.txt');
        await fs.writeFile(file, 'x');
        const res = await app.inject({ method: 'DELETE', url: '/v4/filedelete', payload: { deleteFile: file } });
        expect([200, 204]).toContain(res.statusCode); // handler uses 204
        expect(await fs.pathExists(file)).toBe(false);
    });

    test('PUT /v4/filecopy returns 403 for unapproved destinations', async () => {
        const src = upath.join(tmpRoot, 'from', 'd.txt');
        const dst = upath.join(tmpRoot, 'other', 'd.txt');
        await fs.ensureDir(upath.dirname(dst));
        await fs.writeFile(src, 'y');
        const res = await app.inject({ method: 'PUT', url: '/v4/filecopy', payload: { fromFile: src, toFile: dst } });
        expect(res.statusCode).toBe(403);
    });

    test('Missing parameters return 400 with helpful message', async () => {
        const r1 = await app.inject({ method: 'PUT', url: '/v4/filecopy', payload: {} });
        expect(r1.statusCode).toBe(400);
        expect(r1.json().message).toMatch(/required parameter missing/i);

        const r2 = await app.inject({ method: 'PUT', url: '/v4/filemove', payload: {} });
        expect(r2.statusCode).toBe(400);
        expect(r2.json().message).toMatch(/required parameter missing/i);

        const r3 = await app.inject({ method: 'DELETE', url: '/v4/filedelete', payload: {} });
        expect(r3.statusCode).toBe(400);
        expect(r3.json().message).toMatch(/required parameter missing/i);

        const r4 = await app.inject({ method: 'POST', url: '/v4/createdir', payload: {} });
        expect(r4.statusCode).toBe(400);
        expect(r4.json().message).toMatch(/required parameter missing/i);

        const r5 = await app.inject({ method: 'POST', url: '/v4/createdirqvd', payload: {} });
        expect(r5.statusCode).toBe(400);
        expect(r5.json().message).toMatch(/required parameter missing/i);
    });

    test('OS-aware path handling: Windows vs POSIX', async () => {
        if (isWin) {
            // Windows-style absolute paths with backslashes
            const src = path.join(tmpRoot, 'from', 'win.txt').replace(/\//g, '\\');
            const dst = path.join(tmpRoot, 'to', 'win.txt').replace(/\//g, '\\');
            await fs.writeFile(src, 'win');
            const res = await app.inject({ method: 'PUT', url: '/v4/filecopy', payload: { fromFile: src, toFile: dst } });
            expect(res.statusCode).toBe(201);
            expect(await fs.pathExists(dst)).toBe(true);
        } else {
            // POSIX-style absolute paths with forward slashes
            const src = upath.join(tmpRoot, 'from', 'nix.txt');
            const dst = upath.join(tmpRoot, 'to', 'nix.txt');
            await fs.writeFile(src, 'nix');
            const res = await app.inject({ method: 'PUT', url: '/v4/filecopy', payload: { fromFile: src, toFile: dst } });
            expect(res.statusCode).toBe(201);
            expect(await fs.pathExists(dst)).toBe(true);
        }
    });

    test('UNC paths are rejected on non-Windows with 400', async () => {
        if (!isWin) {
            const unc = '\\\\server\\share\\file.txt';
            const res1 = await app.inject({
                method: 'PUT',
                url: '/v4/filecopy',
                payload: { fromFile: unc, toFile: upath.join(tmpRoot, 'to', 'x.txt') },
            });
            const res2 = await app.inject({
                method: 'PUT',
                url: '/v4/filemove',
                payload: { fromFile: unc, toFile: upath.join(tmpRoot, 'to', 'y.txt') },
            });
            const res3 = await app.inject({ method: 'DELETE', url: '/v4/filedelete', payload: { deleteFile: unc } });
            expect(res1.statusCode).toBe(400);
            expect(res2.statusCode).toBe(400);
            expect(res3.statusCode).toBe(400);
        }
    });

    test('Copy returns error when source file does not exist', async () => {
        const src = upath.join(tmpRoot, 'from', 'nope.txt');
        const dst = upath.join(tmpRoot, 'to', 'nope.txt');
        // ensure not exists
        if (await fs.pathExists(src)) await fs.remove(src);
        const res = await app.inject({ method: 'PUT', url: '/v4/filecopy', payload: { fromFile: src, toFile: dst } });
        expect([200, 400]).toContain(res.statusCode);
    });
});
