/**
 * Unit tests for the crash dump module (src/lib/crash-dump.js)
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import os from 'os';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Hoist mock instances OUTSIDE the factory functions for stable references
// ---------------------------------------------------------------------------

const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
};

const mockConfigGet = jest.fn();
const mockConfigHas = jest.fn();

// Keep a stable reference to the globals default object so tests can mutate
// individual properties (e.g. set config to null) and have crash-dump.js
// see the change through its already-imported 'globals' reference.
const mockGlobalsDefault = {
    logger: mockLogger,
    config: {
        get: mockConfigGet,
        has: mockConfigHas,
    },
    appVersion: '1.0.0',
    isSea: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a temporary directory for the test run.
 *
 * @returns {string} Absolute path to the temp directory
 */
function makeTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'butler-crash-test-'));
}

/**
 * Removes a directory tree recursively (best-effort).
 *
 * @param {string} dir - Directory to remove
 */
function removeTempDir(dir) {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // best-effort
    }
}

/**
 * Reads all files in a directory and returns them as name → content pairs.
 *
 * @param {string} dir - Directory to read
 * @returns {object} Map of filename to file content string
 */
function readDirFiles(dir) {
    const result = {};
    for (const name of fs.readdirSync(dir)) {
        result[name] = fs.readFileSync(path.join(dir, name), 'utf8');
    }
    return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('writeCrashDump', () => {
    let writeCrashDump;
    let tempDir;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({
            default: mockGlobalsDefault,
        }));
        await jest.unstable_mockModule('node:sea', () => ({
            default: { isSea: jest.fn(() => false) },
            isSea: jest.fn(() => false),
        }));
        ({ writeCrashDump } = await import('../crash-dump.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        tempDir = makeTempDir();

        // Default config: crash dumps enabled, both file types on
        mockConfigHas.mockImplementation((key) =>
            [
                'Butler.crashFile.enable',
                'Butler.crashFile.crashFileDirectory',
                'Butler.crashFile.crashFileCreateJson',
                'Butler.crashFile.crashFileCreateText',
            ].includes(key),
        );
        mockConfigGet.mockImplementation((key) => {
            const values = {
                'Butler.crashFile.enable': true,
                'Butler.crashFile.crashFileDirectory': tempDir,
                'Butler.crashFile.crashFileCreateJson': true,
                'Butler.crashFile.crashFileCreateText': true,
            };
            return values[key];
        });

        // Restore config to the mock object
        mockGlobalsDefault.config = { get: mockConfigGet, has: mockConfigHas };
        mockGlobalsDefault.logger = mockLogger;
        mockGlobalsDefault.appVersion = '1.0.0';
        mockGlobalsDefault.isSea = false;
    });

    afterEach(() => {
        removeTempDir(tempDir);
    });

    test('writes both JSON and TXT files when both are enabled', async () => {
        const err = new Error('Test crash error');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const names = Object.keys(files);
        const jsonFiles = names.filter((n) => n.endsWith('.json'));
        const txtFiles = names.filter((n) => n.endsWith('.txt'));

        expect(jsonFiles).toHaveLength(1);
        expect(txtFiles).toHaveLength(1);
    });

    test('JSON file contains correct structure', async () => {
        const err = new Error('JSON structure test');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);

        expect(data.version).toBe('1.0');
        expect(data.app.name).toBe('butler');
        expect(data.app.version).toBe('1.0.0');
        expect(data.error.type).toBe('Error');
        expect(data.error.message).toBe('JSON structure test');
        expect(data.context.source).toBe('uncaughtException');
        expect(data.context.exitCode).toBe(1);
        expect(data.runtime).toHaveProperty('nodeVersion');
        expect(data.runtime).toHaveProperty('platform');
    });

    test('TXT file contains crash report header', async () => {
        const err = new Error('Text report test');
        await writeCrashDump(err, 'unhandledRejection');

        const files = readDirFiles(tempDir);
        const txtFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.txt'));

        expect(txtFile).toContain('BUTLER CRASH REPORT');
        expect(txtFile).toContain('Text report test');
        expect(txtFile).toContain('unhandledRejection');
        expect(txtFile).toContain('END OF CRASH REPORT');
    });

    test('writes only JSON when crashFileCreateText is false', async () => {
        mockConfigGet.mockImplementation((key) => {
            const values = {
                'Butler.crashFile.enable': true,
                'Butler.crashFile.crashFileDirectory': tempDir,
                'Butler.crashFile.crashFileCreateJson': true,
                'Butler.crashFile.crashFileCreateText': false,
            };
            return values[key];
        });

        const err = new Error('JSON only test');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const names = Object.keys(files);
        expect(names.filter((n) => n.endsWith('.json'))).toHaveLength(1);
        expect(names.filter((n) => n.endsWith('.txt'))).toHaveLength(0);
    });

    test('writes only TXT when crashFileCreateJson is false', async () => {
        mockConfigGet.mockImplementation((key) => {
            const values = {
                'Butler.crashFile.enable': true,
                'Butler.crashFile.crashFileDirectory': tempDir,
                'Butler.crashFile.crashFileCreateJson': false,
                'Butler.crashFile.crashFileCreateText': true,
            };
            return values[key];
        });

        const err = new Error('TXT only test');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const names = Object.keys(files);
        expect(names.filter((n) => n.endsWith('.json'))).toHaveLength(0);
        expect(names.filter((n) => n.endsWith('.txt'))).toHaveLength(1);
    });

    test('writes no files when enable is false', async () => {
        mockConfigGet.mockImplementation((key) => {
            const values = {
                'Butler.crashFile.enable': false,
                'Butler.crashFile.crashFileDirectory': tempDir,
                'Butler.crashFile.crashFileCreateJson': true,
                'Butler.crashFile.crashFileCreateText': true,
            };
            return values[key];
        });

        const err = new Error('Disabled test');
        await writeCrashDump(err, 'uncaughtException');

        // Directory may not even be created
        const dirExists = fs.existsSync(tempDir);
        const fileCount = dirExists ? fs.readdirSync(tempDir).length : 0;
        expect(fileCount).toBe(0);
    });

    test('writes no files when both file types are false', async () => {
        mockConfigGet.mockImplementation((key) => {
            const values = {
                'Butler.crashFile.enable': true,
                'Butler.crashFile.crashFileDirectory': tempDir,
                'Butler.crashFile.crashFileCreateJson': false,
                'Butler.crashFile.crashFileCreateText': false,
            };
            return values[key];
        });

        const err = new Error('Both disabled test');
        await writeCrashDump(err, 'uncaughtException');

        const files = fs.existsSync(tempDir) ? fs.readdirSync(tempDir) : [];
        expect(files).toHaveLength(0);
    });

    test('redacts passwords from error message', async () => {
        const err = new Error('Connection failed: password=supersecret123 for user');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);

        expect(data.error.message).not.toContain('supersecret123');
        expect(data.error.message).toContain('[REDACTED]');
    });

    test('redacts bearer tokens from error message', async () => {
        const err = new Error('HTTP 401: Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);

        expect(data.error.message).not.toContain('eyJhbGciOiJSUzI1NiJ9');
        expect(data.error.message).toContain('[REDACTED]');
    });

    test('redacts URL credentials from error message', async () => {
        const err = new Error('Failed to connect to mqtt://admin:password@broker.example.com');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);

        expect(data.error.message).not.toContain('admin:password');
        expect(data.error.message).toContain('[REDACTED]@broker.example.com');
    });

    test('sanitizes absolute paths from stack trace', async () => {
        const err = new Error('Path test');
        err.stack = `Error: Path test\n    at Object.<anonymous> (/home/user/myproject/src/butler.js:42:5)\n    at Module._compile (node:internal/modules/cjs/loader:1364:14)`;
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);

        expect(data.error.stack).not.toContain('/home/user/myproject/');
        expect(data.error.stack).toContain('src/butler.js:42:5');
    });

    test('handles non-Error rejection reasons', async () => {
        await writeCrashDump('plain string reason', 'unhandledRejection');

        const files = readDirFiles(tempDir);
        const names = Object.keys(files);
        expect(names.length).toBeGreaterThan(0);

        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);
        expect(data.error.message).toBe('plain string reason');
    });

    test('handles null error gracefully', async () => {
        await expect(writeCrashDump(null, 'uncaughtException')).resolves.toBeUndefined();
    });

    test('uses defaults when globals.config is null', async () => {
        const originalCwd = process.cwd();

        try {
            process.chdir(tempDir);

            // Point config to null so the crash dump falls back to defaults
            mockGlobalsDefault.config = null;

            const err = new Error('No config test');
            // Should resolve without throwing
            await expect(writeCrashDump(err, 'uncaughtException')).resolves.toBeUndefined();
        } finally {
            process.chdir(originalCwd);
        }
    });

    test('uses defaults when globals is not yet initialized', async () => {
        const originalCwd = process.cwd();

        try {
            process.chdir(tempDir);

            mockGlobalsDefault.config = null;
            mockGlobalsDefault.logger = null;
            mockGlobalsDefault.appVersion = undefined;
            mockGlobalsDefault.isSea = undefined;

            const err = new Error('Early crash test');
            // Should resolve without throwing
            await expect(writeCrashDump(err, 'uncaughtException')).resolves.toBeUndefined();
        } finally {
            process.chdir(originalCwd);
        }
    });

    test('filenames match expected pattern', async () => {
        const err = new Error('Filename pattern test');
        await writeCrashDump(err, 'uncaughtException');

        const files = Object.keys(readDirFiles(tempDir));
        for (const name of files) {
            // Pattern: crash_dump_YYYYMMDD_HHMMSS_mmm_<pid>_<counter>.<ext>
            expect(name).toMatch(/^crash_dump_\d{8}_\d{6}_\d{3}_\d+_\d+\.(json|txt)$/);
        }
    });

    test('logs crash dump path via globals.logger when available', async () => {
        const err = new Error('Logger test');
        await writeCrashDump(err, 'uncaughtException');

        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('CRASH DUMP: Written to'));
    });

    test('includes safe config values in JSON output', async () => {
        mockConfigHas.mockImplementation(() => true);
        mockConfigGet.mockImplementation((key) => {
            const values = {
                'Butler.crashFile.enable': true,
                'Butler.crashFile.crashFileDirectory': tempDir,
                'Butler.crashFile.crashFileCreateJson': true,
                'Butler.crashFile.crashFileCreateText': true,
                'Butler.logLevel': 'info',
                'Butler.fileLogging': true,
                'Butler.logDirectory': './log',
                'Butler.anonTelemetry': false,
                'Butler.systemInfo.enable': true,
                'Butler.restServerConfig.enable': true,
                'Butler.udpServerConfig.enable': true,
                'Butler.mqttConfig.enable': false,
                'Butler.influxDb.enable': false,
            };
            return values[key];
        });

        const err = new Error('Config test');
        await writeCrashDump(err, 'uncaughtException');

        const files = readDirFiles(tempDir);
        const jsonFile = Object.values(files).find((_, i) => Object.keys(files)[i].endsWith('.json'));
        const data = JSON.parse(jsonFile);

        expect(data.config).toHaveProperty('logLevel', 'info');
        expect(data.config).toHaveProperty('fileLogging', true);
        expect(data.config).not.toHaveProperty('password');
        expect(data.config).not.toHaveProperty('token');
    });
});
