const later = require('@breejs/later');
const moment = require('moment');
require('moment-precise-range-plugin');

const globals = require('../globals');
const postToInfluxdb = require('./post_to_influxdb');
const postToHttp = require('./post_to_new_relic');

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

    const sched = later.parse.text(uptimeInterval);
    const nextOccurence = later.schedule(sched).next(4);
    const intervalMillisec = nextOccurence[3].getTime() - nextOccurence[2].getTime();
    globals.logger.debug(`UPTIME: Interval between uptime events: ${intervalMillisec} milliseconds`);

    later.setInterval(() => {
        startIterations += 1;
        const uptimeMilliSec = Date.now() - startTime;
        moment.duration(uptimeMilliSec);

        const { heapTotal } = process.memoryUsage();
        const { heapUsed } = process.memoryUsage();
        const processMemory = process.memoryUsage().rss;
        const externalMemory = process.memoryUsage().external;

        const heapTotalMByte = Math.round((heapTotal / 1024 / 1024) * 100) / 100;
        const heapUsedMByte = Math.round((heapUsed / 1024 / 1024) * 100) / 100;
        const processMemoryMByte = Math.round((processMemory / 1024 / 1024) * 100) / 100;
        const externalMemoryMByte = Math.round((externalMemory / 1024 / 1024) * 100) / 100;

        const uptimeString = moment.preciseDiff(0, uptimeMilliSec);

        globals.logger.log(uptimeLogLevel, '--------------------------------');
        globals.logger.log(
            uptimeLogLevel,
            `Iteration # ${formatter.format(
                startIterations
            )}, Uptime: ${uptimeString}, Heap used ${heapUsedMByte} MB of total heap ${heapTotalMByte} MB. External (off-heap): ${externalMemoryMByte} MB. Memory allocated to process: ${processMemoryMByte} MB.`
        );

        // Store to Influxdb if enabled
        const butlerMemoryInfluxTag = globals.config.has('Butler.uptimeMonitor.storeInInfluxdb.instanceTag')
            ? globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.instanceTag')
            : '';

        if (
            globals.config.has('Butler.uptimeMonitor.storeInInfluxdb.enable') &&
            globals.config.get('Butler.uptimeMonitor.storeInInfluxdb.enable') === true
        ) {
            postToInfluxdb.postButlerMemoryUsageToInfluxdb({
                instanceTag: butlerMemoryInfluxTag,
                heapUsedMByte,
                heapTotalMByte,
                externalMemoryMByte,
                processMemoryMByte,
            });
        }

        // Do generic http POST if enabled
        if (
            globals.config.has('Butler.uptimeMonitor.storeNewRelic.enable') &&
            globals.config.get('Butler.uptimeMonitor.storeNewRelic.enable') === true
        ) {
            postToHttp.postButlerUptimeToNewRelic({
                intervalMillisec,
                heapUsed,
                heapTotal,
                externalMemory,
                processMemory,
                startIterations,
                uptimeMilliSec,
                uptimeString,
            });
        }
    }, later.parse.text(uptimeInterval));
}

module.exports = {
    serviceUptimeStart,
};
