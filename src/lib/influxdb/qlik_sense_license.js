import _ from 'lodash';

import globals from '../../globals.js';

/**
 * Sends Qlik Sense server license status to InfluxDB.
 *
 * Collects static and feature-specific tags from config, builds a datapoint
 * with license expiry information, and writes it to InfluxDB.
 *
 * @param {Object} qlikSenseServerLicenseStatus Server license status object.
 * @param {boolean} qlikSenseServerLicenseStatus.licenseExpired Whether the server license has expired.
 * @param {string} qlikSenseServerLicenseStatus.expiryDateStr Formatted expiry date string.
 * @param {number} qlikSenseServerLicenseStatus.daysUntilExpiry Days until the license expires.
 * @returns {Promise<void>} Resolves when the datapoint has been written.
 */
export async function postQlikSenseServerLicenseStatusToInfluxDB(qlikSenseServerLicenseStatus) {
    // Log at verbose level that we are about to send server license data to InfluxDB
    globals.logger.verbose('[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Sending Qlik Sense server license status to InfluxDB');

    // Retrieve feature-specific tags configured for server license monitoring
    // Stored in array Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.tag.static');

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

    // Construct the InfluxDB datapoint with the measurement name, combined tags, and license expiry fields
    let datapoint = [
        {
            measurement: 'qlik_sense_server_license',
            tags: tagsCloned,
            fields: {
                license_expired: qlikSenseServerLicenseStatus.licenseExpired,
                expiry_date: qlikSenseServerLicenseStatus.expiryDateStr,
                days_until_expiry: qlikSenseServerLicenseStatus.daysUntilExpiry,
            },
        },
    ];

    // Deep clone the datapoint before writing to prevent mutation
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    try {
        // Wait for the InfluxDB write to complete
        await globals.influx.writePoints(deepClonedDatapoint);

        // Log the full datapoint at silly level for debugging
        globals.logger.silly(
            `[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Influxdb datapoint for Qlik Sense server license status: ${JSON.stringify(
                datapoint,
                null,
                2,
            )}`,
        );

        // Clean up the reference and log success at verbose level
        datapoint = null;
        globals.logger.verbose('[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Sent Qlik Sense server license status to InfluxDB');
    } catch (err) {
        globals.logger.error(`[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Error sending to InfluxDB: ${err.message}`);
    }
}

/**
 * Sends aggregated Qlik Sense end-user license status to InfluxDB.
 *
 * Collects static and feature-specific tags from config, then builds one or more
 * datapoints based on which license types (analyzer, professional, token, etc.)
 * are enabled. Each enabled license type produces a separate datapoint.
 *
 * @param {Object} qlikSenseLicenseStatus License status object containing analyzerAccess,
 *   professionalAccess, loginAccess, userAccess, and analyzerTimeAccess sub-objects.
 * @returns {Promise<void>} Resolves when the datapoints have been written.
 */
export async function postQlikSenseLicenseStatusToInfluxDB(qlikSenseLicenseStatus) {
    // Log at verbose level that we are about to send end-user license data to InfluxDB
    globals.logger.verbose('[QSEOW] END USER ACCESS LICENSE: Sending Qlik Sense license status to InfluxDB');

    // Retrieve feature-specific tags configured for license monitoring
    // Stored in array Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag.static');

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

    // Initialize an array that will hold one or more datapoints (one per enabled license type)
    let datapoint = [];

    // Check if analyzer access licenses are enabled and build a corresponding datapoint
    if (qlikSenseLicenseStatus.analyzerAccess.enabled === true) {
        // Set the license type tag to identify this license category
        tags.license_type = 'analyzer';

        // Deep clone the tags to prevent reference sharing between datapoints
        const tagsCloned = _.cloneDeep(tags);

        // Push a datapoint with analyzer license metrics (allocated, available, excess, quarantined, total, used)
        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated: qlikSenseLicenseStatus.analyzerAccess.allocated,
                available: qlikSenseLicenseStatus.analyzerAccess.available,
                excess: qlikSenseLicenseStatus.analyzerAccess.excess,
                quarantined: qlikSenseLicenseStatus.analyzerAccess.quarantined,
                total: qlikSenseLicenseStatus.analyzerAccess.total,
                used: qlikSenseLicenseStatus.analyzerAccess.used,
            },
        });
    }

    // Check if analyzer capacity (time-based) licenses are enabled and build a corresponding datapoint
    if (qlikSenseLicenseStatus.analyzerTimeAccess.enabled === true) {
        // Set the license type tag to identify this license category
        tags.license_type = 'analyzer_capacity';

        // Deep clone the tags to prevent reference sharing between datapoints
        const tagsCloned = _.cloneDeep(tags);

        // Push a datapoint with analyzer capacity metrics (allocated, unavailable, used — all in minutes)
        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated_minutes: qlikSenseLicenseStatus.analyzerTimeAccess.allocatedMinutes,
                unavailable_minutes: qlikSenseLicenseStatus.analyzerTimeAccess.unavailableMinutes,
                used_minutes: qlikSenseLicenseStatus.analyzerTimeAccess.usedMinutes,
            },
        });
    }

    // Check if professional access licenses are enabled and build a corresponding datapoint
    if (qlikSenseLicenseStatus.professionalAccess.enabled === true) {
        // Set the license type tag to identify this license category
        tags.license_type = 'professional';

        // Deep clone the tags to prevent reference sharing between datapoints
        const tagsCloned = _.cloneDeep(tags);

        // Push a datapoint with professional license metrics (allocated, available, excess, quarantined, total, used)
        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated: qlikSenseLicenseStatus.professionalAccess.allocated,
                available: qlikSenseLicenseStatus.professionalAccess.available,
                excess: qlikSenseLicenseStatus.professionalAccess.excess,
                quarantined: qlikSenseLicenseStatus.professionalAccess.quarantined,
                total: qlikSenseLicenseStatus.professionalAccess.total,
                used: qlikSenseLicenseStatus.professionalAccess.used,
            },
        });
    }

    // Check if login access token licenses are enabled and build a corresponding datapoint
    if (qlikSenseLicenseStatus.loginAccess.enabled === true) {
        // Set the license type tag to identify this license category
        tags.license_type = 'token_login';

        // Deep clone the tags to prevent reference sharing between datapoints
        const tagsCloned = _.cloneDeep(tags);

        // Push a datapoint with login token metrics (allocated, token cost, unavailable, used)
        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated_tokens: qlikSenseLicenseStatus.loginAccess.allocatedTokens,
                token_cost: qlikSenseLicenseStatus.loginAccess.tokenCost,
                unavailable_tokens: qlikSenseLicenseStatus.loginAccess.unavailableTokens,
                used_tokens: qlikSenseLicenseStatus.loginAccess.usedTokens,
            },
        });
    }

    // Check if user access token licenses are enabled and build a corresponding datapoint
    if (qlikSenseLicenseStatus.userAccess.enabled === true) {
        // Set the license type tag to identify this license category
        tags.license_type = 'token_user';

        // Deep clone the tags to prevent reference sharing between datapoints
        const tagsCloned = _.cloneDeep(tags);

        // Push a datapoint with user token metrics (allocated, quarantined, token cost, used)
        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                allocated_tokens: qlikSenseLicenseStatus.userAccess.allocatedTokens,
                quarantined_tokens: qlikSenseLicenseStatus.userAccess.quarantinedTokens,
                token_cost: qlikSenseLicenseStatus.userAccess.tokenCost,
                used_tokens: qlikSenseLicenseStatus.userAccess.userTokens,
            },
        });
    }

    // Check if token availability is enabled and build a corresponding datapoint
    if (qlikSenseLicenseStatus.tokensEnabled === true) {
        // Set the license type tag to indicate this is a token-level metric
        tags.license_type = 'tokens_available';

        // Deep clone the tags to prevent reference sharing between datapoints
        const tagsCloned = _.cloneDeep(tags);

        // Push a datapoint with overall token availability metrics (available and total)
        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                available_tokens: qlikSenseLicenseStatus.availableTokens,
                total_tokens: qlikSenseLicenseStatus.totalTokens,
            },
        });
    }

    // Deep clone the full array of datapoints before writing to prevent mutation
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    try {
        // Wait for all datapoints to be written to InfluxDB
        await globals.influx.writePoints(deepClonedDatapoint);

        // Log the full array of datapoints at silly level for debugging
        globals.logger.silly(
            `[QSEOW] END USER ACCESS LICENSE: Influxdb datapoint for Qlik Sense license status: ${JSON.stringify(datapoint, null, 2)}`,
        );

        // Clean up the reference and log success at info level (since multiple datapoints were sent)
        datapoint = null;
        globals.logger.info('[QSEOW] END USER ACCESS LICENSE: Sent aggregated Qlik Sense license status to InfluxDB');
    } catch (err) {
        globals.logger.error(`[QSEOW] END USER ACCESS LICENSE: Error sending to InfluxDB: ${err.message}`);
    }
}

/**
 * Sends information about released Qlik Sense licenses to InfluxDB.
 *
 * Collects static and feature-specific tags from config, sets license type and user
 * tags based on the license info, builds a datapoint with days since last use,
 * and writes it to InfluxDB.
 *
 * @param {Object} licenseInfo Released license information.
 * @param {string} licenseInfo.licenseType Type of the released license.
 * @param {string} licenseInfo.userDir User directory.
 * @param {string} licenseInfo.userId User ID.
 * @param {number} licenseInfo.daysSinceLastUse Number of days since the license was last used.
 * @returns {Promise<void>} Resolves when the datapoint has been written.
 */
export async function postQlikSenseLicenseReleasedToInfluxDB(licenseInfo) {
    // Log at verbose level that we are about to send released license info to InfluxDB
    globals.logger.verbose('[QSEOW] END USER ACCESS LICENSE RELEASE: Sending info on released Qlik Sense license to InfluxDB');

    // Retrieve feature-specific tags configured for license release tracking
    // Stored in array Butler.qlikSenseLicense.licenseRelease.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.licenseRelease.destination.influxDb.tag.static');

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

    tags.license_type = licenseInfo.licenseType;
    tags.user = `${licenseInfo.userDir}\\${licenseInfo.userId}`;

    // Add feature specific tags in configTags variable
    if (configTags) {
        for (const item of configTags) {
            tags[item.name] = item.value;
        }
    }

    // Build InfluxDB datapoint
    let datapoint = [];

    // Add data to InfluxDB datapoint
    datapoint.push({
        measurement: 'qlik_sense_license_release',
        tags,
        fields: {
            days_since_last_use: licenseInfo.daysSinceLastUse,
        },
    });

    // Write to InfluxDB
    const deepClonedDatapoint = _.cloneDeep(datapoint);

    try {
        await globals.influx.writePoints(deepClonedDatapoint);

        globals.logger.silly(
            `[QSEOW] END USER ACCESS LICENSE RELEASE: Influxdb datapoint for released Qlik Sense license: ${JSON.stringify(datapoint, null, 2)}`,
        );

        datapoint = null;
        globals.logger.debug('[QSEOW] END USER ACCESS LICENSE RELEASE: Sent info on released Qlik Sense license to InfluxDB');
    } catch (err) {
        globals.logger.error(`[QSEOW] END USER ACCESS LICENSE RELEASE: Error sending to InfluxDB: ${err.message}`);
    }
}
