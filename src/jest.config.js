/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
    // Setup files  
    setupFiles: ['<rootDir>/test/env.js'],

    // Test environment
    testEnvironment: 'node',

    // Automatically clear mock calls and instances between every test
    clearMocks: true,

    // Coverage settings
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
};
