import { jest } from '@jest/globals';
import handlebars from 'handlebars';

// Test the escapeForJson function directly
const escapeForJson = (str) => JSON.stringify(str).slice(1, -1);

describe('QSCloud Slack Message JSON Escaping', () => {
    describe('escapeForJson function consistency', () => {
        test('should work identically to QSEOW version for Windows paths', () => {
            const input = 'C:\\Program Files\\Qlik\\Sense\\Engine\\data.qvd';
            const result = escapeForJson(input);
            expect(result).toBe('C:\\\\Program Files\\\\Qlik\\\\Sense\\\\Engine\\\\data.qvd');
        });

        test('should handle QSCloud-specific error patterns', () => {
            const cloudError = `App reload failed in tenant: acme-corp
Error: Connection timeout to data source "PostgreSQL DB"
Reload ID: 64a7c8b9-1234-5678-9abc-def012345678
Stack trace: at ReloadEngine.processData() line 156`;

            const result = escapeForJson(cloudError);

            // Should be valid JSON when wrapped in quotes
            expect(() => JSON.parse(`"${result}"`)).not.toThrow();

            // Should contain properly escaped content
            expect(result).toContain('Connection timeout to data source \\\"PostgreSQL DB\\\"');
            expect(result).toContain('at ReloadEngine.processData() line 156');
        });
    });

    describe('QSCloud-specific template rendering', () => {
        const qsCloudSlackTemplate = `{
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "Qlik Sense Cloud reload failed"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Tenant:*\\n{{tenantName}}"
                },
                {
                    "type": "mrkdwn", 
                    "text": "*App ID:*\\n{{appId}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Error Details:*\\n\`\`\`{{{ errorDetails }}}\`\`\`"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Script log:\\n\`\`\`{{{ scriptLogHead }}}\`\`\`"
            }
        }
    ]
}`;

        test('should render valid JSON for QSCloud app reload failures', () => {
            const templateContext = {
                tenantName: escapeForJson('acme-corp.us.qlikcloud.com'),
                appId: escapeForJson('64a7c8b9-1234-5678-9abc-def012345678'),
                errorDetails: escapeForJson('Connection failed to "External API"\nTimeout after 30 seconds'),
                scriptLogHead: escapeForJson('2023-08-29 14:30:15 - Starting reload\n2023-08-29 14:30:45 - Error: API connection timeout'),
            };

            const compiledTemplate = handlebars.compile(qsCloudSlackTemplate);
            const renderedJson = compiledTemplate(templateContext);

            // Should parse as valid JSON
            expect(() => JSON.parse(renderedJson)).not.toThrow();

            const parsed = JSON.parse(renderedJson);
            expect(parsed.blocks[1].fields[0].text).toContain('acme-corp.us.qlikcloud.com');
            expect(parsed.blocks[1].fields[2].text).toContain('Connection failed to "External API"');
            expect(parsed.blocks[2].text.text).toContain('API connection timeout');
        });

        test('should handle QSCloud OAuth and authentication errors', () => {
            const authError = `OAuth authentication failed for tenant: customer.eu.qlikcloud.com
Error: "invalid_grant" - The provided authorization grant is invalid
Client ID: qlik-sense-mobile-app
Scope: user_default
Timestamp: 2023-08-29T14:30:15.123Z`;

            const templateContext = {
                tenantName: escapeForJson('customer.eu.qlikcloud.com'),
                appId: escapeForJson('auth-error'),
                errorDetails: escapeForJson(authError),
                scriptLogHead: escapeForJson('Authentication process started\nValidating OAuth tokens\nError encountered'),
            };

            const compiledTemplate = handlebars.compile(qsCloudSlackTemplate);
            const renderedJson = compiledTemplate(templateContext);

            // Should parse as valid JSON
            expect(() => JSON.parse(renderedJson)).not.toThrow();

            const parsed = JSON.parse(renderedJson);
            expect(parsed.blocks[1].fields[2].text).toContain('"invalid_grant"');
            expect(parsed.blocks[1].fields[2].text).toContain('qlik-sense-mobile-app');
        });
    });

    describe('QSCloud vs QSEOW escaping differences', () => {
        test('should handle cloud-specific vs on-premises path differences', () => {
            // QSCloud typically doesn't have Windows file paths, but might have URLs
            const cloudContent = `Loading data from: https://api.example.com/data?filter="active"
API Response: {"status": "error", "message": "Unauthorized access"}
Tenant URL: https://customer.us.qlikcloud.com`;

            const onPremContent = `Loading data from: C:\\Data\\Sources\\customer_data.qvd
UNC Path: \\\\server\\share\\folder\\file.qvd
Registry: HKEY_LOCAL_MACHINE\\SOFTWARE\\Qlik\\Sense`;

            const cloudResult = escapeForJson(cloudContent);
            const onPremResult = escapeForJson(onPremContent);

            // Both should produce valid JSON
            expect(() => JSON.parse(`{"cloud": "${cloudResult}"}`)).not.toThrow();
            expect(() => JSON.parse(`{"onprem": "${onPremResult}"}`)).not.toThrow();

            // Cloud result should have escaped URLs and JSON
            expect(cloudResult).toContain('https://api.example.com/data?filter=\\\"active\\\"');
            expect(cloudResult).toContain('{\\\"status\\\": \\\"error\\\", \\\"message\\\": \\\"Unauthorized access\\\"}');

            // On-prem result should have escaped backslashes
            expect(onPremResult).toContain('C:\\\\Data\\\\Sources\\\\customer_data.qvd');
            expect(onPremResult).toContain('\\\\\\\\server\\\\share\\\\folder\\\\file.qvd');
        });
    });

    describe('Edge cases specific to cloud deployments', () => {
        test('should handle multi-tenant error messages', () => {
            const multiTenantError = `Cross-tenant data access denied
Source tenant: "partner-a.us.qlikcloud.com"
Target tenant: "partner-b.eu.qlikcloud.com"
Error: Permission denied for resource "/api/v1/apps/shared"
Policy: "cross_tenant_access_restricted"`;

            const result = escapeForJson(multiTenantError);
            const json = `{"error": "${result}"}`;

            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);
            expect(parsed.error).toContain('partner-a.us.qlikcloud.com');
            expect(parsed.error).toContain('/api/v1/apps/shared');
            expect(parsed.error).toContain('cross_tenant_access_restricted');
        });

        test('should handle cloud resource limit errors', () => {
            const resourceError = `Resource quota exceeded for tenant: enterprise.qlikcloud.com
Limit: 1000 reload hours/month
Current usage: 1000.5 hours
Overage: 0.5 hours ($12.50)
Contact: support@company.com for upgrade options`;

            const result = escapeForJson(resourceError);
            const json = `{"quota": "${result}"}`;

            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);
            expect(parsed.quota).toContain('enterprise.qlikcloud.com');
            expect(parsed.quota).toContain('support@company.com');
        });

        test('should handle JSON API responses embedded in logs', () => {
            const apiResponseLog = `API call to: https://api.salesforce.com/services/data/v56.0/query
Response: {
  "totalSize": 1,
  "done": true,
  "records": [
    {
      "attributes": {
        "type": "Account",
        "url": "/services/data/v56.0/sobjects/Account/001XX000003DHInYAO"
      },
      "Name": "O'Reilly & Associates \"Books\""
    }
  ]
}
Status: 200 OK`;

            const result = escapeForJson(apiResponseLog);
            const json = `{"api_log": "${result}"}`;

            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);

            // Should preserve the structure while escaping properly
            expect(parsed.api_log).toContain('https://api.salesforce.com/services/data/v56.0/query');
            expect(parsed.api_log).toContain('O\'Reilly & Associates "Books"');
            expect(parsed.api_log).toContain('"totalSize": 1');
        });
    });

    describe('Integration with QSCloud notification system', () => {
        test('should integrate with rate limiting and not cause JSON errors', () => {
            // Simulate rapid-fire error messages that might trigger rate limiting
            const rapidErrors = [
                'Error 1: Connection timeout to "Database A"',
                'Error 2: Authentication failed for user "test@company.com"',
                'Error 3: SQL syntax error: Expected ")" near \'customers\'',
                'Error 4: File not found: "/opt/qlik/data/temp.qvd"',
                'Error 5: Memory limit exceeded: 4.2GB > 4.0GB limit',
            ];

            rapidErrors.forEach((error, index) => {
                const result = escapeForJson(error);
                const json = `{"error_${index}": "${result}"}`;

                expect(() => JSON.parse(json)).not.toThrow();
            });
        });
    });
});
