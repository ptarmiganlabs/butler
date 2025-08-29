/**
 * Modern replacement for the serializeapp library
 * Serializes a Qlik Sense App into JSON with backwards compatibility
 */

/**
 * Get a list of objects of a specific type from the app
 * @param {Object} app - The Qlik Sense app object
 * @param {string} objectType - Type of objects to retrieve
 * @returns {Promise<Array>} Promise resolving to array of object properties
 */
async function getList(app, objectType) {
    const list = await app.createSessionObject({
        qAppObjectListDef: {
            qType: objectType,
            qData: {
                id: '/qInfo/qId',
            },
        },
        qInfo: {
            qId: objectType + 'List',
            qType: objectType + 'List',
        },
        qMetaDef: {},
        qExtendsId: '',
    });

    const layout = await list.getLayout();
    const objects = await Promise.all(
        layout.qAppObjectList.qItems.map(async (d) => {
            const handle = await app.getObject(d.qInfo.qId);
            return handle.getFullPropertyTree();
        }),
    );

    return objects;
}

/**
 * Get dimensions from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of dimensions
 */
async function getDimensions(app) {
    const list = await app.createSessionObject({
        qDimensionListDef: {
            qType: 'dimension',
            qData: {
                info: '/qDimInfos',
            },
            qMeta: {},
        },
        qInfo: { qId: 'DimensionList', qType: 'DimensionList' },
    });

    const layout = await list.getLayout();
    const dimensions = await Promise.all(
        layout.qDimensionList.qItems.map(async (d) => {
            const dimension = await app.getDimension(d.qInfo.qId);
            return dimension.getProperties();
        }),
    );

    return dimensions;
}

/**
 * Get measures from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of measures
 */
async function getMeasures(app) {
    const list = await app.createSessionObject({
        qMeasureListDef: {
            qType: 'measure',
            qData: {
                info: '/qDimInfos',
            },
            qMeta: {},
        },
        qInfo: { qId: 'MeasureList', qType: 'MeasureList' },
    });

    const layout = await list.getLayout();
    const measures = await Promise.all(
        layout.qMeasureList.qItems.map(async (d) => {
            const measure = await app.getMeasure(d.qInfo.qId);
            const properties = await measure.getProperties();
            return properties;
        }),
    );

    return measures;
}

/**
 * Get bookmarks from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of bookmarks
 */
async function getBookmarks(app) {
    const list = await app.createSessionObject({
        qBookmarkListDef: {
            qType: 'bookmark',
            qData: {
                info: '/qDimInfos',
            },
            qMeta: {},
        },
        qInfo: { qId: 'BookmarkList', qType: 'BookmarkList' },
    });

    const layout = await list.getLayout();
    const bookmarks = await Promise.all(
        layout.qBookmarkList.qItems.map(async (d) => {
            const bookmark = await app.getBookmark(d.qInfo.qId);
            const properties = await bookmark.getProperties();
            const bookmarkLayout = await bookmark.getLayout();

            properties.qData = properties.qData || {};
            properties.qData.qBookMark = bookmarkLayout.qBookmark;

            return properties;
        }),
    );

    return bookmarks;
}

/**
 * Get embedded media list from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of embedded media
 */
async function getMediaList(app) {
    const list = await app.createSessionObject({
        qInfo: {
            qId: 'mediaList',
            qType: 'MediaList',
        },
        qMediaListDef: {},
    });

    const layout = await list.getLayout();
    return layout.qMediaList.qItems.filter((d) => {
        // Filter embedded media (as in original implementation)
        return d.qUrlDef.substring(0, 7) === '/media/';
    });
}

/**
 * Get snapshots from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of snapshots
 */
async function getSnapshots(app) {
    const list = await app.createSessionObject({
        qBookmarkListDef: {
            qType: 'snapshot',
            qData: {
                info: '/qDimInfos',
            },
            qMeta: {},
        },
        qInfo: { qId: 'BookmarkList', qType: 'BookmarkList' },
    });

    const layout = await list.getLayout();
    const snapshots = await Promise.all(
        layout.qBookmarkList.qItems.map(async (d) => {
            const bookmark = await app.getBookmark(d.qInfo.qId);
            const properties = await bookmark.getProperties();
            return properties;
        }),
    );

    return snapshots;
}

/**
 * Get fields from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of fields
 */
async function getFields(app) {
    const fields = await app.createSessionObject({
        qFieldListDef: {
            qShowSystem: true,
            qShowHidden: true,
            qShowSrcTables: true,
            qShowSemantic: true,
        },
        qInfo: { qId: 'FieldList', qType: 'FieldList' },
    });

    const layout = await fields.getLayout();
    return layout.qFieldList.qItems;
}

/**
 * Get data connections from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of data connections
 */
async function getDataConnections(app) {
    const connections = await app.getConnections();
    const connectionDetails = await Promise.all(
        connections.map(async (d) => {
            return app.getConnection(d.qId);
        }),
    );

    return connectionDetails;
}

/**
 * Get variables from the app
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Array>} Promise resolving to array of variables
 */
async function getVariables(app) {
    const list = await app.createSessionObject({
        qVariableListDef: {
            qType: 'variable',
            qShowReserved: true,
            qShowConfig: true,
            qData: {
                info: '/qDimInfos',
            },
            qMeta: {},
        },
        qInfo: { qId: 'VariableList', qType: 'VariableList' },
    });

    const layout = await list.getLayout();
    const variables = await Promise.all(
        layout.qVariableList.qItems.map(async (d) => {
            const variable = await app.getVariableById(d.qInfo.qId);
            const properties = await variable.getProperties();

            // Add additional properties from the list item
            if (d.qIsScriptCreated) properties.qIsScriptCreated = d.qIsScriptCreated;
            if (d.qIsReserved) properties.qIsReserved = d.qIsReserved;
            if (d.qIsConfig) properties.qIsConfig = d.qIsConfig;

            return properties;
        }),
    );

    return variables;
}

/**
 * Serialize a Qlik Sense app into JSON
 * Backwards compatible replacement for the serializeapp library
 * @param {Object} app - The Qlik Sense app object
 * @returns {Promise<Object>} Promise resolving to serialized app data
 */
async function serializeApp(app) {
    if (!app || typeof app.createSessionObject !== 'function') {
        throw new Error('Expects a valid qsocks app connection');
    }

    const appObj = {};

    // Generic Lists to be iterated over for qAppObjectListDef
    const LISTS = [{ sheets: 'sheet' }, { stories: 'story' }, { masterobjects: 'masterobject' }, { appprops: 'appprops' }];

    // Property name mapping against methods
    const METHODS = {
        dimensions: getDimensions,
        measures: getMeasures,
        bookmarks: getBookmarks,
        embeddedmedia: getMediaList,
        snapshots: getSnapshots,
        fields: getFields,
        dataconnections: getDataConnections,
        variables: getVariables,
    };

    // Get app properties
    const properties = await app.getAppProperties();
    appObj.properties = properties;

    // Get load script
    const script = await app.getScript();
    appObj.loadScript = script;

    // Get generic lists
    const listData = await Promise.all(
        LISTS.map(async (d) => {
            const objectType = d[Object.keys(d)[0]];
            return getList(app, objectType);
        }),
    );

    LISTS.forEach((d, y) => {
        const key = Object.keys(d)[0];
        appObj[key] = listData[y];
    });

    // Get specialized collections
    await Promise.all(
        Object.keys(METHODS).map(async (key) => {
            const data = await METHODS[key](app);
            appObj[key] = data;
        }),
    );

    return appObj;
}

export default serializeApp;
