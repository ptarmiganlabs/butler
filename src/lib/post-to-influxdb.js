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
            globals.logger.silly(
                `MEMORY USAGE: Influxdb datapoint for Butler memory usage: ${JSON.stringify(datapoint, null, 2)}`
            );

            datapoint = null;
            globals.logger.verbose('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch((err) => {
            globals.logger.error(`MEMORY USAGE: Error saving Butler memory usage to InfluxDB! ${err.stack}`);
        });
}

module.exports = {
    postButlerMemoryUsageToInfluxdb,
};
