import _ from 'lodash';

import globals from '../../globals.js';

/**
 * Sends Butler memory usage metrics to InfluxDB.
 *
 * Retrieves the Butler version from globals, builds a set of tags
 * (static tags from config + version), constructs a datapoint with
 * heap, external, and process memory values, then writes it to InfluxDB.
 *
 * @param {object} memory Memory usage data.
 * @param {number} memory.heapUsedMByte Used heap size in MB.
 * @param {number} memory.heapTotalMByte Total heap size in MB.
 * @param {number} memory.externalMemoryMByte External memory in MB.
 * @param {number} memory.processMemoryMByte Process memory in MB.
 * @returns {void}
 */
export function postButlerMemoryUsageToInfluxdb(memory) {
    // Retrieve the currently running Butler version from the globals object
    const butlerVersion = globals.appVersion;

    // Initialize empty tags object to hold all key-value pairs sent with the datapoint
    let tags = {};

    // Fetch the static tags array from the config file
    const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

    // Populate tags object with static tags from config
    if (configStaticTags) {
        for (const item of configStaticTags) {
            tags[item.name] = item.value;
        }
    }

    // Add the Butler version as an additional tag
    tags.version = butlerVersion;

    // Construct the InfluxDB datapoint object with measurement name, tags, and memory field values
    let datapoint = [
        {
            measurement: 'butler_memory_usage',
            tags: tags,
            fields: {
                heap_used: memory.heapUsedMByte,
                heap_total: memory.heapTotalMByte,
                external: memory.externalMemoryMByte,
                process_memory: memory.processMemoryMByte,
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
                `MEMORY USAGE: Influxdb datapoint for Butler INFLUXDB MEMORY USAGE: ${JSON.stringify(datapoint, null, 2)}`,
            );

            // Clean up the reference and log the successful send at verbose level
            datapoint = null;
            globals.logger.verbose('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch((err) => {
            // Handle any InfluxDB write errors consistently regardless of platform (SEA or not)
            if (globals.isSea) {
                globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${globals.getErrorMessage(err)}`);
            } else {
                globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${globals.getErrorMessage(err)}`);
            }
        });
}
