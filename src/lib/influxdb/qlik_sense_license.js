import _ from 'lodash';

import globals from '../../globals.js';

// Function to store Qlik Sense server license status to InfluxDB
// 1st parameter is an object with the following structure:
// {
//     "licenseExpired": <boolean>,
//     "expiryDate": <date>,
//     "expiryDateStr": "<string>
//     "daysUntilExpiry": <number>,
//   }
export async function postQlikSenseServerLicenseStatusToInfluxDB(qlikSenseServerLicenseStatus) {
    globals.logger.verbose('[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Sending Qlik Sense server license status to InfluxDB');

    // Get tags from config file
    // Stored in array Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.tag.static');

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
            measurement: 'qlik_sense_server_license',
            tags: tagsCloned,
            fields: {
                license_expired: qlikSenseServerLicenseStatus.licenseExpired,
                expiry_date: qlikSenseServerLicenseStatus.expiryDateStr,
                days_until_expiry: qlikSenseServerLicenseStatus.daysUntilExpiry,
            },
        },
    ];

    // Write to InfluxDB
    const deepClonedDatapoint = _.cloneDeep(datapoint);
    await globals.influx.writePoints(deepClonedDatapoint);

    globals.logger.silly(
        `[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Influxdb datapoint for Qlik Sense server license status: ${JSON.stringify(
            datapoint,
            null,
            2,
        )}`,
    );

    datapoint = null;
    globals.logger.verbose('[QSEOW] QLIK SENSE SERVER LICENSE STATUS: Sent Qlik Sense server license status to InfluxDB');
}

// Function to store Qlik Sense access license status to InfluxDB
// License JSON has the following structure:
// {
//     "totalTokens": 0,
//     "availableTokens": 0,
//     "tokensEnabled": false,
//     "userAccess": {
//         "enabled": false,
//         "tokenCost": 1,
//         "allocatedTokens": 0,
//         "usedTokens": 0,
//         "quarantinedTokens": 0,
//         "schemaPath": "AccessTypeOverview.UserAccessDetails"
//     },
//     "loginAccess": {
//         "enabled": false,
//         "tokenCost": 0.1,
//         "allocatedTokens": 0,
//         "usedTokens": 0,
//         "unavailableTokens": 0,
//         "schemaPath": "AccessTypeOverview.LoginAccessDetails"
//     },
//     "professionalAccess": {
//         "enabled": true,
//         "total": 25,
//         "allocated": 5,
//         "used": 0,
//         "quarantined": 0,
//         "excess": 0,
//         "available": 20,
//         "schemaPath": "AccessTypeOverview.Details"
//     },
//     "analyzerAccess": {
//         "enabled": true,
//         "total": 25,
//         "allocated": 4,
//         "used": 0,
//         "quarantined": 0,
//         "excess": 0,
//         "available": 21,
//         "schemaPath": "AccessTypeOverview.Details"
//     },
//     "analyzerTimeAccess": {
//         "enabled": true,
//         "allocatedMinutes": 700,
//         "usedMinutes": 0,
//         "unavailableMinutes": 0,
//         "schemaPath": "AccessTypeOverview.AnalyzerTimeAccessDetails"
//     },
//     "schemaPath": "AccessTypeOverview"
// }
export async function postQlikSenseLicenseStatusToInfluxDB(qlikSenseLicenseStatus) {
    globals.logger.verbose('[QSEOW] END USER ACCESS LICENSE: Sending Qlik Sense license status to InfluxDB');

    // Get tags from config file
    // Stored in array Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag.static');

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

    // Build InfluxDB datapoint
    let datapoint = [];

    // Is there any data for "analyzerAccess" license type?
    if (qlikSenseLicenseStatus.analyzerAccess.enabled === true) {
        tags.license_type = 'analyzer';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

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

    // Is there any data for "analyzerTimeAccess" license type?
    if (qlikSenseLicenseStatus.analyzerTimeAccess.enabled === true) {
        tags.license_type = 'analyzer_capacity';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

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

    // Is there any data for "professionalAccess" license type?
    if (qlikSenseLicenseStatus.professionalAccess.enabled === true) {
        tags.license_type = 'professional';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

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

    // Is there any data for "loginAccess" license type?
    if (qlikSenseLicenseStatus.loginAccess.enabled === true) {
        tags.license_type = 'token_login';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

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

    // Is there any data for "userAccess" license type?
    if (qlikSenseLicenseStatus.userAccess.enabled === true) {
        tags.license_type = 'token_user';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

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

    // Are tokens available?
    if (qlikSenseLicenseStatus.tokensEnabled === true) {
        tags.license_type = 'tokens_available';

        // Do a deep clone of the tags object
        const tagsCloned = _.cloneDeep(tags);

        datapoint.push({
            measurement: 'qlik_sense_license',
            tags: tagsCloned,
            fields: {
                available_tokens: qlikSenseLicenseStatus.availableTokens,
                total_tokens: qlikSenseLicenseStatus.totalTokens,
            },
        });
    }

    // Write to InfluxDB
    const deepClonedDatapoint = _.cloneDeep(datapoint);
    await globals.influx.writePoints(deepClonedDatapoint);

    globals.logger.silly(
        `[QSEOW] END USER ACCESS LICENSE: Influxdb datapoint for Qlik Sense license status: ${JSON.stringify(datapoint, null, 2)}`,
    );

    datapoint = null;
    globals.logger.info('[QSEOW] END USER ACCESS LICENSE: Sent aggregated Qlik Sense license status to InfluxDB');
}

// Function to store info about released Qlik Sense licenses to InfluxDB
export async function postQlikSenseLicenseReleasedToInfluxDB(licenseInfo) {
    globals.logger.verbose('[QSEOW] END USER ACCESS LICENSE RELEASE: Sending info on released Qlik Sense license to InfluxDB');

    // Get tags from config file
    // Stored in array Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.tag
    const configTags = globals.config.get('Butler.qlikSenseLicense.licenseRelease.destination.influxDb.tag.static');

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
    await globals.influx.writePoints(deepClonedDatapoint);

    globals.logger.silly(
        `[QSEOW] END USER ACCESS LICENSE RELEASE: Influxdb datapoint for released Qlik Sense license: ${JSON.stringify(datapoint, null, 2)}`,
    );

    datapoint = null;
    globals.logger.debug('[QSEOW] END USER ACCESS LICENSE RELEASE: Sent info on released Qlik Sense license to InfluxDB');
}
