/**
 * Jest configuration for integration tests only.
 * Only includes *.api.test.js files.
 */

/** @type {import('jest').Config} */
const baseConfig = (await import('./jest.config.js')).default;

const config = {
    ...baseConfig,
    testMatch: ['**/*.api.test.js'],
    collectCoverage: false,
};

export default config;
