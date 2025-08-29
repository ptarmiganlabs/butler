import QrsClient from '../qrs_client.js';
import { load } from 'js-yaml';
import fs from 'fs/promises';
import { default as Ajv } from 'ajv';

import { getReloadTasksCustomProperties } from '../../qrs_util/task_cp_util.js';
import { confifgFileSchema } from './config-file-schema.js';
import globals from '../../globals.js';

/**
 * Asserts the validity of QS related settings in the configuration file.
 *
 * This function checks that the `Butler.configEngine.headers.static` and
 * `Butler.configQRS.headers.static` arrays in the config file are not empty
 * and contain at least one object with the property "X-Qlik-User". The
 * "X-Qlik-User" value should be in the format "UserDirectory=<userdir>;
 * UserId=<userid>".
 *
 * If any of the conditions are not met, an error is logged and the function
 * returns `false`. Otherwise, the function returns `true`.
 *
 * @param {object} config - The configuration object.
 * @param {object} logger - The logger object used for logging errors.
 * @returns {boolean} - Returns `true` if all assertions pass, otherwise `false`.
 */
export const configFileQsAssert = async (config, logger) => {
    // The array Butler.configEngine.headers.static must contain
    // - at least one object
    // - one object with the property "X-Qlik-User" with a value on the format "UserDirectory=<userdir>>; UserId=<userid>"
    //
    // The array consists of objets with the following properties:
    // - name
    // - value

    if (config.get('Butler.configEngine.headers.static').length === 0) {
        logger.error('ASSERT CONFIG QS: Butler.configEngine.headers.static is an empty array in the config file. Aborting.');
        return false;
    }

    if (config.get('Butler.configEngine.headers.static').filter((header) => header.name === 'X-Qlik-User').length === 0) {
        logger.error(
            'ASSERT CONFIG QS: Butler.configEngine.headers.static does not contain an object with the property "X-Qlik-User" in the config file. Aborting.',
        );
        return false;
    }

    // Same check as above, but for the Butler.configQRS.headers.static array
    if (config.get('Butler.configQRS.headers.static').length === 0) {
        logger.error('ASSERT CONFIG QS: Butler.configQRS.headers.static is an empty array in the config file. Aborting.');
        return false;
    }

    if (config.get('Butler.configQRS.headers.static').filter((header) => header.name === 'X-Qlik-User').length === 0) {
        logger.error(
            'ASSERT CONFIG QS: Butler.configQRS.headers.static does not contain an object with the property "X-Qlik-User" in the config file. Aborting.',
        );
        return false;
    }

    return true;
};

/**
 * Asserts the validity of email notification settings in the configuration file.
 *
 * This function checks if the email notification settings for reload task success,
 * failure, and aborted events are properly configured in the config file. It verifies
 * that when email notifications are enabled, specific custom properties are set to
 * valid, non-empty strings and exist in the Qlik Sense environment.
 *
 * For each type of notification (success, failure, aborted), it checks:
 * - If email notifications are enabled.
 * - If the necessary custom properties are specified and exist in the Qlik Sense environment.
 *
 * If any condition is not met, an error is logged and the function returns `false`.
 * Otherwise, it returns `true`.
 *
 * @param {object} config - The configuration object.
 * @param {object} configQRS - The QRS configuration object.
 * @param {object} logger - The logger object used for logging errors and debugging information.
 * @returns {boolean} - Returns `true` if all assertions pass, otherwise `false`.
 */
export const configFileEmailAssert = async (config, configQRS, logger) => {
    // If the following properties are true:
    // - Butler.emailNotification.enable
    // - Butler.emailNotification.reloadTaskSuccess.enable
    //
    // ... then the following properties must be set to non-empty strings that are valid custom property names:
    // - Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.customPropertyName
    // - Butler.emailNotification.reloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName
    //
    // Also, those custom properties must exist in the Qlik Sense environment
    if (config.get('Butler.emailNotification.enable') && config.get('Butler.emailNotification.reloadTaskSuccess.enable')) {
        // Check if the custom properties exist in the Qlik Sense environment
        try {
            const res1 = await getReloadTasksCustomProperties(config, configQRS, logger);
            logger.debug(
                `ASSERT CONFIG EMAIL: The following custom properties are available for reload tasks: ${JSON.stringify(res1, null, 2)}`,
            );

            if (
                res1.findIndex(
                    (cp) =>
                        cp.name === config.get('Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.customPropertyName'),
                ) === -1
            ) {
                logger.error(
                    `ASSERT CONFIG EMAIL: Custom property '${config.get(
                        'Butler.emailNotification.reloadTaskSuccess.alertEnableByCustomProperty.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }

            if (
                res1.findIndex(
                    (cp) =>
                        cp.name === config.get('Butler.emailNotification.reloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName'),
                ) === -1
            ) {
                logger.error(
                    `ASSERT CONFIG EMAIL: Custom property '${config.get(
                        'Butler.emailNotification.reloadTaskSuccess.alertEnabledByEmailAddress.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG EMAIL: ${err}`);
        }
    }

    // If the following properties are true:
    // - Butler.emailNotification.enable
    // - Butler.emailNotification.reloadTaskFailure.enable
    //
    // ... then the following properties must be set to non-empty strings that are valid custom property names:
    // - Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName
    // - Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName
    //
    // Also, those custom properties must exist in the Qlik Sense environment
    if (config.get('Butler.emailNotification.enable') && config.get('Butler.emailNotification.reloadTaskFailure.enable')) {
        // Check if the custom properties exist in the Qlik Sense environment
        try {
            const res1 = await getReloadTasksCustomProperties(config, configQRS, logger);
            logger.debug(
                `ASSERT CONFIG EMAIL: The following custom properties are available for reload tasks: ${JSON.stringify(res1, null, 2)}`,
            );

            if (
                res1.findIndex(
                    (cp) =>
                        cp.name === config.get('Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName'),
                ) === -1
            ) {
                logger.error(
                    `ASSERT CONFIG EMAIL: Custom property '${config.get(
                        'Butler.emailNotification.reloadTaskFailure.alertEnableByCustomProperty.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }

            if (
                res1.findIndex(
                    (cp) =>
                        cp.name === config.get('Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName'),
                ) === -1
            ) {
                logger.error(
                    `ASSERT CONFIG EMAIL: Custom property '${config.get(
                        'Butler.emailNotification.reloadTaskFailure.alertEnabledByEmailAddress.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG EMAIL: ${err}`);
        }
    }

    // If the following properties are true:
    // - Butler.emailNotification.enable
    // - Butler.emailNotification.reloadTaskAborted.enable
    //
    // ... then the following properties must be set to non-empty strings that are valid custom property names:
    // - Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName
    // - Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName
    //
    // Also, those custom properties must exist in the Qlik Sense environment
    if (config.get('Butler.emailNotification.enable') && config.get('Butler.emailNotification.reloadTaskAborted.enable')) {
        // Check if the custom properties exist in the Qlik Sense environment
        try {
            const res1 = await getReloadTasksCustomProperties(config, configQRS, logger);
            logger.debug(
                `ASSERT CONFIG EMAIL: The following custom properties are available for reload tasks: ${JSON.stringify(res1, null, 2)}`,
            );

            if (
                res1.findIndex(
                    (cp) =>
                        cp.name === config.get('Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName'),
                ) === -1
            ) {
                logger.error(
                    `ASSERT CONFIG EMAIL: Custom property '${config.get(
                        'Butler.emailNotification.reloadTaskAborted.alertEnableByCustomProperty.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }

            if (
                res1.findIndex(
                    (cp) =>
                        cp.name === config.get('Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName'),
                ) === -1
            ) {
                logger.error(
                    `ASSERT CONFIG EMAIL: Custom property '${config.get(
                        'Butler.emailNotification.reloadTaskAborted.alertEnabledByEmailAddress.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG EMAIL: ${err}`);
        }
    }

    return true;
};

/**
 * Asserts that the InfluxDB related settings in the config file are valid
 *
 * @param {object} config - The configuration object.
 * @param {object} configQRS - The QRS configuration object.
 * @param {object} logger - The logger object.
 * @returns {Promise<boolean>} - Returns true if config file is valid, false otherwise.
 */
export const configFileInfluxDbAssert = async (config, configQRS, logger) => {
    // The custom property specified by
    // Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName
    // should be present on reload tasks in the Qlik Sense server

    // Only test if the feature in question is enabled in the config file
    if (
        config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enable') === true &&
        config.has('Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName') &&
        config.has('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue')
    ) {
        // Get custom property values
        try {
            const res1 = await getReloadTasksCustomProperties(config, configQRS, logger);
            logger.debug(
                `ASSERT CONFIG INFLUXDB: The following custom properties are available for reload tasks: ${JSON.stringify(res1, null, 2)}`,
            );

            // CEnsure that the CP name specified in the config file is found in the list of available CPs
            // CP name is case sensitive and found in the "name" property of the CP object
            if (
                res1.findIndex((cp) => cp.name === config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName')) ===
                -1
            ) {
                logger.error(
                    `ASSERT CONFIG INFLUXDB: Custom property '${config.get(
                        'Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName',
                    )}' not found in Qlik Sense. Aborting.`,
                );
                return false;
            }

            // Ensure that the CP value specified in the config file is found in the list of available CP values
            // CP value is case sensitive and found in the "choiceValues" array of the CP objects in res1
            const res2 = res1.filter(
                (cp) => cp.name === config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName'),
            )[0].choiceValues;
            logger.debug(
                `ASSERT CONFIG INFLUXDB: The following values are available for custom property '${config.get(
                    'Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName',
                )}': ${res2}`,
            );

            if (
                res2.findIndex((cpValue) => cpValue === config.get('Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue')) ===
                -1
            ) {
                logger.error(
                    `ASSERT CONFIG INFLUXDB: Custom property value '${config.get(
                        'Butler.influxDb.reloadTaskSuccess.byCustomProperty.enabledValue',
                    )}' not found for custom property '${config.get(
                        'Butler.influxDb.reloadTaskSuccess.byCustomProperty.customPropertyName',
                    )}'. Aborting.`,
                );
                return false;
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG INFLUXDB: ${err}`);
        }
    }
    return true;
};

/**
 * Verifies that the New Relic settings in the config file are correct.
 * Specifically, it checks that the custom property specified for New Relic
 * monitoring is present in Qlik Sense, and that the choice values of the custom
 * property match the values in Butler.thirdPartyToolsCredentials.newRelic.
 * @param {Config} config - The configuration object.
 * @param {Object} configQRS - The configuration object for QRS.
 * @param {Logger} logger - The logger instance.
 * @returns {Promise<boolean>} true if the settings are correct, false otherwise.
 */
export const configFileNewRelicAssert = async (config, configQRS, logger) => {
    // Set up shared Sense repository service configuration
    const cfg = {
        hostname: config.get('Butler.configQRS.host'),
        portNumber: config.get('Butler.configQRS.port'),
        certificates: {
            certFile: configQRS.certPaths.certPath,
            keyFile: configQRS.certPaths.keyPath,
        },
    };

    // Merge YAML-configured headers with hardcoded headers
    cfg.headers = {
        ...globals.getQRSHttpHeaders(),
        'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
    };

    const qrsInstance = new QrsClient(cfg);

    // ------------------------------------------
    // The custom property specified by
    // Butler.incidentToo.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName
    // should only include values present in the Butler.thirdPartyToolsCredentials.newRelic array

    // Only test if the feature in question is enabled in the config file
    if (
        config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable') &&
        config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable') &&
        config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName')
    ) {
        // Get custom property values
        try {
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: Custom property name: ${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );

            const result1 = await qrsInstance.Get(
                `custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                )}'`,
            );

            // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

            // If the custom property doesn't exist that's a problem..
            if (result1.body.length === 0) {
                logger.error(
                    `ASSERT CONFIG NEW RELIC: Custom property specified in config file ('${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                    )})' does not exist in Qlik Sense. Aborting.`,
                );
                return false;
            }

            // If there are no choiceValues that's a problem..
            if (
                result1.body[0].choiceValues === undefined ||
                result1.body[0].choiceValues === null ||
                result1.body[0].choiceValues.length === 0
            ) {
                logger.warn(
                    `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                    )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`,
                );
            } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                logger.warn(
                    `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for alert events, but no New Relic account(s) specified on either command line or in config file. Aborting,`,
                );
                return false;
            } else {
                // Test each custom property choice value for existence in Butler config file
                const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                // eslint-disable-next-line no-restricted-syntax
                for (const value of result1.body[0].choiceValues) {
                    if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                            )}' not found in Butler's config file`,
                        );
                    }
                }
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (
            config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable') &&
            config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable') &&
            !config.has(
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName',
            )
        ) {
            logger.error(
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName"`,
            );
            return false;
        }
    }

    // ------------------------------------------
    // The custom property specified by
    // Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName
    // should only include values present in the Butler.thirdPartyToolsCredentials.newRelic array

    // Only test if the feature in question is enabled in the config file
    if (
        config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.enable') &&
        config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.enable') &&
        config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName')
    ) {
        // Get custom property values
        try {
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: Custom property name: ${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );

            const result1 = await qrsInstance.Get(
                `custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                )}'`,
            );
            // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

            // If the custom property doesn't exist that's a problem..
            if (result1.body.length === 0) {
                logger.error(
                    `ASSERT CONFIG NEW RELIC: Custom property specified in config file ('${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                    )})' does not exist in Qlik Sense. Aborting.`,
                );
                return false;
            }

            // If there are no choiceValues that's a problem..
            if (
                result1.body[0].choiceValues === undefined ||
                result1.body[0].choiceValues === null ||
                result1.body[0].choiceValues.length === 0
            ) {
                logger.warn(
                    `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                    )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`,
                );
            } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                logger.error(
                    `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for failed reload alert logs, but no New Relic account(s) specified on either command line or in config file. Aborting,`,
                );
                return false;
            } else {
                // Test each custom property choice value for existence in Butler config file
                const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                // eslint-disable-next-line no-restricted-syntax
                for (const value of result1.body[0].choiceValues) {
                    if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                            )}' not found in Butler's config file`,
                        );
                    }
                }
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (
            config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.enable') &&
            config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.enable') &&
            !config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName')
        ) {
            logger.error(
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName"`,
            );
            return false;
        }
    }

    // ------------------------------------------
    // The custom property specified by
    // Butler.incidentToo.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName
    // should only include values present in the Butler.thirdPartyToolsCredentials.newRelic array

    // Only test if the feature in question is enabled in the config file
    if (
        config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable') &&
        config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable') &&
        config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName')
    ) {
        // Get custom property values
        try {
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: Custom property name: ${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );

            const result1 = await qrsInstance.Get(
                `custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                )}'`,
            );
            // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

            // If the custom property doesn't exist that's a problem..
            if (result1.body.length === 0) {
                logger.error(
                    `ASSERT CONFIG NEW RELIC: Custom property specified in config file ('${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                    )})' does not exist in Qlik Sense. Aborting.`,
                );
                return false;
            }

            // If there are no choiceValues that's a problem..
            if (
                result1.body[0].choiceValues === undefined ||
                result1.body[0].choiceValues === null ||
                result1.body[0].choiceValues.length === 0
            ) {
                logger.warn(
                    `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                    )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`,
                );
            } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                logger.warn(
                    `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for alert events, but no New Relic account(s) specified on either command line or in config file. Aborting,`,
                );
                return false;
            } else {
                // Test each custom property choice value for existence in Butler config file
                const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                // eslint-disable-next-line no-restricted-syntax
                for (const value of result1.body[0].choiceValues) {
                    if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
                            )}' not found in Butler's config file`,
                        );
                    }
                }
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (
            config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable') &&
            config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable') &&
            !config.has(
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName',
            )
        ) {
            logger.error(
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName"`,
            );
            return false;
        }
    }

    // ------------------------------------------
    // The custom property specified by
    // Butler.incidentToo.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName
    // should only include values present in the Butler.thirdPartyToolsCredentials.newRelic array

    // Only test if the feature in question is enabled in the config file
    if (
        config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.enable') &&
        config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.enable') &&
        config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName')
    ) {
        // Get custom property values
        try {
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: Custom property name: ${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                )}`,
            );

            const result1 = await qrsInstance.Get(
                `custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                )}'`,
            );
            // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

            // If the custom property doesn't exist that's a problem..
            if (result1.body.length === 0) {
                logger.error(
                    `ASSERT CONFIG NEW RELIC: Custom property specified in config file ('${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                    )})' does not exist in Qlik Sense. Aborting.`,
                );
                return false;
            }

            // If there are no choiceValues that's a problem..
            if (
                result1.body[0].choiceValues === undefined ||
                result1.body[0].choiceValues === null ||
                result1.body[0].choiceValues.length === 0
            ) {
                logger.warn(
                    `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                    )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`,
                );
            } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                logger.error(
                    `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for aborted reload alert logs, but no New Relic account(s) specified on either command line or in config file. Aborting,`,
                );
                return false;
            } else {
                // Test each custom property choice value for existence in Butler config file
                const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                // eslint-disable-next-line no-restricted-syntax
                for (const value of result1.body[0].choiceValues) {
                    if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName',
                            )}' not found in Butler's config file`,
                        );
                    }
                }
            }
        } catch (err) {
            logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (
            config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.enable') &&
            config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.enable') &&
            !config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName')
        ) {
            logger.error(
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName"`,
            );
            return false;
        }
    }

    return true;
};

/**
 * Verifies application-specific settings and relationships between configuration settings.
 *
 * This function performs validation beyond simple schema validation, specifically checking:
 * - If telemetry is enabled but system info gathering is disabled, this creates an incompatibility
 *   because telemetry relies on detailed system information for proper functionality
 *
 * @param {object} config - The configuration object to verify
 * @param {object} logger - The logger object for logging messages
 * @returns {Promise<boolean>} A promise that resolves to true if all checks pass, false otherwise
 */
export const configFileAppAssert = async (config, logger) => {
    // Check if anonymous telemetry is enabled (true by default if not specified)
    const telemetryConfigMissing = !config.has('Butler.anonTelemetry');
    const telemetryExplicitlyEnabled = config.has('Butler.anonTelemetry') && config.get('Butler.anonTelemetry') === true;
    const isTelemetryEnabled = telemetryConfigMissing || telemetryExplicitlyEnabled;

    const isSystemInfoEnabled = config.get('Butler.systemInfo.enable');

    // Validate compatibility between telemetry and system info gathering
    if (isTelemetryEnabled && !isSystemInfoEnabled) {
        const errorMsg = [
            'ASSERT CONFIG APP: Anonymous telemetry is enabled (Butler.anonTelemetry=true or missing)',
            'but system information gathering is disabled (Butler.systemInfo.enable=false).',
            'Telemetry requires system information to function properly.',
            'Either disable telemetry by setting Butler.anonTelemetry=false',
            'or enable system info gathering by setting Butler.systemInfo.enable=true. Exiting.',
        ].join(' ');

        logger.error(errorMsg);
        return false;
    }

    return true;
};

/**
 * Verifies that the config file has the correct structure, as defined by the Ajv schema
 * in src/lib/assert/config-file-schema.js. If the config file is valid, this function
 * does nothing. If the config file is invalid, this function logs the errors and exits
 * the process with a non-zero exit code.
 *

 * @returns {Promise<boolean>} true if the config file is valid, false otherwise
 * @throws {Error} if there is an error while trying to read the config file
 */
export async function configFileStructureAssert() {
    try {
        const ajv = new Ajv({
            strict: true,
            async: true,
            allErrors: true,
        });

        // Dynamically import ajv-keywords
        const ajvKeywords = await import('ajv-keywords');

        // Add keywords to ajv instance
        ajvKeywords.default(ajv);

        // Dynamically import ajv-formats
        const ajvFormats = await import('ajv-formats');

        // Add formats to ajv instance
        ajvFormats.default(ajv);

        // Load the YAML schema file, identified by globals.configFileExpanded, from file
        const fileContent = await fs.readFile(globals.configFileExpanded, 'utf8');

        // Parse the YAML file
        let parsedFileContent;
        try {
            parsedFileContent = load(fileContent);
        } catch (err) {
            throw new Error(`ASSERT CONFIG: Config file is not valid YAML: ${err}`);
        }

        // Validate the parsed YAML file against the schema
        const validate = ajv.compile(confifgFileSchema);
        const valid = await validate(parsedFileContent);

        if (!valid) {
            // Log the errors in validate.errors[] and exit
            // Each object in the error array has the following properties:
            // - instancePath: Textual path to the part of the data that triggered the error
            // - schemaPath: A JSON Pointer to the part of the schema that triggered the error
            // - keyword: The validation keyword that failed
            // - params: The parameters for the keyword
            // - message: The error message

            for (const error of validate.errors) {
                globals.logger.error(`VERIFY CONFIG FILE: ${error.instancePath} : ${error.message}`);
            }

            process.exit(1);
        }

        // ------------------------------
        // Verify values of specific config entries

        globals.logger.info(`VERIFY CONFIG FILE: Your config file at ${globals.configFileExpanded} is valid, good work!`);

        return true;
    } catch (err) {
        globals.logger.error(`VERIFY CONFIG FILE: ${err}`);

        return false;
    }
}

/**
 * Validates that required fields are present when their associated features are enabled.
 *
 * This function performs conditional validation that checks fields are present only when
 * the feature they belong to is enabled (when enable: true).
 *
 * @param {object} config - The configuration object to verify
 * @param {object} logger - The logger object for logging messages
 * @returns {Promise<boolean>} A promise that resolves to true if all checks pass, false otherwise
 */
export const configFileConditionalAssert = async (config, logger) => {
    try {
        // Validate configVisualisation fields when enabled
        if (config.has('Butler.configVisualisation.enable') && config.get('Butler.configVisualisation.enable')) {
            const requiredFields = [
                'Butler.configVisualisation.host',
                'Butler.configVisualisation.port',
                'Butler.configVisualisation.obfuscate',
            ];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when configVisualisation is enabled.`);
                    return false;
                }
            }
        }

        // Validate heartbeat fields when enabled
        if (config.has('Butler.heartbeat.enable') && config.get('Butler.heartbeat.enable')) {
            const requiredFields = ['Butler.heartbeat.remoteURL', 'Butler.heartbeat.frequency'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when heartbeat is enabled.`);
                    return false;
                }
            }
        }

        // Validate dockerHealthCheck fields when enabled
        if (config.has('Butler.dockerHealthCheck.enable') && config.get('Butler.dockerHealthCheck.enable')) {
            const requiredFields = ['Butler.dockerHealthCheck.port'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when dockerHealthCheck is enabled.`);
                    return false;
                }
            }
        }

        // Validate uptimeMonitor fields when enabled
        if (config.has('Butler.uptimeMonitor.enable') && config.get('Butler.uptimeMonitor.enable')) {
            const requiredFields = [
                'Butler.uptimeMonitor.frequency',
                'Butler.uptimeMonitor.logLevel',
                'Butler.uptimeMonitor.storeInInfluxdb',
                'Butler.uptimeMonitor.storeNewRelic',
            ];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when uptimeMonitor is enabled.`);
                    return false;
                }
            }

            // Validate storeNewRelic fields when enabled
            if (config.has('Butler.uptimeMonitor.storeNewRelic.enable') && config.get('Butler.uptimeMonitor.storeNewRelic.enable')) {
                const newRelicFields = [
                    'Butler.uptimeMonitor.storeNewRelic.destinationAccount',
                    'Butler.uptimeMonitor.storeNewRelic.url',
                    'Butler.uptimeMonitor.storeNewRelic.header',
                    'Butler.uptimeMonitor.storeNewRelic.metric',
                    'Butler.uptimeMonitor.storeNewRelic.attribute',
                ];
                for (const field of newRelicFields) {
                    if (!config.has(field)) {
                        logger.error(
                            `ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when uptimeMonitor.storeNewRelic is enabled.`,
                        );
                        return false;
                    }
                }
            }
        }

        // Validate scheduler fields when enabled
        if (config.has('Butler.scheduler.enable') && config.get('Butler.scheduler.enable')) {
            const requiredFields = ['Butler.scheduler.configfile'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when scheduler is enabled.`);
                    return false;
                }
            }
        }

        // Validate keyValueStore fields when enabled
        if (config.has('Butler.keyValueStore.enable') && config.get('Butler.keyValueStore.enable')) {
            const requiredFields = ['Butler.keyValueStore.maxKeysPerNamespace'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when keyValueStore is enabled.`);
                    return false;
                }
            }
        }

        // Validate mqttConfig fields when enabled
        if (config.has('Butler.mqttConfig.enable') && config.get('Butler.mqttConfig.enable')) {
            const requiredFields = ['Butler.mqttConfig.brokerHost', 'Butler.mqttConfig.brokerPort'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when mqttConfig is enabled.`);
                    return false;
                }
            }
        }

        // Validate emailNotification fields when enabled
        if (config.has('Butler.emailNotification.enable') && config.get('Butler.emailNotification.enable')) {
            const requiredFields = ['Butler.emailNotification.smtp'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when emailNotification is enabled.`);
                    return false;
                }
            }
        }

        // Validate slackNotification fields when enabled
        if (config.has('Butler.slackNotification.enable') && config.get('Butler.slackNotification.enable')) {
            const requiredFields = ['Butler.slackNotification.restMessage'];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when slackNotification is enabled.`);
                    return false;
                }
            }
        }

        // Validate teamsNotification fields when enabled
        if (config.has('Butler.teamsNotification.enable') && config.get('Butler.teamsNotification.enable')) {
            const requiredFields = [
                'Butler.teamsNotification.reloadTaskFailure.enable',
                'Butler.teamsNotification.reloadTaskAborted.enable',
            ];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(`ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when teamsNotification is enabled.`);
                    return false;
                }
            }
        }

        // Validate teamsNotification.reloadTaskFailure fields when enabled
        if (
            config.has('Butler.teamsNotification.reloadTaskFailure.enable') &&
            config.get('Butler.teamsNotification.reloadTaskFailure.enable')
        ) {
            const requiredFields = [
                'Butler.teamsNotification.reloadTaskFailure.webhookURL',
                'Butler.teamsNotification.reloadTaskFailure.messageType',
                'Butler.teamsNotification.reloadTaskFailure.basicMsgTemplate',
                'Butler.teamsNotification.reloadTaskFailure.rateLimit',
                'Butler.teamsNotification.reloadTaskFailure.headScriptLogLines',
                'Butler.teamsNotification.reloadTaskFailure.tailScriptLogLines',
                'Butler.teamsNotification.reloadTaskFailure.templateFile',
            ];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(
                        `ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when teamsNotification.reloadTaskFailure is enabled.`,
                    );
                    return false;
                }
            }
        }

        // Validate teamsNotification.reloadTaskAborted fields when enabled
        if (
            config.has('Butler.teamsNotification.reloadTaskAborted.enable') &&
            config.get('Butler.teamsNotification.reloadTaskAborted.enable')
        ) {
            const requiredFields = [
                'Butler.teamsNotification.reloadTaskAborted.webhookURL',
                'Butler.teamsNotification.reloadTaskAborted.messageType',
                'Butler.teamsNotification.reloadTaskAborted.basicMsgTemplate',
                'Butler.teamsNotification.reloadTaskAborted.rateLimit',
                'Butler.teamsNotification.reloadTaskAborted.headScriptLogLines',
                'Butler.teamsNotification.reloadTaskAborted.tailScriptLogLines',
                'Butler.teamsNotification.reloadTaskAborted.templateFile',
            ];
            for (const field of requiredFields) {
                if (!config.has(field)) {
                    logger.error(
                        `ASSERT CONFIG CONDITIONAL: Missing required field '${field}' when teamsNotification.reloadTaskAborted is enabled.`,
                    );
                    return false;
                }
            }
        }

        return true;
    } catch (err) {
        logger.error(`ASSERT CONFIG CONDITIONAL: ${err}`);
        return false;
    }
};
