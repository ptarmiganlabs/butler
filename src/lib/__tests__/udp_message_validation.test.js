import { jest } from '@jest/globals';

describe('udp_message_validation', () => {
    let validateMessageSize;
    let validateTaskId;
    let validateAppId;
    let sanitizeField;
    let validateAndSanitizeMessage;
    let validateCriticalFields;

    beforeAll(async () => {
        // Mock globals
        const mockGlobals = {
            logger: {
                debug: jest.fn(),
                error: jest.fn(),
                info: jest.fn(),
                verbose: jest.fn(),
                warn: jest.fn(),
            },
            getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        };

        await jest.unstable_mockModule('../../globals.js', () => ({
            default: mockGlobals,
        }));

        // Import the module under test
        const module = await import('../udp_message_validation.js');
        validateMessageSize = module.validateMessageSize;
        validateTaskId = module.validateTaskId;
        validateAppId = module.validateAppId;
        sanitizeField = module.sanitizeField;
        validateAndSanitizeMessage = module.validateAndSanitizeMessage;
        validateCriticalFields = module.validateCriticalFields;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateMessageSize', () => {
        test('should accept valid sized messages', () => {
            const message = Buffer.from('test message');
            expect(validateMessageSize(message)).toBe(true);
        });

        test('should reject messages exceeding UDP max size', () => {
            // Create a buffer larger than 65507 bytes
            const largeMessage = Buffer.alloc(65508);
            expect(validateMessageSize(largeMessage)).toBe(false);
        });

        test('should reject non-Buffer input', () => {
            expect(validateMessageSize('not a buffer')).toBe(false);
            expect(validateMessageSize(null)).toBe(false);
            expect(validateMessageSize(undefined)).toBe(false);
        });

        test('should accept maximum allowed size', () => {
            const message = Buffer.alloc(65507);
            expect(validateMessageSize(message)).toBe(true);
        });
    });

    describe('validateTaskId', () => {
        test('should accept valid UUIDs', () => {
            expect(validateTaskId('210832b5-6174-4572-bd19-3e61eda675ef')).toBe(true);
            expect(validateTaskId('00000000-0000-0000-0000-000000000000')).toBe(true);
            expect(validateTaskId('a1b2c3d4-e5f6-1234-a5b6-123456789abc')).toBe(true);
        });

        test('should accept UUIDs with whitespace (trimmed)', () => {
            expect(validateTaskId('  210832b5-6174-4572-bd19-3e61eda675ef  ')).toBe(true);
        });

        test('should accept UUIDs in any case', () => {
            expect(validateTaskId('210832B5-6174-4572-BD19-3E61EDA675EF')).toBe(true);
            expect(validateTaskId('210832b5-6174-4572-bd19-3e61eda675ef')).toBe(true);
            expect(validateTaskId('210832B5-6174-4572-bd19-3e61eda675ef')).toBe(true);
        });

        test('should reject invalid UUID formats', () => {
            expect(validateTaskId('invalid-task-id')).toBe(false);
            expect(validateTaskId('12345678-1234-1234-1234-1234567890')).toBe(false); // too short
            expect(validateTaskId('12345678-1234-1234-1234-1234567890abcd')).toBe(false); // too long
            expect(validateTaskId('not-a-uuid')).toBe(false);
        });

        test('should reject non-string inputs', () => {
            expect(validateTaskId(null)).toBe(false);
            expect(validateTaskId(undefined)).toBe(false);
            expect(validateTaskId(123)).toBe(false);
            expect(validateTaskId({})).toBe(false);
        });

        test('should reject empty strings', () => {
            expect(validateTaskId('')).toBe(false);
            expect(validateTaskId('   ')).toBe(false);
        });
    });

    describe('validateAppId', () => {
        test('should accept valid UUIDs', () => {
            expect(validateAppId('a1b2c3d4-e5f6-1234-a5b6-123456789abc')).toBe(true);
        });

        test('should accept empty strings (for tasks without apps)', () => {
            expect(validateAppId('')).toBe(true);
            expect(validateAppId('   ')).toBe(true);
        });

        test('should accept null/undefined', () => {
            expect(validateAppId(null)).toBe(true);
            expect(validateAppId(undefined)).toBe(true);
        });

        test('should reject invalid UUID formats', () => {
            expect(validateAppId('invalid-app-id')).toBe(false);
            expect(validateAppId('not-a-uuid')).toBe(false);
        });
    });

    describe('sanitizeField', () => {
        test('should trim whitespace', () => {
            expect(sanitizeField('  test  ')).toBe('test');
            expect(sanitizeField('\ttab\t')).toBe('tab');
            expect(sanitizeField('\nnewline\n')).toBe('newline');
        });

        test('should limit field length', () => {
            const longString = 'a'.repeat(20000);
            const sanitized = sanitizeField(longString);
            expect(sanitized.length).toBe(10000);
        });

        test('should allow custom max length', () => {
            const longString = 'a'.repeat(2000);
            const sanitized = sanitizeField(longString, 1000);
            expect(sanitized.length).toBe(1000);
        });

        test('should handle empty/null/undefined inputs', () => {
            expect(sanitizeField('')).toBe('');
            expect(sanitizeField(null)).toBe('');
            expect(sanitizeField(undefined)).toBe('');
        });

        test('should handle non-string inputs', () => {
            expect(sanitizeField(123)).toBe('');
            expect(sanitizeField({})).toBe('');
        });

        test('should preserve special characters within limits', () => {
            expect(sanitizeField('test;with;semicolons')).toBe('test;with;semicolons');
            expect(sanitizeField('path/to/file')).toBe('path/to/file');
            expect(sanitizeField('INTERNAL\\\\user')).toBe('INTERNAL\\\\user');
        });
    });

    describe('validateAndSanitizeMessage', () => {
        test('should validate and sanitize correct messages', () => {
            const message = Buffer.from('/scheduler-reload-failed/;host;Task;App;user;task-id;app-id;ts;INFO;exec;Message');
            const result = validateAndSanitizeMessage(message, 11);
            expect(result.valid).toBe(true);
            expect(result.msg).toHaveLength(11);
            expect(result.msg[0]).toBe('/scheduler-reload-failed/');
        });

        test('should sanitize fields with extra whitespace', () => {
            const message = Buffer.from('  /test/  ;  field1  ;  field2  ');
            const result = validateAndSanitizeMessage(message, 3);
            expect(result.valid).toBe(true);
            expect(result.msg[0]).toBe('/test/');
            expect(result.msg[1]).toBe('field1');
            expect(result.msg[2]).toBe('field2');
        });

        test('should reject messages with wrong field count', () => {
            const message = Buffer.from('/test/;field1;field2');
            const result = validateAndSanitizeMessage(message, 5);
            expect(result.valid).toBe(false);
            expect(result.msg).toBeNull();
        });

        test('should reject oversized messages', () => {
            const largeMessage = Buffer.alloc(65508);
            const result = validateAndSanitizeMessage(largeMessage, 11);
            expect(result.valid).toBe(false);
            expect(result.msg).toBeNull();
        });

        test('should handle messages with semicolons in data', () => {
            // This is a known limitation - semicolons in data will break parsing
            const message = Buffer.from('/test/;field;with;semicolons;in;data');
            const result = validateAndSanitizeMessage(message, 3);
            // Will fail because split produces wrong field count
            expect(result.valid).toBe(false);
        });

        test('should sanitize very long fields', () => {
            const longField = 'a'.repeat(20000);
            const message = Buffer.from(`/test/;${longField};field3`);
            const result = validateAndSanitizeMessage(message, 3);
            expect(result.valid).toBe(true);
            expect(result.msg[1].length).toBe(10000); // Sanitized to max length
        });

        test('should handle empty fields', () => {
            const message = Buffer.from('/test/;;field3');
            const result = validateAndSanitizeMessage(message, 3);
            expect(result.valid).toBe(true);
            expect(result.msg[1]).toBe('');
        });
    });

    describe('validateCriticalFields', () => {
        test('should validate valid task and app IDs', () => {
            const msg = [
                '/scheduler-reload-failed/',
                'host',
                'Task',
                'App',
                'user',
                '210832b5-6174-4572-bd19-3e61eda675ef',
                'a1b2c3d4-e5f6-1234-a5b6-123456789abc',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            expect(validateCriticalFields(msg)).toBe(true);
            expect(validateCriticalFields(msg, { strict: true })).toBe(true);
        });

        test('should accept tasks without app IDs when requireAppId is false', () => {
            const msg = [
                '/scheduler-externalprogram-success/',
                'host',
                'Task',
                '',
                'user',
                '210832b5-6174-4572-bd19-3e61eda675ef',
                '',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            expect(validateCriticalFields(msg, { requireAppId: false })).toBe(true);
        });

        test('should log warning but not fail on invalid task IDs in non-strict mode', () => {
            const msg = [
                '/scheduler-reload-failed/',
                'host',
                'Task',
                'App',
                'user',
                'invalid-task-id',
                'a1b2c3d4-e5f6-1234-a5b6-123456789abc',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            expect(validateCriticalFields(msg, { strict: false })).toBe(true);
        });

        test('should fail on invalid task IDs in strict mode', () => {
            const msg = [
                '/scheduler-reload-failed/',
                'host',
                'Task',
                'App',
                'user',
                'invalid-task-id',
                'a1b2c3d4-e5f6-1234-a5b6-123456789abc',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            expect(validateCriticalFields(msg, { strict: true })).toBe(false);
        });

        test('should log warning but not fail on invalid app IDs in non-strict mode', () => {
            const msg = [
                '/scheduler-reload-failed/',
                'host',
                'Task',
                'App',
                'user',
                '210832b5-6174-4572-bd19-3e61eda675ef',
                'invalid-app-id',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            expect(validateCriticalFields(msg, { requireAppId: true, strict: false })).toBe(true);
        });

        test('should fail on invalid app IDs in strict mode', () => {
            const msg = [
                '/scheduler-reload-failed/',
                'host',
                'Task',
                'App',
                'user',
                '210832b5-6174-4572-bd19-3e61eda675ef',
                'invalid-app-id',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            expect(validateCriticalFields(msg, { requireAppId: true, strict: true })).toBe(false);
        });

        test('should allow custom field indices', () => {
            const msg = ['type', 'host', '210832b5-6174-4572-bd19-3e61eda675ef'];
            expect(
                validateCriticalFields(msg, {
                    taskIdIndex: 2,
                    appIdIndex: -1,
                    requireAppId: false,
                }),
            ).toBe(true);
        });

        test('should accept empty app IDs when requireAppId is true', () => {
            const msg = [
                '/scheduler-externalprogram-success/',
                'host',
                'Task',
                '',
                'user',
                '210832b5-6174-4572-bd19-3e61eda675ef',
                '',
                'timestamp',
                'INFO',
                'exec-id',
                'Message',
            ];
            // Empty app IDs are valid per validateAppId function
            expect(validateCriticalFields(msg, { requireAppId: true })).toBe(true);
        });
    });

    describe('edge cases', () => {
        test('should handle UTF-8 encoded messages with special characters', () => {
            const message = Buffer.from('/test/;äöü;中文;🚀', 'utf8');
            const result = validateAndSanitizeMessage(message, 4);
            expect(result.valid).toBe(true);
            expect(result.msg[1]).toBe('äöü');
            expect(result.msg[2]).toBe('中文');
            expect(result.msg[3]).toBe('🚀');
        });

        test('should handle messages at exact field count', () => {
            const message = Buffer.from('/test/');
            const result = validateAndSanitizeMessage(message, 1);
            expect(result.valid).toBe(true);
            expect(result.msg).toHaveLength(1);
        });

        test('should handle maximum size message', () => {
            const maxMessage = Buffer.alloc(65507).fill('a');
            expect(validateMessageSize(maxMessage)).toBe(true);
        });

        test('should handle message with all empty fields', () => {
            const message = Buffer.from(';;;;;;;;;;');
            const result = validateAndSanitizeMessage(message, 11);
            expect(result.valid).toBe(true);
            expect(result.msg.every((f) => f === '')).toBe(true);
        });
    });
});
