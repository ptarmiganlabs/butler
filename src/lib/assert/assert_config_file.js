const QrsInteract = require('qrs-interact');

/**
 * Verify settings in the config file
 */
const configFileNewRelicAssert = async (config, configQRS, logger) => {
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
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            qrsInstance
                .Get(
                    `custompropertydefinition/full?filter=name eq '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                    )}'`
                )
                .then((result1) => {
                    // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

                    // If there are no choiceValues that's a problem..
                    if (
                        result1.body[0].choiceValues === undefined ||
                        result1.body[0].choiceValues === null ||
                        result1.body[0].choiceValues.length === 0
                    ) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                            )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`
                        );
                    } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                        // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for alert events, but no New Relic account(s) specified on either command line or in config file. Aborting,`
                        );
                        process.exit(1);
                    } else {
                        // Test each custom property choice value for existence in Butler config file
                        const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const value of result1.body[0].choiceValues) {
                            if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                                logger.warn(
                                    `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                                    )}' not found in Butler's config file`
                                );
                            }
                        }
                    }
                })
                .catch((err) => {
                    logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
                });
        } catch (err) {
            logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (
            config.has('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable') &&
            config.get('Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.enable') &&
            !config.has(
                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName'
            )
        ) {
            logger.error(
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.sendToAccount.byCustomProperty.customPropertyName"`
            );
            process.exit(1);
        }
    }

    // ------------------------------------------
    // The custom property specified by
    // Butler.incidentToo.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName
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
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            qrsInstance
                .Get(
                    `custompropertydefinition/full?filter=name eq '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                    )}'`
                )
                .then((result1) => {
                    // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

                    // If there are no choiceValues that's a problem..
                    if (
                        result1.body[0].choiceValues === undefined ||
                        result1.body[0].choiceValues === null ||
                        result1.body[0].choiceValues.length === 0
                    ) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                            )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`
                        );
                    } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                        // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                        logger.error(
                            `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for alert logs, but no New Relic account(s) specified on either command line or in config file. Aborting,`
                        );
                        process.exit(1);
                    } else {
                        // Test each custom property choice value for existence in Butler config file
                        const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const value of result1.body[0].choiceValues) {
                            if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                                logger.warn(
                                    `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                                    )}' not found in Butler's config file`
                                );
                            }
                        }
                    }
                })
                .catch((err) => {
                    logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
                });
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
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.sendToAccount.byCustomProperty.customPropertyName"`
            );
            process.exit(1);
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
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            qrsInstance
                .Get(
                    `custompropertydefinition/full?filter=name eq '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                    )}'`
                )
                .then((result1) => {
                    // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

                    // If there are no choiceValues that's a problem..
                    if (
                        result1.body[0].choiceValues === undefined ||
                        result1.body[0].choiceValues === null ||
                        result1.body[0].choiceValues.length === 0
                    ) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                            )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`
                        );
                    } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                        // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for alert events, but no New Relic account(s) specified on either command line or in config file. Aborting,`
                        );
                        process.exit(1);
                    } else {
                        // Test each custom property choice value for existence in Butler config file
                        const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const value of result1.body[0].choiceValues) {
                            if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                                logger.warn(
                                    `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName'
                                    )}' not found in Butler's config file`
                                );
                            }
                        }
                    }
                })
                .catch((err) => {
                    logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
                });
        } catch (err) {
            logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
        }
    } else {
        // eslint-disable-next-line no-lonely-if
        if (
            config.has('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable') &&
            config.get('Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.enable') &&
            !config.has(
                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName'
            )
        ) {
            logger.error(
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.sendToAccount.byCustomProperty.customPropertyName"`
            );
            process.exit(1);
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
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            logger.debug(
                `ASSERT CONFIG NEW RELIC 1: custompropertydefinition/full?filter=name eq '${config.get(
                    'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                )}`
            );
            qrsInstance
                .Get(
                    `custompropertydefinition/full?filter=name eq '${config.get(
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                    )}'`
                )
                .then((result1) => {
                    // The choice values of the custom property should match the values in Butler.thirdPartyToolsCredentials.newRelic

                    // If there are no choiceValues that's a problem..
                    if (
                        result1.body[0].choiceValues === undefined ||
                        result1.body[0].choiceValues === null ||
                        result1.body[0].choiceValues.length === 0
                    ) {
                        logger.warn(
                            `ASSERT CONFIG NEW RELIC: Custom property '${config.get(
                                'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                            )}' does not have any values associated with it. New Relic monitoring may not work as a result of this.`
                        );
                    } else if (config.get('Butler.thirdPartyToolsCredentials.newRelic') === null) {
                        // New Relic account specified as destination for events, but no account(s) specified in config file or on command line
                        logger.error(
                            `ASSERT CONFIG NEW RELIC: New Relic is set as a destination for alert logs, but no New Relic account(s) specified on either command line or in config file. Aborting,`
                        );
                        process.exit(1);
                    } else {
                        // Test each custom property choice value for existence in Butler config file
                        const availableNewRelicAccounts = config.get('Butler.thirdPartyToolsCredentials.newRelic');

                        // eslint-disable-next-line no-restricted-syntax
                        for (const value of result1.body[0].choiceValues) {
                            if (availableNewRelicAccounts.findIndex((account) => value === account.accountName) === -1) {
                                logger.warn(
                                    `ASSERT CONFIG NEW RELIC: New Relic account name '${value}' of custom property '${config.get(
                                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName'
                                    )}' not found in Butler's config file`
                                );
                            }
                        }
                    }
                })
                .catch((err) => {
                    logger.error(`ASSERT CONFIG NEW RELIC: ${err}`);
                });
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
                `ASSERT CONFIG NEW RELIC: Missing config file entry "Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.sendToAccount.byCustomProperty.customPropertyName"`
            );
            process.exit(1);
        }
    }
};

module.exports = {
    configFileNewRelicAssert,
};
