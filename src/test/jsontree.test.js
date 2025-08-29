/**
 * Unit tests for jjsontree (JsonTree.js) functionality
 * Tests the library files and integration with Butler's configuration visualization
 */

import { test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('JsonTree.js library validation', () => {
    const workspaceRoot = process.cwd(); // Get current working directory
    const configVisPath = path.join(workspaceRoot, 'static', 'configvis');
    const jsontreeFiles = {
        js: path.join(configVisPath, 'jsontree.js'),
        css: path.join(configVisPath, 'jsontree.js.css'),
        jsMap: path.join(configVisPath, 'jsontree.js.map'),
        cssMap: path.join(configVisPath, 'jsontree.js.css.map'),
        html: path.join(configVisPath, 'index.html'),
    };

    beforeAll(() => {
        // Verify all required files exist
        Object.entries(jsontreeFiles).forEach(([key, file]) => {
            if (key !== 'jsMap' && key !== 'cssMap') {
                // Map files might be empty, so we only check they exist
                expect(fs.existsSync(file)).toBe(true);
            }
        });
    });

    describe('JsonTree.js library files', () => {
        test('jsontree.js contains valid library structure', () => {
            const jsContent = fs.readFileSync(jsontreeFiles.js, 'utf8');

            // Should be a valid JavaScript file
            expect(jsContent).toMatch(/^['"]use strict['"];/);

            // Should contain core JsonTree.js components
            expect(jsContent).toMatch(/JsonTree|jsontree/i);
            expect(jsContent).toContain('getVersion');

            // Should be a compiled/transpiled file (reasonable line count)
            const lineCount = jsContent.split('\n').length;
            expect(lineCount).toBeGreaterThan(100); // Should be substantial
            expect(lineCount).toBeLessThan(10000); // But not huge
        });

        test('jsontree.js version is current and valid', () => {
            const jsContent = fs.readFileSync(jsontreeFiles.js, 'utf8');

            // Extract version using regex
            const versionMatch = jsContent.match(/getVersion[^}]*return\s*['"`]([0-9.]+)['"`]/);
            expect(versionMatch).toBeTruthy();

            const version = versionMatch[1];
            expect(version).toBeTruthy();

            // Should be semantic version format
            expect(version).toMatch(/^\d+\.\d+\.\d+$/);

            // Should be version 4.0.0 or higher (indicating we have the latest)
            const [major, minor, patch] = version.split('.').map(Number);
            expect(major).toBeGreaterThanOrEqual(4);

            console.log(`JsonTree.js version: ${version}`);
        });

        test('CSS file contains required jsontree styles', () => {
            const cssContent = fs.readFileSync(jsontreeFiles.css, 'utf8');

            // Should contain jsontree-specific CSS classes
            expect(cssContent).toMatch(/\.jsontree-js/);
            expect(cssContent).toMatch(/\.json-tree/i);

            // Should have reasonable content length
            expect(cssContent.length).toBeGreaterThan(5000);

            // Should contain color definitions (hex colors)
            expect(cssContent).toMatch(/#[0-9a-fA-F]{3,6}/);

            // Should contain key UI elements
            expect(cssContent).toMatch(/tooltip|button|container/i);
        });

        test('files have reasonable sizes for production use', () => {
            const jsStats = fs.statSync(jsontreeFiles.js);
            const cssStats = fs.statSync(jsontreeFiles.css);

            // JS file should be substantial but not huge (minified)
            expect(jsStats.size).toBeGreaterThan(50000); // At least 50KB for a full-featured library
            expect(jsStats.size).toBeLessThan(1000000); // Less than 1MB

            // CSS should be reasonable size
            expect(cssStats.size).toBeGreaterThan(5000); // At least 5KB
            expect(cssStats.size).toBeLessThan(200000); // Less than 200KB
        });
    });

    describe('Butler integration', () => {
        test('index.html correctly integrates jsontree library', () => {
            const htmlContent = fs.readFileSync(jsontreeFiles.html, 'utf8');

            // Should include jsontree files in correct order
            const cssInclude = htmlContent.indexOf('jsontree.js.css');
            const jsInclude = htmlContent.indexOf('src="jsontree.js"');
            expect(cssInclude).toBeLessThan(jsInclude); // CSS should come before JS

            // Should have the data attribute for jsontree initialization
            expect(htmlContent).toMatch(/data-jsontree-js\s*=/);

            // Should have required tree container
            expect(htmlContent).toContain('id="tree-1"');
        });

        test('jsontree configuration in HTML is valid', () => {
            const htmlContent = fs.readFileSync(jsontreeFiles.html, 'utf8');

            // Extract the data-jsontree-js configuration
            const configMatch = htmlContent.match(/data-jsontree-js\s*=\s*"([^"]+)"/);
            expect(configMatch).toBeTruthy();

            // Should contain required configuration options
            expect(htmlContent).toContain('showTreeControls: true');
            expect(htmlContent).toContain('showCopyButton: true');
            expect(htmlContent).toContain('showCounts: true');
            expect(htmlContent).toContain('sortPropertyNames: false');

            // Should reference the Butler config data
            expect(htmlContent).toContain('{{butlerConfigJsonEncoded}}');
        });

        test('HTML structure supports jsontree functionality', () => {
            const htmlContent = fs.readFileSync(jsontreeFiles.html, 'utf8');

            // Should have tab structure for different views
            expect(htmlContent).toMatch(/class="tab(content|links)"/);
            expect(htmlContent).toContain('JSONTree');
            expect(htmlContent).toContain('YAML');

            // Should have download functionality
            expect(htmlContent).toContain('downloadYaml');
            expect(htmlContent).toContain('Download obfuscated YAML');

            // Should have proper styling and layout
            expect(htmlContent).toMatch(/#header|\.tabcontent/);
        });
    });

    describe('Library compatibility', () => {
        test('jsontree.js is compatible with browser environments', () => {
            const jsContent = fs.readFileSync(jsontreeFiles.js, 'utf8');

            // Should not use Node.js specific features
            expect(jsContent).not.toContain('require(');
            expect(jsContent).not.toContain('module.exports');
            expect(jsContent).not.toMatch(/process\./);

            // Should handle browser globals properly
            expect(jsContent).toMatch(/window|document|this/);
        });

        test('CSS follows modern standards', () => {
            const cssContent = fs.readFileSync(jsontreeFiles.css, 'utf8');

            // Should use modern CSS features appropriately
            expect(cssContent).toMatch(/box-sizing|flexbox|grid/i);

            // Should have proper vendor prefixes or modern equivalents
            expect(cssContent).toMatch(/(-webkit-|-moz-|-ms-|border-radius|box-shadow)/);

            // Should not have obvious syntax errors
            expect(cssContent).toMatch(/\{[^}]*\}/); // Should have CSS rules
            expect((cssContent.match(/\{/g) || []).length).toBe((cssContent.match(/\}/g) || []).length);
        });
    });
});
