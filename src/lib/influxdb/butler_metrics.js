import _ from 'lodash';

import globals from '../../globals.js';

export function postButlerMemoryUsageToInfluxdb(memory) {
    // Get Butler version
    const butlerVersion = globals.appVersion;

    // Add version to tags
    let tags = {};

    // Get static tags as array from config file
    const configStaticTags = globals.config.get('Butler.influxDb.tag.static');

    // Add static tags to tags object
    if (configStaticTags) {
        for (const item of configStaticTags) {
            tags[item.name] = item.value;
        }
    }

    tags.version = butlerVersion;

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
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    globals.influx
        .writePoints(deepClonedDatapoint)

        .then(() => {
            globals.logger.silly(
                `MEMORY USAGE: Influxdb datapoint for Butler INFLUXDB MEMORY USAGE: ${JSON.stringify(datapoint, null, 2)}`,
            );

            datapoint = null;
            globals.logger.verbose('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch((err) => {
            if (globals.isSea) {
                globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${globals.getErrorMessage(err)}`);
            } else {
                globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${globals.getErrorMessage(err)}`);
            }
        });
}
