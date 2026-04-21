import _ from 'lodash';

import globals from '../../globals.js';

/**
 * Sends Windows service status to InfluxDB.
 *
 * Collects static tags from config, builds a datapoint with service name, display name,
 * friendly name, state (mapped to a numeric value), and startup mode (mapped to a numeric value),
 * then writes it to InfluxDB.
 *
 * @param {Object} serviceStatus Windows service status information.
 * @param {string} serviceStatus.host Host name.
 * @param {string} serviceStatus.serviceName Service name.
 * @param {string} serviceStatus.serviceFriendlyName Friendly name of the service.
 * @param {string} serviceStatus.serviceStatus Current service status (e.g. "RUNNING", "STOPPED").
 * @param {Object} serviceStatus.serviceDetails Service details.
 * @param {string} serviceStatus.serviceDetails.displayName Display name.
 * @param {string} serviceStatus.serviceDetails.startType Startup type (e.g. "Automatic", "Manual").
 * @returns {void}
 */
export function postWindowsServiceStatusToInfluxDB(serviceStatus) {
    // Log the incoming service status at verbose level, including service name and status
    globals.logger.verbose(
        `WINDOWS SERVICE STATUS: Sending service status to InfluxDB: service="${serviceStatus.serviceFriendlyName}", status="${serviceStatus.serviceStatus}"`,
    );

    // Create a lookup table mapping Windows service state strings to numeric codes (1-based)
    // This makes it easier to aggregate and query state data in InfluxDB
    const serviceStateLookup = {
        STOPPED: 1,
        START_PENDING: 2,
        STOP_PENDING: 3,
        RUNNING: 4,
        CONTINUE_PENDING: 5,
        PAUSE_PENDING: 6,
        PAUSED: 7,
    };

    // Create a lookup table mapping Windows service startup mode strings to numeric codes (0-based)
    // This makes it easier to aggregate and query startup mode data in InfluxDB
    const serviceStartupModeLookup = {
        Automatic: 0,
        'Automatic (delayed start)': 1,
        Manual: 2,
        Disabled: 3,
    };

    // Initialize empty tags object to hold all key-value pairs sent with the datapoint
    let tags = {};

    // Fetch the static tags array from the config file (applied to all metrics)
    const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

    // Populate tags object with static tags from config
    if (configStaticTags) {
        for (const item of configStaticTags) {
            tags[item.name] = item.value;
        }
    }

    // Add service-specific tags: host, service name, display name, and friendly name
    tags.host = serviceStatus.host;
    tags.service_name = serviceStatus.serviceName;
    tags.display_name = serviceStatus.serviceDetails.displayName;
    tags.friendly_name = serviceStatus.serviceFriendlyName;

    // Construct the InfluxDB datapoint with the measurement name, tags, and service state fields
    // The state and startup_mode are stored as both numeric values (for aggregation) and text
    let datapoint = [
        {
            measurement: 'win_service_state',
            tags: tags,
            fields: {
                // Look up the numeric code for the current state, defaulting to -1 if unknown
                state_num:
                    serviceStateLookup[serviceStatus.serviceStatus] !== undefined ? serviceStateLookup[serviceStatus.serviceStatus] : -1,
                // Store the human-readable state text
                state_text: serviceStatus.serviceStatus,
                // Look up the numeric code for the startup mode, defaulting to -1 if unknown
                startup_mode_num:
                    serviceStartupModeLookup[serviceStatus.serviceDetails.startType] !== undefined
                        ? serviceStartupModeLookup[serviceStatus.serviceDetails.startType]
                        : -1,
                // Store the human-readable startup mode text
                startup_mode_text: serviceStatus.serviceDetails.startType,
            },
        },
    ];

    // Deep clone the datapoint to avoid mutating the original reference
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    // Asynchronously write the datapoint to InfluxDB
    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            // Log the full datapoint at silly level for debugging
            globals.logger.silly(
                `WINDOWS SERVICE STATUS: Influxdb datapoint for INFLUXDB WINDOWS SERVICE STATUS: ${JSON.stringify(datapoint, null, 2)}`,
            );

            // Clean up the reference and log the successful send at verbose level
            datapoint = null;
            globals.logger.verbose('WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB');
        })
        .catch((err) => {
            // Handle any InfluxDB write errors consistently regardless of platform (SEA or not)
            if (globals.isSea) {
                globals.logger.error(
                    `WINDOWS SERVICE STATUS: Error saving Windows service status to InfluxDB! ${globals.getErrorMessage(err)}`,
                );
            } else {
                globals.logger.error(
                    `WINDOWS SERVICE STATUS: Error saving Windows service status to InfluxDB! ${globals.getErrorMessage(err)}`,
                );
            }
        });
}
