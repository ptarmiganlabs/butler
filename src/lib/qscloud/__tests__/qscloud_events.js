// Qlik Sense Cloud app reload failure events, for the tests of the code that reads them.
// Qlik Sense Cloud sends its webhook events in the CloudEvents format, and until 10 December 2026 also in a legacy format.

/**
 * Convert an event in the legacy format to the CloudEvents format, as Qlik's changelog maps the attributes:
 * https://qlik.dev/changelog/210-apps-events-cloudevents/
 *
 * @param {Object} event - Event in the legacy format
 * @returns {Object} The same event in the CloudEvents format, which has no event type version
 */
export function toCloudEventsFormat(event) {
    const { extensions } = event;

    return {
        specversion: '1.0',
        id: event.eventId,
        source: event.source,
        type: event.eventType,
        time: event.eventTime,
        datacontenttype: event.contentType,
        tenantid: extensions.tenantId,
        userid: extensions.userId,
        ownerid: extensions.ownerId,
        spaceid: extensions.spaceId,
        toplevelresourceid: extensions.topLevelResourceId,
        data: event.data,
    };
}

// A failed app reload, as Qlik Sense Cloud sends it in the legacy format
export const legacyEvent = {
    cloudEventsVersion: '0.1',
    source: 'com.qlik/engine',
    contentType: 'application/json',
    eventId: 'b0f5c473-5dea-4d7e-a188-5e0b904cde33',
    eventTime: '2026-11-06T10:15:00Z',
    eventTypeVersion: '1.0.0',
    eventType: 'com.qlik.v1.app.reload.finished',
    extensions: { ownerId: 'owner-1', tenantId: 'tenant-1', userId: 'user-1', spaceId: 'space-1', topLevelResourceId: 'app-1' },
    data: { status: 'error', name: 'Sales forecast', reloadId: 'reload-1' },
};

// The same event in the CloudEvents format, the only format Qlik Sense Cloud sends from 10 December 2026.
// Written out with the attribute names of the example in Qlik's event reference, https://qlik.dev/apis/event/apps/
export const cloudEvent = {
    specversion: '1.0',
    id: 'b0f5c473-5dea-4d7e-a188-5e0b904cde33',
    source: 'com.qlik/engine',
    type: 'com.qlik.v1.app.reload.finished',
    time: '2026-11-06T10:15:00Z',
    datacontenttype: 'application/json',
    tenantid: 'tenant-1',
    userid: 'user-1',
    ownerid: 'owner-1',
    spaceid: 'space-1',
    toplevelresourceid: 'app-1',
    data: { status: 'error', name: 'Sales forecast', reloadId: 'reload-1' },
};
