const later = require('later');
const moment = require('moment');
require('moment-precise-range-plugin');

const globals = require('../globals');
const postToInfluxdb = require('./post-to-influxdb');

function serviceUptimeStart() {
    const uptimeLogLevel = globals.config.get('Butler.uptimeMonitor.logLevel');
    const uptimeInterval = globals.config.get('Butler.uptimeMonitor.frequency');

    // Formatter for numbers
    const formatter = new Intl.NumberFormat('en-US');

    // Log uptime to console
    // eslint-disable-next-line no-extend-native
    Number.prototype.toTime = function (isSec) {
        const ms = isSec ? this * 1e3 : this;
        const lm = ~(4 * !!isSec);
        /* limit fraction */
        const fmt = new Date(ms).toISOString().slice(11, lm);

        if (ms >= 8.64e7) {
            /* >= 24 hours */
            const parts = fmt.split(/:(?=\d{2}:)/);
            // eslint-disable-next-line no-bitwise
            parts[0] -= -24 * ((ms / 8.64e7) | 0);
            return parts.join(':');
        }

        return fmt;
    };

    const startTime = Date.now();
    let startIterations = 0;

    later.setInterval(() => {
        startIterations += 1;
        const uptimeMilliSec = Date.now() - startTime;
        moment.duration(uptimeMilliSec);

        const heapTotal = Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100;
        const heapUsed = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
        const processMemory = Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100;
        const external = Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100;

        globals.logger.log(uptimeLogLevel, '--------------------------------');
        globals.logger.log(
            uptimeLogLevel,
            `Iteration # ${formatter.format(startIterations)}, Uptime: ${moment.preciseDiff(
                0,
                uptimeMilliSec
            )}, Heap used ${heapUsed} MB of total heap ${heapTotal} MB. External (off-heap): ${external} MB. Memory allocated to process: ${processMemory} MB.`
        );

        // Store to Influxdb
        const butlerMemoryInfluxTag = globals.config.has(
            'Butler.uptimeMonitor.storeInInfluxdb.instanceTag'
        )
            ? globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.instanceTag')
            : '';

        if (globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.enable') === true) {
            postToInfluxdb.postButlerMemoryUsageToInfluxdb({
                instanceTag: butlerMemoryInfluxTag,
                heapUsed,
                heapTotal,
                external,
                processMemory,
            });
        }
    }, later.parse.text(uptimeInterval));
}

module.exports = {
    serviceUptimeStart,
};
