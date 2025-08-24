import { jest } from '@jest/globals';

describe('plugins/support', () => {
    let supportPlugin;

    beforeAll(async () => {
        // Mock fastify-plugin
        await jest.unstable_mockModule('fastify-plugin', () => ({
            default: jest.fn((fn) => fn), // Return the passed function directly
        }));

        supportPlugin = (await import('../support.js')).default;
    });

    test('exports a fastify plugin function', () => {
        expect(typeof supportPlugin).toBe('function');
    });

    test('decorates fastify with someSupport method', async () => {
        const mockFastify = {
            decorate: jest.fn(),
        };

        await supportPlugin(mockFastify, {});

        expect(mockFastify.decorate).toHaveBeenCalledWith('someSupport', expect.any(Function));

        // Test the decorator function
        const decoratorCall = mockFastify.decorate.mock.calls[0];
        const decoratorFunction = decoratorCall[1];

        expect(decoratorFunction()).toBe('hugs');
    });

    test('decorator returns hugs when called', async () => {
        const mockFastify = {
            decorate: jest.fn(),
        };

        await supportPlugin(mockFastify, {});

        const decoratorFunction = mockFastify.decorate.mock.calls[0][1];
        const result = decoratorFunction();

        expect(result).toBe('hugs');
    });
});
