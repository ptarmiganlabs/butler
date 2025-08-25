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

    test('all() handles error with stdout', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            cb({ code: 1 }, 'Access denied');
        });
        await expect(all(logger)).rejects.toBe('Access denied');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error while getting all services'));
    });

    test('all() handles error without stdout', async () => {
        const error = new Error('Connection failed');
        error.code = 2;
        execMock.mockImplementationOnce((cmd, cb) => {
            cb(error, null);
        });
        await expect(all(logger)).rejects.toBe(error);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error code: 2'));
    });

    test('all() handles remote host command correctly', async () => {
        const names = await all(logger, 'REMOTEHOST');
        expect(execMock).toHaveBeenCalledWith('sc.exe \\\\REMOTEHOST query state= all', expect.any(Function));
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Getting all services on host REMOTEHOST'));
    });

    test('statusAll() filters and parses service blocks correctly', async () => {
        const result = await statusAll(logger);
        expect(result.length).toBe(3);
        
        const spooler = result.find(s => s.name === 'Spooler');
        expect(spooler).toBeDefined();
        expect(spooler.displayName).toBe('Print Spooler');
        expect(spooler.stateText).toBe('RUNNING');
        expect(spooler.stateNum).toBe('4');
        expect(spooler.type).toBe('10  WIN32_OWN_PROCESS');
    });

    test('statusAll() handles empty first line correctly', async () => {
        // The mock already includes an empty first line which should be removed
        const result = await statusAll(logger);
        expect(result.length).toBeGreaterThan(0);
        expect(result.every(s => s.name)).toBe(true);
    });

    test('statusAll() handles malformed service block gracefully', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            const stdout = [
                'SERVICE_NAME: ValidService',
                'DISPLAY_NAME: Valid Service',
                '        STATE              : 4  RUNNING',
                '',
                'INVALID_BLOCK',
                '',
                'SERVICE_NAME: AnotherService',
                'DISPLAY_NAME: Another Service',
                '        STATE              : 1  STOPPED',
                '',
            ].join('\r\n');
            cb(null, stdout);
        });
        
        const result = await statusAll(logger);
        expect(result.length).toBe(2); // Should filter out invalid block
        expect(result.map(s => s.name)).toEqual(['ValidService', 'AnotherService']);
    });

    test('status() handles different service states', async () => {
        // Test that status function can handle the actual parsing logic
        const runningStatus = await status(logger, 'RunningService');
        expect(runningStatus).toBe('RUNNING');
        
        const stoppedStatus = await status(logger, 'StoppedService');
        expect(stoppedStatus).toBe('STOPPED');
    });

    test('details() parses start type correctly', async () => {
        const info = await details(logger, 'MyService');
        expect(info.startType).toBe('Automatic');
        expect(info.name).toBe('MyService');
        expect(info.displayName).toBe('My Sample Service');
        expect(info.exePath).toBe('C:\\Program Files\\MySvc\\mysvc.exe');
    });

    test('details() handles dependencies parsing', async () => {
        const info = await details(logger, 'MyService');
        expect(info.dependencies).toBeDefined();
        expect(info.dependencies.length).toBeGreaterThan(0);
        const cleanDeps = info.dependencies.map(d => d.trim()).filter(Boolean);
        expect(cleanDeps).toContain('TcpIp');
        expect(cleanDeps).toContain('EventLog');
    });

    test('exists() checks service existence correctly', async () => {
        const mod = await import('../winsvc.js');
        
        // Existing service should return true
        const existsTrue = await mod.exists(logger, 'RunningService');
        expect(existsTrue).toBe(true);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Found! Service RunningService exists'));
        
        // Non-existing service should return false
        const existsFalse = await mod.exists(logger, 'NonExistentService');
        expect(existsFalse).toBe(false);
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Not found! Service NonExistentService does not exists'));
    });

    test('exists() handles invalid service name', async () => {
        const mod = await import('../winsvc.js');
        await expect(mod.exists(logger, '')).rejects.toThrow('Service name is invalid');
        await expect(mod.exists(logger, null)).rejects.toThrow('Service name is invalid');
    });

    test('status() handles service query with host parameter', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            expect(cmd).toContain('\\\\TESTHOST');
            cb(null, 'SERVICE_NAME: TestSvc\r\n        STATE              : 4  RUNNING');
        });
        
        const result = await status(logger, 'TestSvc', 'TESTHOST');
        expect(result).toBe('RUNNING');
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Getting status of service TestSvc on host TESTHOST'));
    });

    test('details() handles service query with host parameter', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            expect(cmd).toContain('\\\\TESTHOST');
            const stdout = [
                'SERVICE_NAME: TestSvc',
                'DISPLAY_NAME              : Test Service',
                '        START_TYPE         : 3   DEMAND_START',
                '        BINARY_PATH_NAME   : C:\\test.exe',
                '        DEPENDENCIES       : ',
            ].join('\r\n');
            cb(null, stdout);
        });
        
        const result = await details(logger, 'TestSvc', 'TESTHOST');
        expect(result.name).toBe('TestSvc');
        expect(result.displayName).toBe('Test Service');
        expect(result.startType).toBe('Manual');
        expect(result.exePath).toBe('C:\\test.exe');
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Getting details of service TestSvc on host TESTHOST'));
    });

    test('details() handles different start types', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            const stdout = [
                'SERVICE_NAME: ManualSvc',
                'DISPLAY_NAME              : Manual Service',
                '        START_TYPE         : 3   DEMAND_START',
                '        BINARY_PATH_NAME   : C:\\manual.exe',
                '        DEPENDENCIES       : ',
            ].join('\r\n');
            cb(null, stdout);
        });
        
        const result = await details(logger, 'ManualSvc');
        expect(result.startType).toBe('Manual');
    });

    test('details() handles disabled start type', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            const stdout = [
                'SERVICE_NAME: DisabledSvc',
                'DISPLAY_NAME              : Disabled Service',
                '        START_TYPE         : 4   DISABLED',
                '        BINARY_PATH_NAME   : C:\\disabled.exe',
                '        DEPENDENCIES       : ',
            ].join('\r\n');
            cb(null, stdout);
        });
        
        const result = await details(logger, 'DisabledSvc');
        expect(result.startType).toBe('Disabled');
    });

    test('details() handles empty dependencies correctly', async () => {
        execMock.mockImplementationOnce((cmd, cb) => {
            const stdout = [
                'SERVICE_NAME: NoDepsService',
                'DISPLAY_NAME              : No Dependencies Service',
                '        START_TYPE         : 2   AUTO_START',
                '        BINARY_PATH_NAME   : C:\\nodeps.exe',
                '        DEPENDENCIES       : ',
            ].join('\r\n');
            cb(null, stdout);
        });
        
        const result = await details(logger, 'NoDepsService');
        expect(result.dependencies).toBeDefined();
        expect(result.dependencies.filter(d => d.trim())).toEqual([]);
    });

    test('status() logs debug information correctly', async () => {
        await status(logger, 'RunningService');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Running command'));
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Getting status of service RunningService'));
    });

    test('all() logs debug and verbose information correctly', async () => {
        await all(logger);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Running command'));
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Getting all services on local machine'));
    });

    test('statusAll() logs debug and verbose information correctly', async () => {
        await statusAll(logger, 'TESTHOST');
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Running command'));
        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Getting status of all services on host TESTHOST'));
    });
});
