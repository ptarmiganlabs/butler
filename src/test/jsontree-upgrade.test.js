/**
 * Test file to validate jjsontree functionality before and after upgrade
 * This test should pass with the current version and after upgrade
 */

import { test, expect } from '@jest/globals';
import fs from 'fs';

describe('jjsontree upgrade validation', () => {
    const jsontreeFiles = [
        '/home/runner/work/butler/butler/static/configvis/jsontree.js',
        '/home/runner/work/butler/butler/static/configvis/jsontree.js.css',
        '/home/runner/work/butler/butler/static/configvis/jsontree.js.map',
    ];

    beforeAll(() => {
        // Verify all jsontree files exist
        jsontreeFiles.forEach((file) => {
            expect(fs.existsSync(file)).toBe(true);
        });
    });

    test('jsontree.js file contains expected version marker', () => {
        const jsContent = fs.readFileSync(jsontreeFiles[0], 'utf8');

        // Should contain a getVersion function
        expect(jsContent).toMatch(/getVersion.*function/);

        // Current version should be 2.9.0 or higher
        const versionMatch = jsContent.match(/getVersion[^}]*return\s*['"`]([0-9.]+)['"`]/);
        expect(versionMatch).toBeTruthy();

        const version = versionMatch[1];
        expect(version).toBeTruthy();
        console.log(`Current jjsontree version: ${version}`);

        // Version should be semantic version format
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('jsontree.js file structure is valid', () => {
        const jsContent = fs.readFileSync(jsontreeFiles[0], 'utf8');

        // Should be a valid JavaScript file (basic checks)
        expect(jsContent).toMatch(/^['"]use strict['"];/);
        expect(jsContent).toContain('var Is;');
        expect(jsContent).toContain('window.$jsontree');

        // Should have source mapping reference
        expect(jsContent).toMatch(/\/\/# sourceMappingURL=jsontree\.js\.map/);
    });

    test('CSS file exists and has basic structure', () => {
        const cssContent = fs.readFileSync(jsontreeFiles[1], 'utf8');

        // Should contain jsontree-specific CSS classes
        expect(cssContent).toContain('.jsontree-js');
        expect(cssContent.length).toBeGreaterThan(1000); // Should be substantial
    });

    test('source map file is valid JSON', () => {
        const mapContent = fs.readFileSync(jsontreeFiles[2], 'utf8');

        expect(() => {
            const parsed = JSON.parse(mapContent);
            expect(parsed.version).toBe(3); // Source map version 3
            expect(parsed.sources).toBeDefined();
            expect(parsed.mappings).toBeDefined();
        }).not.toThrow();
    });

    test('index.html template uses jsontree correctly', () => {
        const htmlContent = fs.readFileSync('/home/runner/work/butler/butler/static/configvis/index.html', 'utf8');

        // Should include jsontree files
        expect(htmlContent).toContain('jsontree.js.css');
        expect(htmlContent).toContain('jsontree.js');

        // Should have the data attribute for jsontree
        expect(htmlContent).toMatch(/data-jsontree-js=/);

        // Should have the tree container element
        expect(htmlContent).toContain('id="tree-1"');

        // Should contain configuration for jsontree
        expect(htmlContent).toContain('showTreeControls');
        expect(htmlContent).toContain('showCopyButton');
        expect(htmlContent).toContain('showCounts');
    });

    test('file sizes are reasonable', () => {
        const jsStats = fs.statSync(jsontreeFiles[0]);
        const cssStats = fs.statSync(jsontreeFiles[1]);

        // JS file should be substantial but not huge (minified)
        expect(jsStats.size).toBeGreaterThan(10000); // At least 10KB
        expect(jsStats.size).toBeLessThan(500000); // Less than 500KB

        // CSS should be reasonable size
        expect(cssStats.size).toBeGreaterThan(1000); // At least 1KB
        expect(cssStats.size).toBeLessThan(100000); // Less than 100KB
    });
});
