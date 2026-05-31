import { jest } from '@jest/globals';

describe('lib/serialize_app', () => {
    let serializeApp;

    beforeAll(async () => {
        ({ default: serializeApp } = await import('../serialize_app.js'));
    });

    test('includes lineage info in serialized app dump', async () => {
        const appProperties = { qTitle: 'Test app' };
        const lineage = { qLineage: [{ qDiscriminator: 'LOAD', qStatement: 'LOAD * INLINE [a];' }] };
        const emptyListSessionObject = { getLayout: jest.fn(async () => ({ qAppObjectList: { qItems: [] } })) };
        const emptyDimensionSessionObject = { getLayout: jest.fn(async () => ({ qDimensionList: { qItems: [] } })) };
        const emptyMeasureSessionObject = { getLayout: jest.fn(async () => ({ qMeasureList: { qItems: [] } })) };
        const emptyBookmarkSessionObject = { getLayout: jest.fn(async () => ({ qBookmarkList: { qItems: [] } })) };
        const emptyMediaSessionObject = { getLayout: jest.fn(async () => ({ qMediaList: { qItems: [] } })) };
        const emptyFieldSessionObject = { getLayout: jest.fn(async () => ({ qFieldList: { qItems: [] } })) };
        const emptyVariableSessionObject = { getLayout: jest.fn(async () => ({ qVariableList: { qItems: [] } })) };

        const app = {
            createSessionObject: jest.fn(async (definition) => {
                if (definition.qAppObjectListDef) return emptyListSessionObject;
                if (definition.qDimensionListDef) return emptyDimensionSessionObject;
                if (definition.qMeasureListDef) return emptyMeasureSessionObject;
                if (definition.qBookmarkListDef) return emptyBookmarkSessionObject;
                if (definition.qMediaListDef) return emptyMediaSessionObject;
                if (definition.qFieldListDef) return emptyFieldSessionObject;
                if (definition.qVariableListDef) return emptyVariableSessionObject;

                throw new Error(`Unexpected session object definition: ${JSON.stringify(definition)}`);
            }),
            getAppProperties: jest.fn(async () => appProperties),
            getScript: jest.fn(async () => 'LOAD *;'),
            getLineage: jest.fn(async () => lineage),
            getConnections: jest.fn(async () => []),
        };

        await expect(serializeApp(app)).resolves.toEqual({
            properties: appProperties,
            loadScript: 'LOAD *;',
            lineage,
            sheets: [],
            stories: [],
            masterobjects: [],
            appprops: [],
            dimensions: [],
            measures: [],
            bookmarks: [],
            embeddedmedia: [],
            snapshots: [],
            fields: [],
            dataconnections: [],
            variables: [],
        });
        expect(app.getLineage).toHaveBeenCalledTimes(1);
    });
});
