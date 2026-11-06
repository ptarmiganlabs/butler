import globals from '../../globals.js';

/**
 * Retrieves Qlik Sense Cloud URLs from the configuration.
 * @returns {Object} An object containing the QMC and Hub URLs.
 */
export function getQlikSenseCloudUrls() {
    const qmcUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
    const hubUrl = globals.config.get('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');

    return {
        qmcUrl,
        hubUrl,
    };
}

/**
 * Gets the attributes Butler uses from a Qlik Sense Cloud event, in either of the formats Qlik Sense Cloud sends.
 *
 * Qlik Sense Cloud is moving its webhook events from a legacy format to the CloudEvents format.
 * Since 3 November 2025 the events have the attributes of both formats, and from 10 December 2026 only the CloudEvents ones.
 * An attribute is taken from the CloudEvents format when the event has it there and it isn't empty, and from the legacy format otherwise.
 *
 * @param {Object} event - Qlik Sense Cloud event, as forwarded to MQTT
 * @returns {Object} The event's type, time, type version and source, the type of principal that triggered it,
 * and the IDs of its tenant, user, owner and top level resource. An attribute the event has in neither format is undefined.
 */
export function getQlikSenseCloudEventAttributes(event) {
    // The legacy format has the IDs in an extensions object
    const extensions = event.extensions || {};

    return {
        eventType: event.type || event.eventType,
        eventTime: event.time || event.eventTime,
        // The CloudEvents format has no event type version
        eventTypeVersion: event.eventTypeVersion,
        source: event.source,
        // Only the CloudEvents format has the type of principal that triggered the event, for example service_account
        authType: event.authtype,
        tenantId: event.tenantid || extensions.tenantId,
        userId: event.userid || extensions.userId,
        ownerId: event.ownerid || extensions.ownerId,
        topLevelResourceId: event.toplevelresourceid || extensions.topLevelResourceId,
    };
}
