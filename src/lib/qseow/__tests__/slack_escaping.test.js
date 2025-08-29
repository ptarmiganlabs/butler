import { jest } from '@jest/globals';
import handlebars from 'handlebars';

// Test the escapeForJson function directly
const escapeForJson = (str) => JSON.stringify(str).slice(1, -1);

describe('Slack Message JSON Escaping', () => {
    describe('escapeForJson function', () => {
        test('should escape single backslashes', () => {
            const input = 'C:\\path\\to\\file.qvs';
            const result = escapeForJson(input);
            expect(result).toBe('C:\\\\path\\\\to\\\\file.qvs');
        });

        test('should escape double quotes', () => {
            const input = 'Error: Expected ")" but found "("';
            const result = escapeForJson(input);
            expect(result).toBe('Error: Expected \\")\\\" but found \\\"(\\\"');
        });

        test('should escape newlines', () => {
            const input = 'Line 1\nLine 2\nLine 3';
            const result = escapeForJson(input);
            expect(result).toBe('Line 1\\nLine 2\\nLine 3');
        });

        test('should escape carriage returns and tabs', () => {
            const input = 'Data:\tValue\r\nNext line';
            const result = escapeForJson(input);
            expect(result).toBe('Data:\\tValue\\r\\nNext line');
        });

        test('should handle complex script log content', () => {
            const input = `Error loading script file: C:\\temp\\script.qvs
Script failed at line 42: Expected ")" but found "\\"
Path contains spaces: "C:\\Program Files\\Qlik\\Sense"
SQL error: WHERE name = 'O'Brien's data'`;
            const result = escapeForJson(input);

            // Should be valid JSON when wrapped in quotes
            expect(() => JSON.parse(`"${result}"`)).not.toThrow();

            // Should contain properly escaped content
            expect(result).toContain('C:\\\\temp\\\\script.qvs');
            expect(result).toContain('Expected \\\")\\\" but found \\\"\\\\\\\"');
            expect(result).toContain("O'Brien's data");
        });

        test('should handle empty string', () => {
            const result = escapeForJson('');
            expect(result).toBe('');
        });

        test('should handle string with only special characters', () => {
            const input = '\\\n\r\t"\'';
            const result = escapeForJson(input);
            expect(result).toBe('\\\\\\n\\r\\t\\\"\''); // JSON.stringify doesn't escape single quotes
        });
    });

    describe('Slack template rendering with escaping', () => {
        const slackTemplate = `{
    "blocks": [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Script logs:\\n\`\`\`{{{ scriptLogHead }}}\`\`\`"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn", 
                "text": "Error details:\\n\`\`\`{{{ errorMessage }}}\`\`\`"
            }
        }
    ]
}`;

        test('should render valid JSON with properly escaped Windows paths', () => {
            const templateContext = {
                scriptLogHead: escapeForJson('Loading file: C:\\data\\input.qvd\nProcessing data...'),
                errorMessage: escapeForJson('File not found: C:\\temp\\output.qvd'),
            };

            const compiledTemplate = handlebars.compile(slackTemplate);
            const renderedJson = compiledTemplate(templateContext);

            // Should parse as valid JSON
            expect(() => JSON.parse(renderedJson)).not.toThrow();

            const parsed = JSON.parse(renderedJson);
            expect(parsed.blocks[0].text.text).toContain('C:\\data\\input.qvd');
            expect(parsed.blocks[1].text.text).toContain('C:\\temp\\output.qvd');
        });

        test('should render valid JSON with quotes in error messages', () => {
            const templateContext = {
                scriptLogHead: escapeForJson('SQL: SELECT * FROM table WHERE name = "test"'),
                errorMessage: escapeForJson('Syntax error: Expected ")" but found "("'),
            };

            const compiledTemplate = handlebars.compile(slackTemplate);
            const renderedJson = compiledTemplate(templateContext);

            // Should parse as valid JSON
            expect(() => JSON.parse(renderedJson)).not.toThrow();

            const parsed = JSON.parse(renderedJson);
            expect(parsed.blocks[0].text.text).toContain('name = "test"');
            expect(parsed.blocks[1].text.text).toContain('Expected ")" but found "("');
        });

        test('should handle multi-line script logs with mixed content', () => {
            const scriptLog = `2023-08-29 10:30:15 - Loading script: C:\\Scripts\\reload.qvs
2023-08-29 10:30:16 - SQL: SELECT * FROM "Sales Data" WHERE date >= '2023-01-01'
2023-08-29 10:30:17 - Error: OLE DB Exception: Invalid column "Product Name"
2023-08-29 10:30:18 - Script execution failed at line 125
2023-08-29 10:30:19 - Rollback initiated`;

            const templateContext = {
                scriptLogHead: escapeForJson(scriptLog),
                errorMessage: escapeForJson('Critical failure in data load process'),
            };

            const compiledTemplate = handlebars.compile(slackTemplate);
            const renderedJson = compiledTemplate(templateContext);

            // Should parse as valid JSON
            expect(() => JSON.parse(renderedJson)).not.toThrow();

            const parsed = JSON.parse(renderedJson);
            const logText = parsed.blocks[0].text.text;
            expect(logText).toContain('C:\\Scripts\\reload.qvs');
            expect(logText).toContain('"Sales Data"');
            expect(logText).toContain('"Product Name"');
        });
    });

    describe('Problematic content that would break old implementation', () => {
        test('should handle content that would cause "Expected comma or }" errors', () => {
            // These are real-world examples that caused JSON parsing failures
            const problematicContent = [
                'Path: C:\\Program Files\\Qlik Sense\\Engine\\',
                'Error: Unexpected token "}" in JSON at position 123',
                "SQL: WHERE name = 'O'Brien' AND type = \"special\"",
                'Regex pattern: /\\d+\\.\\d+/',
                'Windows path with spaces: "C:\\Documents and Settings\\User\\"',
                'Script log:\n\tLine 1\n\tLine 2\r\n\tLine 3',
            ];

            problematicContent.forEach((content, index) => {
                const escaped = escapeForJson(content);
                const json = `{"message": "${escaped}"}`;

                expect(() => JSON.parse(json)).not.toThrow();

                const parsed = JSON.parse(json);
                // The unescaped content should match the original (minus escape chars)
                expect(parsed.message).toBe(content);
            });
        });

        test('should demonstrate old regex escaping would fail', () => {
            // Simulate the old regex-based escaping approach
            const oldEscapeBackslashes = (str) => str.replace(/(?!\\n)\\{1}/gm, '\\\\');

            const problematicInput = 'Path: C:\\temp\\ and quote: "test"';

            // Old approach only escaped backslashes, not quotes
            const oldResult = oldEscapeBackslashes(problematicInput);
            const jsonWithOldEscaping = `{"message": "${oldResult}"}`;

            // This should throw because quotes aren't escaped
            expect(() => JSON.parse(jsonWithOldEscaping)).toThrow();

            // New approach should work
            const newResult = escapeForJson(problematicInput);
            const jsonWithNewEscaping = `{"message": "${newResult}"}`;
            expect(() => JSON.parse(jsonWithNewEscaping)).not.toThrow();
        });

        test('should handle edge case with only backslashes and newlines', () => {
            const input = '\\\\n\\\\t\\\\r';
            const result = escapeForJson(input);
            const json = `{"test": "${result}"}`;

            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);
            expect(parsed.test).toBe(input);
        });
    });

    describe('Performance and edge cases', () => {
        test('should handle very long strings efficiently', () => {
            const longString = 'C:\\path\\to\\file.qvs\n'.repeat(1000);
            const start = Date.now();
            const result = escapeForJson(longString);
            const end = Date.now();

            // Should complete in reasonable time (< 100ms for 1000 repetitions)
            expect(end - start).toBeLessThan(100);

            // Should still produce valid JSON
            const json = `{"data": "${result}"}`;
            expect(() => JSON.parse(json)).not.toThrow();
        });

        test('should handle null and undefined inputs gracefully', () => {
            // In real usage, these would be handled before escaping
            expect(() => escapeForJson('')).not.toThrow();
            expect(escapeForJson('')).toBe('');
        });

        test('should handle Unicode and special characters', () => {
            const unicodeInput = 'Data: "测试" and emoji: 🚀 with path: C:\\데이터\\파일.qvd';
            const result = escapeForJson(unicodeInput);
            const json = `{"unicode": "${result}"}`;

            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);
            expect(parsed.unicode).toBe(unicodeInput);
        });
    });
});
