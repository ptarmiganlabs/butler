const globals = require('../globals');



function postButlerMemoryUsageToInfluxdb(memory) {
    globals.logger.debug(`MEMORY USAGE: Memory usage ${JSON.stringify(memory, null, 2)})`);

    let datapoint = [
        {
            measurement: 'butler_memory_usage',
            tags: {
                butler_instance: memory.instanceTag
            },
            fields: {
                heap_used: memory.heapUsed,
                heap_total: memory.heapTotal,
                process_memory: memory.processMemory,
            },
        },
    ];

    globals.influx
        .writePoints(datapoint)
        .then(() => {
            globals.logger.silly(
                `MEMORY USAGE: Influxdb datapoint for Butler memory usage: ${JSON.stringify(
                    datapoint,
                    null,
                    2,
                )}`,
            );

            globals.logger.verbose('MEMORY USAGE: Sent Butler memory usage data to InfluxDB');
        })
        .catch(err => {
            globals.logger.error(
                `MEMORY USAGE: Error saving user session data to InfluxDB! ${err.stack}`,
            );
        });
}

module.exports = {
    postButlerMemoryUsageToInfluxdb,
};
