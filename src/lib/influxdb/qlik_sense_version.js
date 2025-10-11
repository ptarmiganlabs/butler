import _ from 'lodash';

import globals from '../../globals.js';

// Function to store Qlik Sense version info to InfluxDB
// Version JSON has the following structure:
// {
//     contentHash: "aeec25c539492...",
//     senseId: "qliksenseserver:14.173.4",
//     originalClassName: "Composition",
//     version: "14.173.4",
//     deploymentType: "QlikSenseServer",
//     releaseLabel: "February 2024 Patch 1",
//     deprecatedProductVersion: "4.0.X",
//     productName: "Qlik Sense",
//     copyrightYearRange: "1993-2024",
//   }
export async function postQlikSenseVersionToInfluxDB(qlikSenseVersion) {
    globals.logger.verbose('[QSEOW] QLIK SENSE VERSION: Sending Qlik Sense version to InfluxDB');

    // Get tags from config file
    // Stored in array Butler.qlikSenseVersion.versionMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseVersion.versionMonitor.destination.influxDb.tag.static');

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

    // Add feature specific tags in configTags variable
    if (configTags) {
        for (const item of configTags) {
            tags[item.name] = item.value;
        }
    }

    // Do a deep clone of the tags object
    const tagsCloned = _.cloneDeep(tags);

    // Build InfluxDB datapoint
    let datapoint = [
        {
            measurement: 'qlik_sense_version',
            tags: tagsCloned,
            fields: {
                content_hash: qlikSenseVersion.contentHash,
                sense_id: qlikSenseVersion.senseId,
                version: qlikSenseVersion.version,
                deployment_type: qlikSenseVersion.deploymentType,
                release_label: qlikSenseVersion.releaseLabel,
                deprecated_product_version: qlikSenseVersion.deprecatedProductVersion,
                product_name: qlikSenseVersion.productName,
                copyright_year_range: qlikSenseVersion.copyrightYearRange,
            },
        },
    ];

    // Write to InfluxDB
    const deepClonedDatapoint = _.cloneDeep(datapoint);
    await globals.influx.writePoints(deepClonedDatapoint);

    globals.logger.silly(`[QSEOW] QLIK SENSE VERSION: Influxdb datapoint for Qlik Sense version: ${JSON.stringify(datapoint, null, 2)}`);

    datapoint = null;
    globals.logger.verbose('[QSEOW] QLIK SENSE VERSION: Sent Qlik Sense version to InfluxDB');
}
