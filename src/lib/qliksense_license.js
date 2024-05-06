import later from '@breejs/later';
import QrsInteract from 'qrs-interact';

import globals from '../globals.js';
import { postQlikSenseLicenseStatusToInfluxDB, postQlikSenseLicenseReleasedToInfluxDB } from './post_to_influxdb.js';

// Function to check Qlik Sense license status
async function checkQlikSenseLicenseStatus(config, logger) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: 4242,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        configQRS.headers = {
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };
        const qrsInstance = new QrsInteract(configQRS);

        // Get Qlik Sense license info
        const result1 = await qrsInstance.Get(`license/accesstypeoverview`);

        // Is status code 200 or body is empty?
        if (result1.statusCode !== 200 || !result1.body) {
            logger.error(`QLIKSENSE LICENSE MONITOR: HTTP status code ${result1.statusCode}`);
            return;
        }

        // Debug log
        logger.debug(`QLIKSENSE LICENSE MONITOR: ${JSON.stringify(result1.body)}`);

        // To which destination should we send the license information?
        // Check InfluDB first
        // If InfluxDB is enabled, post the license status to InfluxDB
        if (
            config.has('Butler.influxDb.enable') &&
            config.get('Butler.influxDb.enable') === true &&
            config.has('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.enable') &&
            config.get('Butler.qlikSenseLicense.licenseMonitor.destination.influxDb.enable') === true
        ) {
            await postQlikSenseLicenseStatusToInfluxDB(result1.body);
        }
    } catch (err) {
        logger.error(`QLIKSENSE LICENSE MONITOR: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE MONITOR: ${err.stack}`);
        }
    }
}

// Function to release professional licenses
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
    logger.verbose(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: currentDate: ${currentDate.toISOString()}`);
    logger.verbose(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: releaseThresholdDays: ${releaseThresholdDays}`);
    logger.verbose(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: cutoffDate: ${cutoffDate.toISOString()}`);

    // Get all assigned professional licenses
    const url = `license/professionalaccesstype/full?filter=lastUsed le '${cutoffDate.toISOString()}'`;
    logger.debug(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: Query URL: ${url}`);
    const result1 = await qrsInstance.Get(url);

    // Is status code other than 200 or body is empty?
    if (result1.statusCode !== 200 || !result1.body) {
        logger.error(
            `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Could not get list of assigned professional licenses. HTTP status code ${result1.statusCode}`
        );
        return false;
    }

    // Debug log
    logger.debug(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: Assigned: ${JSON.stringify(result1.body)}`);

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
                        `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`
                    );
                    return false;
                }
                currentUser = res.body;
            } catch (err) {
                logger.error(
                    `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`
                );
                if (err.stack) {
                    logger.error(
                        `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}. ${err.stack}`
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

            // Check do-not-release user names
            // eslint-disable-next-line no-restricted-syntax
            for (const user of neverReleaseUsers) {
                if (license.user.userDirectory === user.userDir && license.user.userId === user.userId) {
                    doNotRelease = true;
                    doNotReleaseReason = 'User is in the neverRelease.user list';
                    break;
                }
            }

            // Check do-not-release tags
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not haven any neverReleaseTags set
            if (!doNotRelease) {
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
            if (!doNotRelease) {
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
            if (!doNotRelease) {
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
                logger.info(
                    `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Adding user ${license.user.userDirectory}\\${license.user.userId} (days since last use: ${daysSinceLastUse}) to releaseProfessional array`
                );
                releaseProfessional.push({
                    licenseId: license.id,
                    userDir: license.user.userDirectory,
                    userId: license.user.userId,
                    daysSinceLastUse,
                });
            } else {
                logger.info(
                    `QLIKSENSE LICENSE RELEASE PROFESSIONAL: License for user ${license.user.userDirectory}\\${license.user.userId} not released because: ${doNotReleaseReason}`
                );
            }
        }
    }

    logger.verbose(
        `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Professional licenses to be released: ${JSON.stringify(releaseProfessional, null, 2)}`
    );

    // Is license release dry-run enabled? If so, do not release any licenses
    if (config.get('Butler.qlikSenseLicense.licenseRelease.dryRun') === true) {
        logger.info('QLIKSENSE LICENSE RELEASE PROFESSIONAL: Dry-run enabled. No licenses will be released');
    } else {
        // Release all licenses in the releaseProfessional array
        // eslint-disable-next-line no-restricted-syntax
        for (const licenseRelease of releaseProfessional) {
            logger.info(
                `QLIKSENSE LICENSE RELEASE PROFESSIONAL: Releasing license for user ${licenseRelease.userDir}\\${licenseRelease.userId} (days since last use: ${licenseRelease.daysSinceLastUse})`
            );

            // Release license
            // eslint-disable-next-line no-await-in-loop
            const result2 = await qrsInstance.Delete(`license/professionalaccesstype/${licenseRelease.licenseId}`);

            // Is status code 204? Error if it's nmt
            if (result2.statusCode !== 204) {
                logger.error(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: HTTP status code ${result2.statusCode}`);
                return false;
            }

            // Debug log
            logger.debug(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: ${JSON.stringify(result2.body)}`);

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

// Function to release analyzer licenses
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
    logger.verbose(`QLIKSENSE LICENSE RELEASE ANALYZER: currentDate: ${currentDate.toISOString()}`);
    logger.verbose(`QLIKSENSE LICENSE RELEASE ANALYZER: releaseThresholdDays: ${releaseThresholdDays}`);
    logger.verbose(`QLIKSENSE LICENSE RELEASE ANALYZER: cutoffDate: ${cutoffDate.toISOString()}`);

    // Get all assigned analyzer licenses
    const url = `license/analyzeraccesstype/full?filter=lastUsed le '${cutoffDate.toISOString()}'`;
    logger.debug(`QLIKSENSE LICENSE RELEASE ANALYZER: Query URL: ${url}`);
    const result3 = await qrsInstance.Get(url);

    // Is status code 200 or body is empty?
    if (result3.statusCode !== 200 || !result3.body) {
        logger.error(
            `QLIKSENSE LICENSE RELEASE ANALYZER: Could not get list of assigned analyzer licenses. HTTP status code ${result3.statusCode}`
        );
        return false;
    }

    // Debug log
    logger.debug(`QLIKSENSE LICENSE RELEASE ANALYZER: Assigned: ${JSON.stringify(result3.body)}`);

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
                        `QLIKSENSE LICENSE RELEASE ANALYZER: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`
                    );
                    return false;
                }
                currentUser = res.body;
            } catch (err) {
                logger.error(
                    `QLIKSENSE LICENSE RELEASE ANALYZER: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}`
                );
                if (err.stack) {
                    logger.error(
                        `QLIKSENSE LICENSE RELEASE ANALYZER: Failed getting user info for user [${license.user.id}] ${license.user.userDirectory}\\${license.user.userId}. ${err.stack}`
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

            // Check do-not-release user names
            // eslint-disable-next-line no-restricted-syntax
            for (const user of neverReleaseUsers) {
                if (license.user.userDirectory === user.userDir && license.user.userId === user.userId) {
                    doNotRelease = true;
                    doNotReleaseReason = 'User is in the neverRelease.user list';
                    break;
                }
            }

            // Check do-not-release tags
            // If...
            // - the user is not already marked as doNotRelease=true and
            // - the currentUser does not haven any neverReleaseTags set
            if (!doNotRelease) {
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
            if (!doNotRelease) {
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
            if (!doNotRelease) {
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
                logger.info(
                    `QLIKSENSE LICENSE RELEASE ANALYZER: Adding user ${license.user.userDirectory}\\${license.user.userId} (days since last use: ${daysSinceLastUse}) to releaseAnalyzer array`
                );
                releaseAnalyzer.push({
                    licenseId: license.id,
                    userDir: license.user.userDirectory,
                    userId: license.user.userId,
                    daysSinceLastUse,
                });
            } else {
                logger.info(
                    `QLIKSENSE LICENSE RELEASE ANALYZER: License for user ${license.user.userDirectory}\\${license.user.userId} not released because: ${doNotReleaseReason}`
                );
            }
        }
    }

    logger.verbose(`QLIKSENSE LICENSE RELEASE ANALYZER: Analyzer licenses to be released: ${JSON.stringify(releaseAnalyzer, null, 2)}`);

    // Is license release dry-run enabled? If so, do not release any licenses
    if (config.get('Butler.qlikSenseLicense.licenseRelease.dryRun') === true) {
        logger.info('QLIKSENSE LICENSE RELEASE ANALYZER: Dry-run enabled. No licenses will be released');
    } else {
        // Release all licenses in the releaseAnalyzer array
        // eslint-disable-next-line no-restricted-syntax
        for (const licenseRelease of releaseAnalyzer) {
            logger.info(
                `QLIKSENSE LICENSE RELEASE ANALYZER: Releasing license for user ${licenseRelease.userDir}\\${licenseRelease.userId} (days since last use: ${licenseRelease.daysSinceLastUse})`
            );

            // Release license
            // eslint-disable-next-line no-await-in-loop
            const result4 = await qrsInstance.Delete(`license/analyzeraccesstype/${licenseRelease.licenseId}`);

            // Is status code 204? Error if it's nmt
            if (result4.statusCode !== 204) {
                logger.error(`QLIKSENSE LICENSE RELEASE ANALYZER: HTTP status code ${result4.statusCode}`);
                return false;
            }

            // Debug log
            logger.debug(`QLIKSENSE LICENSE RELEASE ANALYZER: ${JSON.stringify(result4.body)}`);

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

// Function to release Qlik Sense licenses
async function checkQlikSenseLicenseRelease(config, logger) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: 4242,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        configQRS.headers = {
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };
        const qrsInstance = new QrsInteract(configQRS);

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
        logger.error(`QLIKSENSE LICENSE RELEASE: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE RELEASE: ${err.stack}`);
        }
        return false;
    }
}

// Function to set up the timer used to check Qlik Sense license status
export async function setupQlikSenseLicenseMonitor(config, logger) {
    try {
        if (
            !config.has('Butler.qlikSenseLicense.licenseMonitor.enable') ||
            config.get('Butler.qlikSenseLicense.licenseMonitor.enable') === true
        ) {
            const sched = later.parse.text(config.get('Butler.qlikSenseLicense.licenseMonitor.frequency'));
            later.setInterval(() => {
                checkQlikSenseLicenseStatus(config, logger, false);
            }, sched);

            // Do an initial license check
            logger.verbose('Doing initial Qlik Sense license check');
            checkQlikSenseLicenseStatus(config, logger, true);
        }
    } catch (err) {
        logger.error(`QLIKSENSE LICENSE MONITOR INIT: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE MONITOR INIT: ${err.stack}`);
        }
    }
}

// Function to set up the timer used to release Qlik Sense licenses
export async function setupQlikSenseLicenseRelease(config, logger) {
    try {
        if (
            !config.has('Butler.qlikSenseLicense.licenseRelease.enable') ||
            config.get('Butler.qlikSenseLicense.licenseRelease.enable') === true
        ) {
            const sched = later.parse.text(config.get('Butler.qlikSenseLicense.licenseRelease.frequency'));
            later.setInterval(() => {
                checkQlikSenseLicenseRelease(config, logger);
            }, sched);

            // Do an initial release
            logger.verbose('Doing initial Qlik Sense license check');
            checkQlikSenseLicenseRelease(config, logger);
        }
    } catch (err) {
        logger.error(`QLIKSENSE LICENSE RELEASE INIT: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE RELEASE INIT: ${err.stack}`);
        }
    }
}
