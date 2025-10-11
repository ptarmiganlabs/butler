import _ from 'lodash';

import globals from '../../globals.js';

// Function to store windows service status to InfluxDB
export function postWindowsServiceStatusToInfluxDB(serviceStatus) {
    globals.logger.verbose(
        `WINDOWS SERVICE STATUS: Sending service status to InfluxDB: service="${serviceStatus.serviceFriendlyName}", status="${serviceStatus.serviceStatus}"`,
    );

    // Create lookup table for Windows service state to numeric value, starting with 1 for stopped
    const serviceStateLookup = {
        STOPPED: 1,
        START_PENDING: 2,
        STOP_PENDING: 3,
        RUNNING: 4,
        CONTINUE_PENDING: 5,
        PAUSE_PENDING: 6,
        PAUSED: 7,
    };

    // Create lookup table for Windows service startup mode to numeric value, starting with 0
    const serviceStartupModeLookup = {
        Automatic: 0,
        'Automatic (delayed start)': 1,
        Manual: 2,
        Disabled: 3,
    };

    // Add tags
    let tags = {};

    // Get static tags as array from config file
    const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

    // Add static tags to tags object
    if (configStaticTags) {
        for (const item of configStaticTags) {
            tags[item.name] = item.value;
        }
    }

    // Add additional tags
    tags.host = serviceStatus.host;
    tags.service_name = serviceStatus.serviceName;
    tags.display_name = serviceStatus.serviceDetails.displayName;
    tags.friendly_name = serviceStatus.serviceFriendlyName;

    let datapoint = [
        {
            measurement: 'win_service_state',
            tags: tags,
            fields: {
                state_num:
                    serviceStateLookup[serviceStatus.serviceStatus] !== undefined ? serviceStateLookup[serviceStatus.serviceStatus] : -1,
                state_text: serviceStatus.serviceStatus,
                startup_mode_num:
                    serviceStartupModeLookup[serviceStatus.serviceDetails.startType] !== undefined
                        ? serviceStartupModeLookup[serviceStatus.serviceDetails.startType]
                        : -1,
                startup_mode_text: serviceStatus.serviceDetails.startType,
            },
        },
    ];
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            globals.logger.silly(
                `WINDOWS SERVICE STATUS: Influxdb datapoint for INFLUXDB WINDOWS SERVICE STATUS: ${JSON.stringify(datapoint, null, 2)}`,
            );

            datapoint = null;
            globals.logger.verbose('WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB');
        })
        .catch((err) => {
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
