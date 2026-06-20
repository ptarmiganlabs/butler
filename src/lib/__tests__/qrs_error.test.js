import { jest } from '@jest/globals';

const mockGlobals = {
    isSea: false,
};

jest.unstable_mockModule('../../globals.js', () => ({
    default: mockGlobals,
}));

const {
    formatHttpErrorWithContext,
    formatHttpResultWithContext,
    formatQrsErrorWithContext,
    formatQrsResultWithContext,
    hasExpectedHttpStatus,
    hasExpectedQrsStatus,
} = await import('../qrs_error.js');

describe('qrs_error helpers', () => {
    test('formatQrsErrorWithContext includes request and axios error details', () => {
        const err = new Error('Request failed with status code 500');
        err.code = 'ERR_BAD_RESPONSE';
        err.response = {
            status: 500,
            statusText: 'Internal Server Error',
        };
        err.config = {
            method: 'get',
            timeout: 30000,
            baseURL: 'https://qs-host:4242/qrs/',
            url: 'license',
        };

        const result = formatQrsErrorWithContext(err, 'license', { hostname: 'qs-host', portNumber: 4242 });

        expect(result).toContain('endpoint: license');
        expect(result).toContain('host: qs-host');
        expect(result).toContain('port: 4242');
        expect(result).toContain('code: ERR_BAD_RESPONSE');
        expect(result).toContain('status: 500');
        expect(result).toContain('statusText: Internal Server Error');
        expect(result).toContain('timeout: 30000ms');
    });

    test('formatQrsErrorWithContext filters sensitive properties', () => {
        const err = new Error('Auth failed');
        err.authorization = 'Bearer super-secret-token';
        err.password = 'secret-password';
        err.safeField = 'safe-value';

        const result = formatQrsErrorWithContext(err, 'license', { hostname: 'qs-host', portNumber: 4242 });

        expect(result).toContain('safeField: safe-value');
        expect(result).not.toContain('authorization');
        expect(result).not.toContain('super-secret-token');
        expect(result).not.toContain('password');
        expect(result).not.toContain('secret-password');
    });

    test('hasExpectedQrsStatus validates accepted status codes', () => {
        expect(hasExpectedQrsStatus({ statusCode: 200 })).toBe(true);
        expect(hasExpectedQrsStatus({ statusCode: 204 }, [200, 204])).toBe(true);
        expect(hasExpectedQrsStatus({ statusCode: 500 }, [200, 204])).toBe(false);
        expect(hasExpectedQrsStatus(undefined)).toBe(false);
    });

    test('formatQrsResultWithContext summarizes unexpected QRS responses', () => {
        const result = formatQrsResultWithContext(
            { statusCode: 500, body: { message: 'Internal Server Error', code: 42 } },
            'reloadtask/123',
            { hostname: 'qs-host', portNumber: 4242 },
            { method: 'GET', expectedStatusCodes: [200] },
        );

        expect(result).toContain('endpoint: reloadtask/123');
        expect(result).toContain('host: qs-host');
        expect(result).toContain('port: 4242');
        expect(result).toContain('method: GET');
        expect(result).toContain('expectedStatus: 200');
        expect(result).toContain('status: 500');
        expect(result).toContain('body.message: Internal Server Error');
        expect(result).toContain('body.code: 42');
    });

    test('formatQrsResultWithContext truncates long string bodies', () => {
        const longBody = 'x'.repeat(250);
        const result = formatQrsResultWithContext(
            { statusCode: 502, body: longBody },
            'reloadtask/123',
            { hostname: 'qs-host', portNumber: 4242 },
            { method: 'GET', expectedStatusCodes: [200] },
        );

        expect(result).toContain('status: 502');
        expect(result).toContain('bodyLength: 250');
        expect(result).toContain(`bodyPreview: ${'x'.repeat(200)}...`);
        expect(result).not.toContain(`body: ${longBody}`);
    });

    test('hasExpectedHttpStatus validates accepted status codes', () => {
        expect(hasExpectedHttpStatus({ status: 200 })).toBe(true);
        expect(hasExpectedHttpStatus({ status: 202 }, [200, 202])).toBe(true);
        expect(hasExpectedHttpStatus({ status: 500 }, [200, 202])).toBe(false);
        expect(hasExpectedHttpStatus(undefined)).toBe(false);
    });

    test('formatHttpResultWithContext summarizes unexpected HTTP responses', () => {
        const result = formatHttpResultWithContext(
            { status: 503, statusText: 'Service Unavailable', data: { message: 'Upstream unavailable' } },
            '/v1/systeminfo',
            { hostname: 'sense-host', portNumber: 9032, baseURL: 'https://sense-host:9032', timeout: 5000 },
            { method: 'GET', expectedStatusCodes: [200] },
        );

        expect(result).toContain('endpoint: /v1/systeminfo');
        expect(result).toContain('host: sense-host');
        expect(result).toContain('port: 9032');
        expect(result).toContain('baseURL: https://sense-host:9032');
        expect(result).toContain('timeout: 5000ms');
        expect(result).toContain('status: 503');
        expect(result).toContain('statusText: Service Unavailable');
        expect(result).toContain('body.message: Upstream unavailable');
    });

    test('formatHttpErrorWithContext includes axios request and response details', () => {
        const err = new Error('timeout of 5000ms exceeded');
        err.code = 'ECONNABORTED';
        err.config = {
            method: 'get',
            timeout: 5000,
            baseURL: 'https://sense-host:9032',
            url: '/v1/systeminfo',
        };
        err.response = {
            status: 504,
            statusText: 'Gateway Timeout',
            data: { message: 'Upstream timeout' },
        };

        const result = formatHttpErrorWithContext(
            err,
            '/v1/systeminfo',
            { hostname: 'sense-host', portNumber: 9032, baseURL: 'https://sense-host:9032', timeout: 5000 },
            { method: 'GET' },
        );

        expect(result).toContain('endpoint: /v1/systeminfo');
        expect(result).toContain('host: sense-host');
        expect(result).toContain('port: 9032');
        expect(result).toContain('code: ECONNABORTED');
        expect(result).toContain('status: 504');
        expect(result).toContain('statusText: Gateway Timeout');
        expect(result).toContain('body.message: Upstream timeout');
    });
});
