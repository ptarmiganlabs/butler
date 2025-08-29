import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Config Visualization Static Files', () => {
    const staticPath = path.resolve(process.cwd(), 'static/configvis');

    test('should have prism.js file', () => {
        const prismJsPath = path.join(staticPath, 'prism.js');
        expect(fs.existsSync(prismJsPath)).toBe(true);
        
        const content = fs.readFileSync(prismJsPath, 'utf8');
        expect(content).toContain('PrismJS');
        expect(content).toContain('https://prismjs.com');
    });

    test('should have prism.css file', () => {
        const prismCssPath = path.join(staticPath, 'prism.css');
        expect(fs.existsSync(prismCssPath)).toBe(true);
        
        const content = fs.readFileSync(prismCssPath, 'utf8');
        expect(content).toContain('PrismJS');
        expect(content).toContain('prism-twilight');
    });

    test('should have index.html that references prism files', () => {
        const indexPath = path.join(staticPath, 'index.html');
        expect(fs.existsSync(indexPath)).toBe(true);
        
        const content = fs.readFileSync(indexPath, 'utf8');
        expect(content).toContain('prism.css');
        expect(content).toContain('prism.js');
    });

    test('prism.js should support YAML language and line numbers', () => {
        const prismJsPath = path.join(staticPath, 'prism.js');
        const content = fs.readFileSync(prismJsPath, 'utf8');
        
        // Check for YAML language support
        expect(content).toContain('yaml');
        
        // Check for line numbers plugin
        expect(content).toContain('line-numbers');
    });

    test('prism.css should include twilight theme styles', () => {
        const prismCssPath = path.join(staticPath, 'prism.css');
        const content = fs.readFileSync(prismCssPath, 'utf8');
        
        // Check for twilight theme characteristics
        expect(content).toContain('prism-twilight');
        expect(content).toContain('.line-numbers');
    });

    test('prism files should have consistent version headers', () => {
        const prismJsPath = path.join(staticPath, 'prism.js');
        const prismCssPath = path.join(staticPath, 'prism.css');
        
        const jsContent = fs.readFileSync(prismJsPath, 'utf8');
        const cssContent = fs.readFileSync(prismCssPath, 'utf8');
        
        // Extract version from both files
        const jsVersionMatch = jsContent.match(/PrismJS (\d+\.\d+\.\d+)/);
        const cssVersionMatch = cssContent.match(/PrismJS (\d+\.\d+\.\d+)/);
        
        expect(jsVersionMatch).toBeTruthy();
        expect(cssVersionMatch).toBeTruthy();
        expect(jsVersionMatch[1]).toBe(cssVersionMatch[1]);
    });

    test('prism.js should be valid JavaScript', () => {
        const prismJsPath = path.join(staticPath, 'prism.js');
        const content = fs.readFileSync(prismJsPath, 'utf8');
        
        // Basic syntax validation - should not throw when evaluating
        expect(() => {
            // Use eval in a try-catch to check for basic syntax errors
            // Note: This is for testing purposes only
            eval('(function() { ' + content + ' })');
        }).not.toThrow();
    });
});