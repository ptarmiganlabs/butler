/**
 * Tests for winsvc helpers that parse sc.exe output.
 */

import { jest } from '@jest/globals';

// Mock child_process.exec with dynamic stdout based on command
const execMock = jest.fn((cmd, cb) => {
    if (cmd.startsWith('sc.exe query state= all') || cmd.includes(' query state= all')) {
        // Output used by all() and statusAll()
        const stdout = [
            '',
            'SERVICE_NAME: Spooler',
            'DISPLAY_NAME    : Print Spooler',
            '        TYPE               : 10  WIN32_OWN_PROCESS',
            '        STATE              : 4  RUNNING',
            '        WIN32_EXIT_CODE    : 0  (0x0)',
            '        SERVICE_EXIT_CODE  : 0  (0x0)',
            '',
            'SERVICE_NAME: RunningService',
            'DISPLAY_NAME    : Running Service',
            '        TYPE               : 10  WIN32_OWN_PROCESS',
            '        STATE              : 4  RUNNING',
            '        WIN32_EXIT_CODE    : 0  (0x0)',
            '        SERVICE_EXIT_CODE  : 0  (0x0)',
            '',
            'SERVICE_NAME: StoppedService',
            'DISPLAY_NAME    : Stopped Service',
            '        TYPE               : 10  WIN32_OWN_PROCESS',
            '        STATE              : 1  STOPPED',
            '        WIN32_EXIT_CODE    : 0  (0x0)',
            '        SERVICE_EXIT_CODE  : 0  (0x0)',
            '',
        ].join('\r\n');
        cb(null, stdout);
        return;
    }

    if (cmd.startsWith('sc.exe query "RunningService"')) {
        const stdout = [
            'SERVICE_NAME: RunningService',
            'DISPLAY_NAME: Running Service',
            '        TYPE               : 10  WIN32_OWN_PROCESS',
            '        STATE              : 4  RUNNING',
            '        WIN32_EXIT_CODE    : 0  (0x0)',
        ].join('\r\n');
        cb(null, stdout);
        return;
    }

    if (cmd.startsWith('sc.exe query "StoppedService"')) {
        const stdout = [
            'SERVICE_NAME: StoppedService',
            'DISPLAY_NAME: Stopped Service',
            '        TYPE               : 10  WIN32_OWN_PROCESS',
            '        STATE              : 1  STOPPED',
            '        WIN32_EXIT_CODE    : 0  (0x0)',
        ].join('\r\n');
        cb(null, stdout);
        return;
    }

    if (cmd.startsWith('sc.exe qc "MyService"')) {
        const stdout = [
            'SERVICE_NAME: MyService',
            'DISPLAY_NAME              : My Sample Service',
            '        TYPE               : 10  WIN32_OWN_PROCESS',
            '        START_TYPE         : 2   AUTO_START',
            '        BINARY_PATH_NAME   : C:\\Program Files\\MySvc\\mysvc.exe',
            '        LOAD_ORDER_GROUP   :',
            '        TAG                : 0',
            '        DISPLAY_NAME       : My Sample Service',
            '        DEPENDENCIES       : TcpIp',
            '        : EventLog',
            '        SERVICE_START_NAME : LocalSystem',
        ].join('\r\n');
        cb(null, stdout);
        return;
    }

    // Default: return empty
    cb(null, '');
});

jest.unstable_mockModule('child_process', () => ({ exec: execMock }));

// Simple logger stub
const logger = {
    verbose: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    silly: jest.fn(),
};

let all;
let statusAll;
let status;
let details;

beforeAll(async () => {
    const mod = await import('../winsvc.js');
    ({ all, statusAll, status, details } = mod);
});

describe('winsvc helpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('all() returns service names from local host', async () => {
        const names = await all(logger);
        expect(Array.isArray(names)).toBe(true);
        expect(names).toContain('Spooler');
        expect(names).toContain('RunningService');
        expect(names).toContain('StoppedService');
    });

    test('statusAll() parses service blocks', async () => {
        const result = await statusAll(logger, 'HOST1');
        expect(result.length).toBeGreaterThanOrEqual(2);
        const svc = result.find((s) => s.name === 'RunningService');
        expect(svc).toBeDefined();
        expect(svc.displayName).toBe('Running Service');
        expect(['RUNNING', 'STOPPED']).toContain(svc.stateText);
    });

    test('status() detects RUNNING and STOPPED', async () => {
        await expect(status(logger, 'RunningService')).resolves.toBe('RUNNING');
        await expect(status(logger, 'StoppedService')).resolves.toBe('STOPPED');
    });

    test('details() parses info and dependencies', async () => {
        const info = await details(logger, 'MyService');
        expect(info.name).toBe('MyService');
        expect(info.displayName).toBe('My Sample Service');
        expect(info.startType).toBe('Automatic');
        expect(info.exePath).toContain('mysvc.exe');
        const depsTrim = info.dependencies.map((d) => d.trim()).filter(Boolean);
        expect(depsTrim).toEqual(expect.arrayContaining(['TcpIp', 'EventLog']));
    });

    test('exists() resolves true/false and rejects on error', async () => {
        const mod = await import('../winsvc.js');
        // true when present
        await expect(mod.exists(logger, 'RunningService')).resolves.toBe(true);
        // false when missing
        await expect(mod.exists(logger, 'NoSuchService')).resolves.toBe(false);

        // invalid service name rejects
        await expect(mod.exists(logger, '')).rejects.toThrow('Service name is invalid');

        // Simulate error from all() -> reject
        execMock.mockImplementationOnce((cmd, cb) => {
            cb({ code: 1 }, 'ERROR STDOUT');
        });
        await expect(mod.exists(logger, 'AnyService')).rejects.toBe('ERROR STDOUT');
    });

    test('all() and statusAll() handle remote host and errors', async () => {
        // Remote host path should still parse
        const names = await all(logger, 'REMOTEHOST');
        expect(names).toContain('RunningService');

        // statusAll error path rejects with error
        execMock.mockImplementationOnce((cmd, cb) => {
            cb({ code: 2, message: 'boom' }, '');
        });
        await expect(statusAll(logger)).rejects.toEqual({ code: 2, message: 'boom' });
    });

    test('status() invalid service and exec error paths', async () => {
        // invalid service name
        await expect(status(logger, '')).rejects.toThrow('Service name is invalid');

        // exec error
        execMock.mockImplementationOnce((cmd, cb) => {
            cb({ code: 5, message: 'err' }, '');
        });
        await expect(status(logger, 'AnyService')).rejects.toEqual({ code: 5, message: 'err' });
    });

    test('details() invalid service and exec error paths', async () => {
        // invalid service name
        await expect(details(logger, '')).rejects.toThrow('Service name is invalid');

        // exec error (simulate malformed output leading to parse error)
        execMock.mockImplementationOnce((cmd, cb) => {
            cb({ code: 6, message: 'oops' }, '');
        });
        await expect(details(logger, 'SvcX')).rejects.toBeDefined();
    });
});
