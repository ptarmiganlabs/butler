import _ from 'lodash';

import globals from '../../globals.js';

/**
 * Sends Qlik Sense version information to InfluxDB.
 *
 * Collects static and feature-specific tags from config, builds a datapoint
 * with version metadata (content hash, sense ID, version string, deployment type, etc.),
 * and writes it to InfluxDB.
 *
 * @param {Object} qlikSenseVersion Qlik Sense version information object.
 * @param {string} qlikSenseVersion.contentHash Content hash of the version.
 * @param {string} qlikSenseVersion.senseId Sense ID.
 * @param {string} qlikSenseVersion.version Version string.
 * @param {string} qlikSenseVersion.deploymentType Deployment type.
 * @param {string} qlikSenseVersion.releaseLabel Release label.
 * @param {string} qlikSenseVersion.deprecatedProductVersion Deprecated product version.
 * @param {string} qlikSenseVersion.productName Product name.
 * @param {string} qlikSenseVersion.copyrightYearRange Copyright year range.
 * @returns {Promise<void>} Resolves when the datapoint has been written.
 */
export async function postQlikSenseVersionToInfluxDB(qlikSenseVersion) {
    // Log at verbose level that we are about to send version info to InfluxDB
    globals.logger.verbose('[QSEOW] QLIK SENSE VERSION: Sending Qlik Sense version to InfluxDB');

    // Retrieve feature-specific tags configured for version monitoring
    // Stored in array Butler.qlikSenseVersion.versionMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseVersion.versionMonitor.destination.influxDb.tag.static');

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

    // Merge feature-specific tags into the tags object
    if (configTags) {
        for (const item of configTags) {
            tags[item.name] = item.value;
        }
    }

    // Deep clone the combined tags to avoid mutating the original references
    const tagsCloned = _.cloneDeep(tags);

    // Construct the InfluxDB datapoint with the measurement name, combined tags, and version fields
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

    // Deep clone the datapoint before writing to prevent mutation
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    // Wait for the InfluxDB write to complete
    await globals.influx.writePoints(deepClonedDatapoint);

    // Log the full datapoint at silly level for debugging
    globals.logger.silly(`[QSEOW] QLIK SENSE VERSION: Influxdb datapoint for Qlik Sense version: ${JSON.stringify(datapoint, null, 2)}`);

    // Clean up the reference and log success at verbose level
    datapoint = null;
    globals.logger.verbose('[QSEOW] QLIK SENSE VERSION: Sent Qlik Sense version to InfluxDB');
}
