import { apiGetAppDump, apiGetSenseAppDump } from '../sense_app_dump.js';

describe('API schema: sense_app_dump', () => {
    test.each([
        ['apiGetSenseAppDump', apiGetSenseAppDump],
        ['apiGetAppDump', apiGetAppDump],
    ])('%s documents lineage discriminator values', (_name, schemaExport) => {
        expect(schemaExport.schema.response[200].properties.appId.type).toBe('string');
        expect(schemaExport.schema.response[200].examples[0].appId).toBeDefined();

        const lineageItem =
            schemaExport.schema.response[200].properties.lineage.properties.qLineage.items.properties;

        expect(lineageItem.qDiscriminator.description).toContain('INLINE');
        expect(lineageItem.qDiscriminator.description).toContain('RESIDENT');
        expect(lineageItem.qDiscriminator.description).toContain('AUTOGENERATE');
        expect(lineageItem.qDiscriminator.description).toContain('STORE');
        expect(lineageItem.qDiscriminator.description).toContain('EXTENSION');
        expect(lineageItem.qDiscriminator.description).toContain('[filename]');
        expect(lineageItem.qDiscriminator.description).toContain('[webfile]');
        expect(lineageItem.qDiscriminator.description).toContain('JSON/JavaScript string syntax');
        expect(lineageItem.qDiscriminator.examples).toContain('\\\\192.168.1.124\\testdata\\tedtalk\\ted_main.csv');
        expect(lineageItem.qDiscriminator.examples).toContain('Provider');
        expect(lineageItem.qStatement.description).toContain('LOAD or SELECT');
    });
});
