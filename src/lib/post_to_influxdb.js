const _ = require('lodash');

const globals = require('../globals');

function postButlerMemoryUsageToInfluxdb(memory) {
    let datapoint = [
        {
            measurement: 'butler_memory_usage',
            tags: {
                butler_instance: memory.instanceTag,
            },
            fields: {
                heap_used: memory.heapUsedMByte,
                heap_total: memory.heapTotalMByte,
                external: memory.externalMemoryMByte,
                process_memory: memory.processMemoryMByte,
            },
        },
    ];
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            globals.logger.silly(`MEMORY USAGE: Influxdb datapoint for Butler memory usage: ${JSON.stringify(datapoint, null, 2)}`);

            datapoint = null;
            globals.logger.verbose('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${err.stack}`);
        });
}

// Add function to store windows service status to InfluxDB
function postWindowsServiceStatusToInfluxDB(serviceStatus) {
    // Create lookup table for Windows service state to numeric value, starting with 1 for stopped
    const serviceStateLookup = {
        stopped: 1,
        start_pending: 2,
        stop_pending: 3,
        running: 4,
        continue_pending: 5,
        pause_pending: 6,
        paused: 7,
    };

    // Create lookup table for Windows service startup mode to numeric value, starting with 0
    const serviceStartupModeLookup = {
        automatic: 0,
        manual: 1,
        disabled: 2,
    };

    let datapoint = [
        {
            measurement: 'win_service_state',
            tags: {
                butler_instance: serviceStatus.instanceTag,
                host: serviceStatus.host,
                service_name: serviceStatus.serviceName,
                display_name: serviceStatus.serviceDetails.displayName,
            },
            fields: {
                state: serviceStateLookup[serviceStatus.serviceStatus],
                startup_mode: serviceStartupModeLookup[serviceStatus.serviceDetails.startupMode],
            },
        },
    ];
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            globals.logger.silly(
                `WINDOWS SERVICE STATUS: Influxdb datapoint for Windows service status: ${JSON.stringify(datapoint, null, 2)}`
            );

            datapoint = null;
            globals.logger.verbose('WINDOWS SERVICE STATUS: Sent Windows service status data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`WINDOWS SERVICE STATUS: Error saving Windows service status to InfluxDB! ${err.stack}`);
        });
}

module.exports = {
    postButlerMemoryUsageToInfluxdb,
    postWindowsServiceStatusToInfluxDB,
};
