import later from '@breejs/later';

import QrsClient from '../qrs_client.js';
import globals from '../../globals.js';
import {
    postQlikSenseLicenseStatusToInfluxDB,
    postQlikSenseLicenseReleasedToInfluxDB,
    postQlikSenseServerLicenseStatusToInfluxDB,
} from '../influxdb/qlik_sense_license.js';
import { callQlikSenseServerLicenseWebhook } from './webhook_notification.js';

// Function to check Qlik Sense server license status
/**
 * Checks the Qlik Sense server license status.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
async function checkQlikSenseServerLicenseStatus(config, logger) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: globals.config.get('Butler.configQRS.port'),
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        // Merge YAML-configured headers with hardcoded headers
        configQRS.headers = {
            ...globals.getQRSHttpHeaders(),
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsClient(configQRS);

        // Get Qlik Sense server license info
        const result = await qrsInstance.Get(`license`);

        // Is status code 200 or body is empty?
        if (result.statusCode !== 200 || !result.body) {
            logger.error(`[QSEOW] QLIKSENSE SERVER LICENSE MONITOR: HTTP status code ${result.statusCode}`);
            return;
        }

        // Debug log
        logger.debug(`[QSEOW] QLIKSENSE SERVER LICENSE MONITOR: ${JSON.stringify(result.body)}`);

        // Returned icense JSON has the following structure:
        // {
        //     "id": "<uuid>",
        //     "createdDate": "2000-01-31T03:49:21.745Z",
        //     "modifiedDate": "2024-01-31T19:44:28.951Z",
        //     "modifiedByUserName": "<string>",
        //     "lef": "",
        //     "serial": "0001 0002 0003 0004",
        //     "check": "",
        //     "key": "<signed JWT>",
        //     "keyDetails": "<string with info about license details, delimited by newlines",
        //     "name": "<string>",
        //     "organization": "<string>",
        //     "product": <Number>,
        //     "numberOfCores": <Number>,
        //     "isExpired": <Boolean>,
        //     "expiredReason": "<string>",
        //     "isBlacklisted": <Boolean>,
        //     "isInvalid": <Boolean>,
        //     "isSubscription": <Boolean>,
        //     "isCloudServices": <Boolean>,
        //     "isElastic": <Boolean>,
        //     "updated": "2024-02-25T09:17:16.366Z",
        //     "privileges": null,
        //     "schemaPath": "License"
        //   }

        // Parse license expiry from server license status
        let expiryDate = null;
        let expiryDateStr = null;
        let daysUntilExpiry = null;
        let licenseExpired = null;

        // Is license expired flag set?
        if (result.body.isExpired === true) {
            licenseExpired = true;
        } else {
            licenseExpired = false;
        }

        // Find license expiration date from keyDatails property, which is string made up of several blocks of information.
        // The expiration date is found in a line formatted as: "Valid To: <expiration date>"
        const keyDetailsLines = result.body.keyDetails.split('\n');
        keyDetailsLines.forEach((line) => {
            if (line.includes('Valid To:')) {
                const parts = line.split(':');

                // Format date as string
                expiryDate = new Date(parts[1].trim());
                expiryDateStr = parts[1].trim();
            }
        });

        // Calculate days until license expiry
        if (expiryDateStr !== null) {
            const now = new Date();
            const diffTime = Math.abs(expiryDate - now);
            daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Log info about license expiration status, date and remaining days to console log.
        // Use warn logging if days until expiry is less than value specified in config file,
        // otherwise use info logging
        if (daysUntilExpiry !== null && expiryDateStr !== null && licenseExpired !== null) {
            globals.logger.info(`[QSEOW] QLIK SENSE SERVER LICENSE: License expired: ${licenseExpired}`);

            if (daysUntilExpiry <= globals.config.get('Butler.qlikSenseLicense.serverLicenseMonitor.alert.thresholdDays')) {
                globals.logger.warn(
                    `[QSEOW] QLIK SENSE SERVER LICENSE: Qlik Sense server license is about to expire in ${daysUntilExpiry} days!`,
                );
                globals.logger.warn(`[QSEOW] QLIK SENSE SERVER LICENSE: Expiry date: ${expiryDate}`);
            } else {
                globals.logger.info(`[QSEOW] QLIK SENSE SERVER LICENSE: Qlik Sense server license expiry in ${daysUntilExpiry} days`);
                globals.logger.info(`[QSEOW] QLIK SENSE SERVER LICENSE: Expiry date: ${expiryDate}`);
            }
        }

        // To which destination should we send the license information?
        // Check InfluDB first
        // If InfluxDB is enabled, post the license status to InfluxDB
        if (
            config.get('Butler.influxDb.enable') === true &&
            config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.influxDb.enable') === true
        ) {
            await postQlikSenseServerLicenseStatusToInfluxDB({
                licenseExpired,
                expiryDate,
                expiryDateStr,
                daysUntilExpiry,
            });
        }

        // Check if we should send data to MQTT
        if (
            config.get('Butler.mqttConfig.enable') === true &&
            config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.mqtt.enable') === true
        ) {
            // Prepare general license payload for MQTT
            const mqttPayload = {
                licenseExpired,
                expiryDateStr,
                daysUntilExpiry,
            };

            // Publish to MQTT
            globals.mqttClient.publish(config.get('Butler.mqttConfig.qlikSenseServerLicenseTopic'), JSON.stringify(mqttPayload));

            // Should we also publish to a specific topic if the license is about to expire, or has already expired?
            if (licenseExpired === true) {
                globals.mqttClient.publish(
                    config.get('Butler.mqttConfig.qlikSenseServerLicenseExpireTopic'),
                    `Qlik Sense server license expired on ${expiryDateStr}`,
                );
            } else if (daysUntilExpiry <= config.get('Butler.qlikSenseLicense.serverLicenseMonitor.alert.thresholdDays')) {
                const mqttAlertPayload = `Qlik Sense server license is about to expire in ${daysUntilExpiry} days, on ${expiryDateStr}`;

                globals.mqttClient.publish(config.get('Butler.mqttConfig.qlikSenseServerLicenseExpireTopic'), mqttAlertPayload);
            }
        }

        // Check if we should send data to webhooks
        if (
            config.get('Butler.webhookNotification.enable') === true &&
            config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.enable') === true
        ) {
            // Prepare general license payload for webhooks
            const webhookPayload = {
                licenseExpired,
                expiryDateStr,
                daysUntilExpiry,
            };

            // Send recurring webhook notification?
            if (
                config.get('Butler.webhookNotification.enable') === true &&
                config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.sendRecurring.enable') === true
            ) {
                webhookPayload.event = 'server license status';
                callQlikSenseServerLicenseWebhook(webhookPayload);
            }

            // Send alert webhook notification?
            if (
                config.get('Butler.webhookNotification.enable') === true &&
                config.get('Butler.qlikSenseLicense.serverLicenseMonitor.destination.webhook.sendAlert.enable') === true
            ) {
                if (licenseExpired === true) {
                    webhookPayload.event = 'server license has expired alert';
                    callQlikSenseServerLicenseWebhook(webhookPayload);
                } else if (daysUntilExpiry <= config.get('Butler.qlikSenseLicense.serverLicenseMonitor.alert.thresholdDays')) {
                    webhookPayload.event = 'server license about to expire alert';
                    callQlikSenseServerLicenseWebhook(webhookPayload);
                }
            }
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE SERVER LICENSE MONITOR: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE SERVER LICENSE MONITOR: ${globals.getErrorMessage(err)}`);
        }
    }
}

// Function to check Qlik Sense access license status
/**
 * Checks the Qlik Sense access license status.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
async function checkQlikSenseAccessLicenseStatus(config, logger) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: globals.config.get('Butler.configQRS.port'),
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        // Merge YAML-configured headers with hardcoded headers
        configQRS.headers = {
            ...globals.getQRSHttpHeaders(),
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsClient(configQRS);

        // Get Qlik Sense access license info
        const result1 = await qrsInstance.Get(`license/accesstypeoverview`);

        // Is status code 200 or body is empty?
        if (result1.statusCode !== 200 || !result1.body) {
            logger.error(`[QSEOW] QLIKSENSE LICENSE MONITOR: HTTP status code ${result1.statusCode}`);
            return;
        }

        // Debug log
        logger.debug(`[QSEOW] QLIKSENSE LICENSE MONITOR: ${JSON.stringify(result1.body)}`);

        // To which destination should we send the license information?
        // Check InfluDB first
        // If InfluxDB is enabled, post the license status to InfluxDB
        if (
            config.get('Butler.influxDb.enable') === true &&
            config.get('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.enable') === true
        ) {
            await postQlikSenseLicenseStatusToInfluxDB(result1.body);
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE LICENSE MONITOR: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE LICENSE MONITOR: ${globals.getErrorMessage(err)}`);
        }
    }
}

// Function to release professional access licenses
/**
 * Releases professional access licenses.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 * @param {Object} qrsInstance - The QRS instance.
 * @returns {boolean} - Returns true if licenses are successfully released, false otherwise.
 */
async function licenseReleaseProfessional(config, logger, qrsInstance) {
    // Build date filter to be used when fetching licenses with old lastUsed date
    // Get the current date and time
    const currentDate = new Date();

    // Get the release threshold (days) from the configuration
    const releaseThresholdDays = config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.professional.releaseThresholdDays');

    // Subtract the release threshold (days) from the current date, then round to the last moment of that day
    const cutoffDate = new Date(currentDate);
    cutoffDate.setDate(cutoffDate.getDate() - releaseThresholdDays);
    cutoffDate.setHours(23, 59, 59, 999);

    // verbose log, format dates as yyyy-mm-ddThh:mm:ss.sssZ
    logger.verbose(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: currentDate: ${currentDate.toISOString()}`);
    logger.verbose(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: releaseThresholdDays: ${releaseThresholdDays}`);
    logger.verbose(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: cutoffDate: ${cutoffDate.toISOString()}`);

    // Get all assigned professional licenses
    const url = `license/professionalaccesstype/full?filter=lastUsed le '${cutoffDate.toISOString()}'`;
    logger.debug(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Query URL: ${url}`);
    const result1 = await qrsInstance.Get(url);

    // Is status code other than 200 or body is empty?
    if (result1.statusCode !== 200 || !result1.body) {
        logger.error(
            `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Could not get list of assigned professional licenses. HTTP status code ${result1.statusCode}`,
        );
        return false;
    }

    // Debug log
    logger.debug(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Assigned: ${JSON.stringify(result1.body)}`);

    // Determnine which allocated licenses to release.
    // Only release licenses that are NOT quarantined
    // Loop over all licenses retrived in previous step, add licenses to be released to releaseProfessional array
    const releaseProfessional = [];

    const neverReleaseUsers = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.user');
    const neverReleaseTags = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.tag');
    const neverReleaseCustomProperties = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.customProperty');
    const neverReleaseUserDirectories = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.userDirectory');

    // eslint-disable-next-line no-restricted-syntax
    for (const license of result1.body) {
        if (!license.quarantined) {
            // Get full user info
            let currentUser;
            try {
                // eslint-disable-next-line no-await-in-loop
                const res = await qrsInstance.Get(`user/${license.user.id}`);
                if (res.statusCode !== 200 || !res.body) {
                    logger.error(
                        `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`,
                    );
                    return false;
                }
                currentUser = res.body;
            } catch (err) {
                if (globals.isSea) {
                    logger.error(
                        `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`,
                    );
                } else {
                    logger.error(
                        `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}. ${globals.getErrorMessage(err)}`,
                    );
                }
                return false;
            }

            // Get days since last use
            const daysSinceLastUse = Math.floor((new Date() - new Date(license.lastUsed)) / (1000 * 60 * 60 * 24));

            // Check if the user is in the neverReleaseUsers array.
            // Compare userDir and userId
            // If the user is in the neverReleaseUsers array, do not release the license
            let doNotRelease = false;
            let doNotReleaseReason = '';

            // Check do-not-release user names if there are any
            if (neverReleaseUsers?.length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const user of neverReleaseUsers) {
                    if (license.user.userDirectory === user.userDir && license.user.userId === user.userId) {
                        doNotRelease = true;
                        doNotReleaseReason = 'User is in the neverRelease.user list';
                        break;
                    }
                }
            }

            // Check do-not-release tags
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not haven any neverReleaseTags set
            if (!doNotRelease && currentUser.tags?.length > 0) {
                // Check if the user has any of the neverReleaseTags set
                // currentUser.tags is an array of tag objects. Each object has properties id and name
                // eslint-disable-next-line no-restricted-syntax
                for (const tag of currentUser.tags) {
                    if (neverReleaseTags?.length > 0) {
                        // eslint-disable-next-line no-restricted-syntax
                        for (const neverReleaseTag of neverReleaseTags) {
                            if (tag.name === neverReleaseTag) {
                                doNotRelease = true;
                                doNotReleaseReason = `User tagged with '${neverReleaseTag}', which is in the neverRelease.tag list`;
                                break;
                            }
                        }
                        if (doNotRelease) {
                            break;
                        }
                    }
                }
            }

            // Check do-not-release custom properties
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not have any neverReleaseCustomProperties set
            if (!doNotRelease && currentUser.customProperties?.length > 0) {
                // currentUser.customProperties is an array of custom property objects.
                // Each object looks like this:
                // {
                //     "id": "f4f1d1d0-5d5d-4e4e-8e8e-7f7f7f7f7f7f",
                //     "value": "foo",
                //     "definition": {
                //         "id": "f4f1d1d0-5d5d-4e4e-8e8e-7f7f7f7f7f7f",
                //         "name": "bar",
                //         "valueType": "Text"
                //     }
                // }
                // eslint-disable-next-line no-restricted-syntax
                for (const customProperty of currentUser.customProperties) {
                    if (neverReleaseCustomProperties?.length > 0) {
                        // eslint-disable-next-line no-restricted-syntax
                        for (const neverReleaseCustomProperty of neverReleaseCustomProperties) {
                            if (
                                customProperty.definition.name === neverReleaseCustomProperty.name &&
                                customProperty.value === neverReleaseCustomProperty.value
                            ) {
                                doNotRelease = true;
                                doNotReleaseReason = `User has custom property '${neverReleaseCustomProperty.name}' set to '${neverReleaseCustomProperty.value}', which is in the neverRelease.customProperty list`;
                                break;
                            }
                        }
                        if (doNotRelease) {
                            break;
                        }
                    }
                }
            }

            // Check do-not-release user directory
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not have any neverReleaseUserDirectories set
            if (!doNotRelease && neverReleaseUserDirectories?.length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const neverReleaseUserDir of neverReleaseUserDirectories) {
                    if (license.user.userDirectory === neverReleaseUserDir) {
                        doNotRelease = true;
                        doNotReleaseReason = `User's user directory is '${neverReleaseUserDir}', which is in the neverRelease.userDirectory list`;
                        break;
                    }
                }
            }

            // Check do-not-release inactive users
            if (!doNotRelease && config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive').toLowerCase() !== 'ignore') {
                // Do not release user if...
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive === 'No' (case insensitive) and currentUser.inactive===false
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive === 'Yes' (case insensitive) and currentUser.inactive===true
                const neverReleaseInactive = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive').toLowerCase();
                if (
                    (neverReleaseInactive === 'no' && currentUser.inactive === false) ||
                    (neverReleaseInactive === 'yes' && currentUser.inactive === true)
                ) {
                    doNotRelease = true;
                    doNotReleaseReason = `User has inactive status '${currentUser.inactive}'`;
                }
            }

            // Check do-not-release blocked users
            if (!doNotRelease && config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked').toLowerCase() !== 'ignore') {
                // Do not release user if...
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked === 'No' (case insensitive) and currentUser.blacklisted===false
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked === 'Yes' (case insensitive) and currentUser.blacklisted===true
                const neverReleaseBlocked = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked').toLowerCase();
                if (
                    (neverReleaseBlocked === 'no' && currentUser.blacklisted === false) ||
                    (neverReleaseBlocked === 'yes' && currentUser.blacklisted === true)
                ) {
                    doNotRelease = true;
                    doNotReleaseReason = `User has blocked status '${currentUser.blacklisted}'`;
                }
            }

            // Check do-not-release removed externally users
            if (
                !doNotRelease &&
                config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally').toLowerCase() !== 'ignore'
            ) {
                // Do not release user if...
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally === 'No' (case insensitive) and currentUser.removedExternally===false
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally === 'Yes' (case insensitive) and currentUser.removedExternally===true
                const neverReleaseRemovedExternally = config
                    .get('Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally')
                    .toLowerCase();
                if (
                    (neverReleaseRemovedExternally === 'no' && currentUser.removedExternally === false) ||
                    (neverReleaseRemovedExternally === 'yes' && currentUser.removedExternally === true)
                ) {
                    doNotRelease = true;
                    doNotReleaseReason = `User has removedExternally status '${currentUser.removedExternally}'`;
                }
            }

            // Should currentUser be released?
            if (!doNotRelease) {
                logger.verbose(
                    `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Adding user ${license.user.userDirectory}\\${license.user.userId} (days since last use: ${daysSinceLastUse}) to releaseProfessional array`,
                );
                releaseProfessional.push({
                    licenseId: license.id,
                    userDir: license.user.userDirectory,
                    userId: license.user.userId,
                    daysSinceLastUse,
                });
            } else {
                logger.info(
                    `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: License for user ${license.user.userDirectory}\\${license.user.userId} not released because: ${doNotReleaseReason}`,
                );
            }
        }
    }

    logger.verbose(
        `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Professional licenses to be released: ${JSON.stringify(releaseProfessional, null, 2)}`,
    );

    // Is license release dry-run enabled? If so, do not release any licenses
    if (config.get('Butler.qlikSenseLicense.licenseRelease.dryRun') === true) {
        logger.info('QLIKSENSE LICENSE RELEASE PROFESSIONAL: Dry-run enabled. No licenses will be released');
    } else {
        // Release all licenses in the releaseProfessional array
        // eslint-disable-next-line no-restricted-syntax
        for (const licenseRelease of releaseProfessional) {
            logger.info(
                `[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: Releasing license for user ${licenseRelease.userDir}\\${licenseRelease.userId} (days since last use: ${licenseRelease.daysSinceLastUse})`,
            );

            // Release license
            // eslint-disable-next-line no-await-in-loop
            const result2 = await qrsInstance.Delete(`license/professionalaccesstype/${licenseRelease.licenseId}`);

            // Is status code 204? Error if it's nmt
            if (result2.statusCode !== 204) {
                logger.error(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: HTTP status code ${result2.statusCode}`);
                return false;
            }

            // Debug log
            logger.debug(`[QSEOW] QLIKSENSE LICENSE RELEASE PROFESSIONAL: ${JSON.stringify(result2.body)}`);

            // Write info about released license to InfluxDB?
            if (
                config.get('Butler.influxDb.enable') === true &&
                config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.professional.releaseThresholdDays') >= 0
            ) {
                // eslint-disable-next-line no-await-in-loop
                await postQlikSenseLicenseReleasedToInfluxDB({
                    licenseType: 'professional',
                    licenseId: licenseRelease.licenseId,
                    userDir: licenseRelease.userDir,
                    userId: licenseRelease.userId,
                    daysSinceLastUse: licenseRelease.daysSinceLastUse,
                });
            }
        }
    }
    return true;
}

// Function to release analyzer access licenses
/**
 * Releases analyzer access licenses.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 * @param {Object} qrsInstance - The QRS instance.
 * @returns {boolean} - Returns true if licenses are successfully released, false otherwise.
 */
async function licenseReleaseAnalyzer(config, logger, qrsInstance) {
    // Build date filter to be used when fetching licenses with old lastUsed date
    // Get the current date and time
    const currentDate = new Date();

    // Get the release threshold (days) from the configuration
    const releaseThresholdDays = config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.releaseThresholdDays');

    // Subtract the release threshold (days) from the current date, then round to the last moment of that day
    const cutoffDate = new Date(currentDate);
    cutoffDate.setDate(cutoffDate.getDate() - releaseThresholdDays);
    cutoffDate.setHours(23, 59, 59, 999);

    // verbose log, format dates as yyyy-mm-ddThh:mm:ss.sssZ
    logger.verbose(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: currentDate: ${currentDate.toISOString()}`);
    logger.verbose(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: releaseThresholdDays: ${releaseThresholdDays}`);
    logger.verbose(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: cutoffDate: ${cutoffDate.toISOString()}`);

    // Get all assigned analyzer licenses
    const url = `license/analyzeraccesstype/full?filter=lastUsed le '${cutoffDate.toISOString()}'`;
    logger.debug(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Query URL: ${url}`);
    const result3 = await qrsInstance.Get(url);

    // Is status code 200 or body is empty?
    if (result3.statusCode !== 200 || !result3.body) {
        logger.error(
            `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Could not get list of assigned analyzer licenses. HTTP status code ${result3.statusCode}`,
        );
        return false;
    }

    // Debug log
    logger.debug(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Assigned: ${JSON.stringify(result3.body)}`);

    // Determnine which allocated licenses to release.
    // Only release licenses that are NOT quarantined
    // Loop over all licenses retrived in previous step, add licenses to be released to releaseAnalyzer array
    const releaseAnalyzer = [];

    const neverReleaseUsers = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.user');
    const neverReleaseTags = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.tag');
    const neverReleaseCustomProperties = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.customProperty');
    const neverReleaseUserDirectories = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.userDirectory');

    // eslint-disable-next-line no-restricted-syntax
    for (const license of result3.body) {
        if (!license.quarantined) {
            // Get full user info
            let currentUser;
            try {
                // eslint-disable-next-line no-await-in-loop
                const res = await qrsInstance.Get(`user/${license.user.id}`);
                if (res.statusCode !== 200 || !res.body) {
                    logger.error(
                        `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`,
                    );
                    return false;
                }
                currentUser = res.body;
            } catch (err) {
                if (globals.isSea) {
                    logger.error(
                        `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`,
                    );
                } else {
                    logger.error(
                        `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}. ${globals.getErrorMessage(err)}`,
                    );
                }
                return false;
            }

            // Get days since last use
            const daysSinceLastUse = Math.floor((new Date() - new Date(license.lastUsed)) / (1000 * 60 * 60 * 24));

            // Check if the user is in the neverReleaseUsers array.
            // Compare userDir and userId
            // If the user is in the neverReleaseUsers array, do not release the license
            let doNotRelease = false;
            let doNotReleaseReason = '';

            // Check do-not-release user names if there are any
            if (neverReleaseUsers?.length > 0) {
                for (const user of neverReleaseUsers) {
                    if (license.user.userDirectory === user.userDir && license.user.userId === user.userId) {
                        doNotRelease = true;
                        doNotReleaseReason = 'User is in the neverRelease.user list';
                        break;
                    }
                }
            }

            // Check do-not-release tags
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not haven any neverReleaseTags set
            if (!doNotRelease && currentUser.tags?.length > 0) {
                // Check if the user has any of the neverReleaseTags set
                // currentUser.tags is an array of tag objects. Each object has properties id and name
                // eslint-disable-next-line no-restricted-syntax
                for (const tag of currentUser.tags) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const neverReleaseTag of neverReleaseTags) {
                        if (tag.name === neverReleaseTag) {
                            doNotRelease = true;
                            doNotReleaseReason = `User tagged with '${neverReleaseTag}', which is in the neverRelease.tag list`;
                            break;
                        }
                    }
                    if (doNotRelease) {
                        break;
                    }
                }
            }

            // Check do-not-release custom properties
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not have any neverReleaseCustomProperties set
            if (!doNotRelease && currentUser.customProperties?.length > 0) {
                // currentUser.customProperties is an array of custom property objects.
                // Each object looks like this:
                // {
                //     "id": "f4f1d1d0-5d5d-4e4e-8e8e-7f7f7f7f7f7f",
                //     "value": "foo",
                //     "definition": {
                //         "id": "f4f1d1d0-5d5d-4e4e-8e8e-7f7f7f7f7f7f",
                //         "name": "bar",
                //         "valueType": "Text"
                //     }
                // }
                // eslint-disable-next-line no-restricted-syntax
                for (const customProperty of currentUser.customProperties) {
                    // eslint-disable-next-line no-restricted-syntax
                    for (const neverReleaseCustomProperty of neverReleaseCustomProperties) {
                        if (
                            customProperty.definition.name === neverReleaseCustomProperty.name &&
                            customProperty.value === neverReleaseCustomProperty.value
                        ) {
                            doNotRelease = true;
                            doNotReleaseReason = `User has custom property '${neverReleaseCustomProperty.name}' set to '${neverReleaseCustomProperty.value}', which is in the neverRelease.customProperty list`;
                            break;
                        }
                    }
                    if (doNotRelease) {
                        break;
                    }
                }
            }

            // Check do-not-release user directory
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not have any neverReleaseUserDirectories set
            if (!doNotRelease && neverReleaseUserDirectories?.length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const neverReleaseUserDir of neverReleaseUserDirectories) {
                    if (license.user.userDirectory === neverReleaseUserDir) {
                        doNotRelease = true;
                        doNotReleaseReason = `User's user directory is '${neverReleaseUserDir}', which is in the neverRelease.userDirectory list`;
                        break;
                    }
                }
            }

            // Check do-not-release inactive users
            if (!doNotRelease && config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive').toLowerCase() !== 'ignore') {
                // Do not release user if...
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive === 'No' (case insensitive) and currentUser.inactive===false
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive === 'Yes' (case insensitive) and currentUser.inactive===true
                const neverReleaseInactive = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.inactive').toLowerCase();
                if (
                    (neverReleaseInactive === 'no' && currentUser.inactive === false) ||
                    (neverReleaseInactive === 'yes' && currentUser.inactive === true)
                ) {
                    doNotRelease = true;
                    doNotReleaseReason = `User has inactive status '${currentUser.inactive}'`;
                }
            }

            // Check do-not-release blocked users
            if (!doNotRelease && config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked').toLowerCase() !== 'ignore') {
                // Do not release user if...
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked === 'No' (case insensitive) and currentUser.blacklisted===false
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked === 'Yes' (case insensitive) and currentUser.blacklisted===true
                const neverReleaseBlocked = config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.blocked').toLowerCase();
                if (
                    (neverReleaseBlocked === 'no' && currentUser.blacklisted === false) ||
                    (neverReleaseBlocked === 'yes' && currentUser.blacklisted === true)
                ) {
                    doNotRelease = true;
                    doNotReleaseReason = `User has blocked status '${currentUser.blacklisted}'`;
                }
            }

            // Check do-not-release removed externally users
            if (
                !doNotRelease &&
                config.get('Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally').toLowerCase() !== 'ignore'
            ) {
                // Do not release user if...
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally === 'No' (case insensitive) and currentUser.removedExternally===false
                // - config setting Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally === 'Yes' (case insensitive) and currentUser.removedExternally===true
                const neverReleaseRemovedExternally = config
                    .get('Butler.qlikSenseLicense.licenseRelease.neverRelease.removedExternally')
                    .toLowerCase();
                if (
                    (neverReleaseRemovedExternally === 'no' && currentUser.removedExternally === false) ||
                    (neverReleaseRemovedExternally === 'yes' && currentUser.removedExternally === true)
                ) {
                    doNotRelease = true;
                    doNotReleaseReason = `User has removedExternally status '${currentUser.removedExternally}'`;
                }
            }

            // Should currentUser be released?
            if (!doNotRelease) {
                logger.verbose(
                    `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Adding user ${license.user.userDirectory}\\${license.user.userId} (days since last use: ${daysSinceLastUse}) to releaseAnalyzer array`,
                );
                releaseAnalyzer.push({
                    licenseId: license.id,
                    userDir: license.user.userDirectory,
                    userId: license.user.userId,
                    daysSinceLastUse,
                });
            } else {
                logger.info(
                    `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: License for user ${license.user.userDirectory}\\${license.user.userId} not released because: ${doNotReleaseReason}`,
                );
            }
        }
    }

    logger.verbose(
        `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Analyzer licenses to be released: ${JSON.stringify(releaseAnalyzer, null, 2)}`,
    );

    // Is license release dry-run enabled? If so, do not release any licenses
    if (config.get('Butler.qlikSenseLicense.licenseRelease.dryRun') === true) {
        logger.info('[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Dry-run enabled. No licenses will be released');
    } else {
        // Release all licenses in the releaseAnalyzer array
        // eslint-disable-next-line no-restricted-syntax
        for (const licenseRelease of releaseAnalyzer) {
            logger.info(
                `[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: Releasing license for user ${licenseRelease.userDir}\\${licenseRelease.userId} (days since last use: ${licenseRelease.daysSinceLastUse})`,
            );

            // Release license
            // eslint-disable-next-line no-await-in-loop
            const result4 = await qrsInstance.Delete(`license/analyzeraccesstype/${licenseRelease.licenseId}`);

            // Is status code 204? Error if it's nmt
            if (result4.statusCode !== 204) {
                logger.error(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: HTTP status code ${result4.statusCode}`);
                return false;
            }

            // Debug log
            logger.debug(`[QSEOW] QLIKSENSE LICENSE RELEASE ANALYZER: ${JSON.stringify(result4.body)}`);

            // Write info about released license to InfluxDB?
            if (
                config.get('Butler.influxDb.enable') === true &&
                config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.releaseThresholdDays') >= 0
            ) {
                // eslint-disable-next-line no-await-in-loop
                await postQlikSenseLicenseReleasedToInfluxDB({
                    licenseType: 'analyzer',
                    licenseId: licenseRelease.licenseId,
                    userDir: licenseRelease.userDir,
                    userId: licenseRelease.userId,
                    daysSinceLastUse: licenseRelease.daysSinceLastUse,
                });
            }
        }
    }
    return true;
}

// Function to release Qlik Sense access licenses
/**
 * Checks and releases Qlik Sense access licenses.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 * @returns {boolean} - Returns true if licenses are successfully checked and released, false otherwise.
 */
async function checkQlikSenseLicenseRelease(config, logger) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: globals.config.get('Butler.configQRS.port'),
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        // Merge YAML-configured headers with hardcoded headers
        configQRS.headers = {
            ...globals.getQRSHttpHeaders(),
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsClient(configQRS);

        // Is license release enabled for professional access licenses?
        if (config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.professional.enable') === true) {
            // Release licenses of type "professional"
            const res = await licenseReleaseProfessional(config, logger, qrsInstance);

            // Success?
            if (!res) {
                return false;
            }
        }

        // Is license release enabled for analyzer access licenses?
        if (config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.enable') === true) {
            // Release licenses of type "analyzer"
            const res = await licenseReleaseAnalyzer(config, logger, qrsInstance);

            // Success?
            if (!res) {
                return false;
            }
        }

        return true;
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE LICENSE RELEASE: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE LICENSE RELEASE: ${globals.getErrorMessage(err)}`);
        }
        return false;
    }
}

// Function to set up the timer used to check Qlik Sense access license status
/**
 * Sets up the timer used to check Qlik Sense access license status.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
export async function setupQlikSenseAccessLicenseMonitor(config, logger) {
    try {
        if (config.get('Butler.qlikSenseLicense.licenseMonitor.enable') === true) {
            const sched = later.parse.text(config.get('Butler.qlikSenseLicense.licenseMonitor.frequency'));
            later.setInterval(() => {
                checkQlikSenseAccessLicenseStatus(config, logger, false);
            }, sched);

            // Do an initial license check
            logger.verbose('[QSEOW] Doing initial Qlik Sense license check');
            checkQlikSenseAccessLicenseStatus(config, logger, true);
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE LICENSE MONITOR INIT: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE LICENSE MONITOR INIT: ${globals.getErrorMessage(err)}`);
        }
    }
}

// Function to set up the timer used to release Qlik Sense access licenses
/**
 * Sets up the timer used to release Qlik Sense access licenses.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
export async function setupQlikSenseLicenseRelease(config, logger) {
    try {
        if (config.get('Butler.qlikSenseLicense.licenseRelease.enable') === true) {
            const sched = later.parse.text(config.get('Butler.qlikSenseLicense.licenseRelease.frequency'));
            later.setInterval(() => {
                checkQlikSenseLicenseRelease(config, logger);
            }, sched);

            // Do an initial release
            logger.verbose('[QSEOW] Doing initial Qlik Sense license check');
            checkQlikSenseLicenseRelease(config, logger);
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE LICENSE RELEASE INIT: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE LICENSE RELEASE INIT: ${globals.getErrorMessage(err)}`);
        }
    }
}

// Function to set up the timer used to check Qlik Sense server license status
/**
 * Sets up the timer used to check Qlik Sense server license status.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object.
 */
export async function setupQlikSenseServerLicenseMonitor(config, logger) {
    try {
        if (config.get('Butler.qlikSenseLicense.serverLicenseMonitor.enable') === true) {
            const sched = later.parse.text(config.get('Butler.qlikSenseLicense.serverLicenseMonitor.frequency'));
            later.setInterval(() => {
                checkQlikSenseServerLicenseStatus(config, logger);
            }, sched);

            // Do an initial license check
            logger.verbose('[QSEOW] Doing initial Qlik Sense server license check');
            checkQlikSenseServerLicenseStatus(config, logger);
        }
    } catch (err) {
        if (globals.isSea) {
            logger.error(`[QSEOW] QLIKSENSE SERVER LICENSE MONITOR INIT: ${globals.getErrorMessage(err)}`);
        } else {
            logger.error(`[QSEOW] QLIKSENSE SERVER LICENSE MONITOR INIT: ${globals.getErrorMessage(err)}`);
        }
    }
}
