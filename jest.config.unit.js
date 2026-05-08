/**
 * Jest configuration for unit tests only.
 * Excludes integration tests (*.api.test.js files).
 */

/** @type {import('jest').Config} */
const baseConfig = (await import('./jest.config.js')).default;

const config = {
    ...baseConfig,
    testPathIgnorePatterns: ['\\.api\\.test\\.js$', '/node_modules/'],
    collectCoverage: true,
};

export default config;
