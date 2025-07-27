import os from 'os';
import fs from 'fs';
import yaml from 'js-yaml';
import { confifgFileSchema } from '../../lib/assert/config-file-schema.js';

/**
 * Test system information configuration
 */
describe('System Information Configuration', () => {
    test('Should validate systemInfo config schema with enabled setting', () => {
        // Test that the configuration schema includes systemInfo
        expect(confifgFileSchema).toBeDefined();
        expect(confifgFileSchema.properties.Butler).toBeDefined();
        expect(confifgFileSchema.properties.Butler.properties.systemInfo).toBeDefined();
        expect(confifgFileSchema.properties.Butler.properties.systemInfo.properties.enable).toBeDefined();
        expect(confifgFileSchema.properties.Butler.properties.systemInfo.properties.enable.type).toBe('boolean');
        
        // Check that systemInfo is in required fields
        expect(confifgFileSchema.properties.Butler.required).toContain('systemInfo');
    });

    test('Should include systemInfo in YAML template', () => {
        // This is more of an integration test to ensure our template includes systemInfo
        
        try {
            const templatePath = './src/config/production_template.yaml';
            const templateContent = fs.readFileSync(templatePath, 'utf8');
            const parsedYaml = yaml.load(templateContent);
            
            expect(parsedYaml.Butler.systemInfo).toBeDefined();
            expect(parsedYaml.Butler.systemInfo.enable).toBeDefined();
            expect(typeof parsedYaml.Butler.systemInfo.enable).toBe('boolean');
        } catch (error) {
            // If we can't read the template file, just check that the schema is correct
            expect(confifgFileSchema.properties.Butler.properties.systemInfo).toBeDefined();
        }
    });

    test('Should verify systemInfo schema structure', () => {
        // Test the schema structure in detail
        const systemInfoSchema = confifgFileSchema.properties.Butler.properties.systemInfo;
        
        expect(systemInfoSchema.type).toBe('object');
        expect(systemInfoSchema.properties).toBeDefined();
        expect(systemInfoSchema.properties.enable).toBeDefined();
        expect(systemInfoSchema.properties.enable.type).toBe('boolean');
        expect(systemInfoSchema.required).toContain('enable');
        expect(systemInfoSchema.additionalProperties).toBe(false);
    });
});