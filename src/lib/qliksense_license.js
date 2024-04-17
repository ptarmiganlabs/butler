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
async function licenseReleaseProfessional(config, logger, qrsInstance, neverReleaseUsers) {
    const result1 = await qrsInstance.Get(`license/professionalaccesstype/full`);

    // Is status code 200 or body is empty?
    if (result1.statusCode !== 200 || !result1.body) {
        logger.error(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: HTTP status code ${result1.statusCode}`);
        return false;
    }

    // Debug log
    logger.debug(`QLIKSENSE LICENSE RELEASE PROFESSIONAL: Allocated: ${JSON.stringify(result1.body)}`);

    // Determnine which allocated licenses to release.
    // Only release licenses that are NOT quarantined
    // Take into account the releaese threshold (days), i.e. days since last use
    // Loop over all licenses retrived in previous step, add licenses to be released to releaseProfessional array
    const releaseProfessional = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const license of result1.body) {
        if (!license.quarantined) {
            // Get days since last use
            const daysSinceLastUse = Math.floor((new Date() - new Date(license.lastUsed)) / (1000 * 60 * 60 * 24));

            // Check if the user is in the neverReleaseUsers array.
            // Compare userDir and userId
            // If the user is in the neverReleaseUsers array, do not release the license
            let doNotRelease = false;
            // eslint-disable-next-line no-restricted-syntax
            for (const user of neverReleaseUsers) {
                if (license.user.userDirectory === user.userDir && license.user.userId === user.userId) {
                    doNotRelease = true;
                    break;
                }
            }

            // If the user is not in the neverReleaseUsers array, and the days since last use is greater than the release threshold, release the license
            if (
                !doNotRelease &&
                daysSinceLastUse >= config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.professional.releaseThresholdDays')
            ) {
                releaseProfessional.push({
                    licenseId: license.id,
                    userDir: license.user.userDirectory,
                    userId: license.user.userId,
                    daysSinceLastUse,
                });
            }
        }
    }

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
    return true;
}

// Function to release analyzer licenses
async function licenseReleaseAnalyzer(config, logger, qrsInstance, neverReleaseUsers) {
    const result3 = await qrsInstance.Get(`license/analyzeraccesstype/full`);

    // Is status code 200 or body is empty?
    if (result3.statusCode !== 200 || !result3.body) {
        logger.error(`QLIKSENSE LICENSE RELEASE ANALYZER: HTTP status code ${result3.statusCode}`);
        return;
    }

    // Debug log
    logger.debug(`QLIKSENSE LICENSE RELEASE ANALYZER: Allocated: ${JSON.stringify(result3.body)}`);

    // Determnine which allocated licenses to release.
    // Only release licenses that are NOT quarantined
    // Take into account the releaese threshold (days), i.e. days since last use
    // Loop over all licenses retrived in previous step, add licenses to be released to releaseAnalyzer array
    const releaseAnalyzer = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const license of result3.body) {
        if (!license.quarantined) {
            // Get days since last use
            const daysSinceLastUse = Math.floor((new Date() - new Date(license.lastUsed)) / (1000 * 60 * 60 * 24));

            // Check if the user is in the neverReleaseUsers array.
            // Compare userDir and userId
            // If the user is in the neverReleaseUsers array, do not release the license
            let doNotRelease = false;
            // eslint-disable-next-line no-restricted-syntax
            for (const user of neverReleaseUsers) {
                if (license.user.userDirectory === user.userDir && license.user.userId === user.userId) {
                    doNotRelease = true;
                    break;
                }
            }

            // If the user is not in the neverReleaseUsers array, and the days since last use is greater than the release threshold, release the license
            if (
                !doNotRelease &&
                daysSinceLastUse >= config.get('Butler.qlikSenseLicense.licenseRelease.licenseType.analyzer.releaseThresholdDays')
            ) {
                releaseAnalyzer.push({
                    licenseId: license.id,
                    userDir: license.user.userDirectory,
                    userId: license.user.userId,
                    daysSinceLastUse,
                });
            }
        }
    }

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
            return;
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

        // Which user accounts should never be released?
        // Get info from config file
        const neverReleaseUsers = config.get('Butler.qlikSenseLicense.licenseRelease.neverReleaseUsers');

        // Release licenses of type "professional"
        let res = await licenseReleaseProfessional(config, logger, qrsInstance, neverReleaseUsers);

        // Success?
        if (!res) {
            return false;
        }

        // Release licenses of type "analyzer"
        res = await licenseReleaseAnalyzer(config, logger, qrsInstance, neverReleaseUsers);
        // Success?
        if (!res) {
            return false;
        }

        return true
    } catch (err) {
        logger.error(`QLIKSENSE LICENSE MONITOR: ${err}`);
        if (err.stack) {
            logger.error(`QLIKSENSE LICENSE MONITOR: ${err.stack}`);
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
