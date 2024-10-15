import QrsInteract from 'qrs-interact';
import { load } from 'js-yaml';
import fs from 'fs/promises';
import { default as Ajv } from 'ajv';

import { getReloadTasksCustomProperties } from '../../qrs_util/task_cp_util.js';
import { confifgFileSchema } from './config-file-schema.js';
import globals from '../../globals.js';

// Verify QS related settings in the config file
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

// Verify email specic settings in the config file
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
            logger.debug(`ASSERT CONFIG EMAIL: The following custom properties are available for reload tasks: ${res1}`);

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
            logger.debug(`ASSERT CONFIG EMAIL: The following custom properties are available for reload tasks: ${res1}`);

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
            logger.debug(`ASSERT CONFIG EMAIL: The following custom properties are available for reload tasks: ${res1}`);

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

// Veriify InfluxDb related settings in the config file
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
            logger.debug(`ASSERT CONFIG INFLUXDB: The following custom properties are available for reload tasks: ${res1}`);

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
 * Verify New Relic settings in the config file
 */
export const configFileNewRelicAssert = async (config, configQRS, logger) => {
    // Set up shared Sense repository service configuration
    const cfg = {
        hostname: config.get('Butler.configQRS.host'),
        portNumber: 4242,
        certificates: {
            certFile: configQRS.certPaths.certPath,
            keyFile: configQRS.certPaths.keyPath,
        },
    };

    cfg.headers = {
        'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
    };

    const qrsInstance = new QrsInteract(cfg);

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

// Function to verify that config file has the correct format
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
