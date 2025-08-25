import { exec } from 'child_process';

/**
 * Get all names of services installed
 * @param {object} logger Logger object
 * @param {string} host Host from which to get services
 * @returns {Promise<string[]>} Promise resolving to an array of service names
 */
export function all(logger, host = null) {
    // If host is not specified, use services on localhost

    // Create promise
    return new Promise((resolveAll, rejectAll) => {
        let command = '';

        if (host === null) {
            // Run command for get states of all services on local machine
            logger.verbose('[QSEOW] WINSVC ALL: Getting all services on local machine');
            command = 'sc.exe query state= all';
        } else {
            // A host other that local machine is specfied
            logger.verbose(`[QSEOW] WINSVC ALL: Getting all services on host ${host}`);
            command = `sc.exe \\\\${host} query state= all`;
        }

        logger.debug(`[QSEOW] WINSVC ALL: Running command ${command}`);
        exec(command, (err, stdout) => {
            // On error, reject and exit
            if (err) {
                logger.error(`[QSEOW] WINSVC ALL: Error while getting all services on host ${host}`);

                if (err.code) {
                    logger.error(`[QSEOW] WINSVC ALL: Error code: ${err.code}`);
                }

                if (stdout) {
                    rejectAll(stdout);
                    return;
                }
                rejectAll(err);
                return;
            }

            // Get all lines on standard output, take only
            // lines with "SERVICE_NAME" and remove extra parts
            const lines = stdout
                .toString()
                .split('\r\n')
                .filter((line) => line.indexOf('SERVICE_NAME') !== -1)
                .map((line) => line.replace('SERVICE_NAME: ', ''));

            logger.verbose(`[QSEOW] WINSVC ALL: Got all ${lines.length} services on host ${host}`);
            logger.debug(lines);

            // Resolve with array of service names
            resolveAll(lines);
        });
    });
}

/**
 * Check if provided service name exists
 * @param {object} logger Logger object
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 * @returns {Promise<boolean>} Promise resolving to true if service exists, false otherwise
 */
export function exists(logger, serviceName, host = null) {
    // If host is not specified, use services on localhost

    // Create promise
    return new Promise((resolveExists, rejectExists) => {
        // With invalid service name, reject
        if (!serviceName) {
            logger.error('[QSEOW] WINSVC EXISTS: Service name is invalid');

            rejectExists(new Error('Service name is invalid'));
            return;
        }

        // Is host reachable?

        // Get all services
        logger.verbose(`[QSEOW] WINSVC EXISTS: Getting all services on host ${host}`);
        all(logger, host).then(
            // On success, check
            (allServices) => {
                logger.verbose(`[QSEOW] WINSVC EXISTS: Checking if service ${serviceName} exists on host ${host}`);
                // Find provided name
                for (let i = 0; i < allServices.length; ) {
                    logger.silly(`[QSEOW] WINSVC EXISTS: Checking if service "${serviceName}" equals "${allServices[i]}"...`);

                    if (allServices[i] === serviceName) {
                        // Found, resolve true
                        logger.verbose(`[QSEOW] WINSVC EXISTS: Found! Service ${serviceName} exists on host ${host}`);

                        resolveExists(true);
                        return;
                    }

                    i += 1;
                }

                // Not found, resolve false
                logger.verbose(`[QSEOW] WINSVC EXISTS: Not found! Service ${serviceName} does not exists on host ${host}`);
                resolveExists(false);
            },

            // Reject on error
            (err) => {
                logger.error(`[QSEOW] WINSVC EXISTS: Error while getting all services on host ${host}`);
                if (err.code) {
                    logger.error(`[QSEOW] WINSVC EXISTS: Error code: ${err.code}`);
                }

                rejectExists(err);
            },
        );
    });
}

/**
 * Get status of all services on a host
 * @param {object} logger Logger object
 * @param {string} host Host on which service is running
 * @returns {Promise<object[]>} Promise resolving to an array of service status objects
 */
export function statusAll(logger, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // If host is not specified, get services on localhost
        let command = '';

        if (host === null) {
            // Run command for get states of all services on local machine
            logger.verbose('[QSEOW] WINSVC STATUSALL: Getting status of all services on local machine');
            command = 'sc.exe query state= all';
        } else {
            // A host other that local machine is specfied
            logger.verbose(`[QSEOW] WINSVC STATUSALL: Getting status of all services on host ${host}`);
            command = `sc.exe \\\\${host} query state= all`;
        }

        // Run command for create service with provided data
        logger.debug(`[QSEOW] WINSVC STATUSALL: Running command ${command}`);
        exec(command, (err, stdout) => {
            // On error, reject and exit
            if (err) {
                logger.error(`[QSEOW] WINSVC STATUSALL: Error while getting status of all services on host ${host}`);
                if (err.code) {
                    logger.error(`[QSEOW] WINSVC STATUSALL: Error code: ${err.code}`);
                }

                reject(err);
                return;
            }

            // Create temporary stdout variable
            let stdoutTmp = stdout;

            // Remove first line, if it is empty
            if (stdoutTmp.toString().split('\r\n')[0] === '') {
                stdoutTmp = stdoutTmp.toString().split('\r\n').slice(1).join('\r\n');
            }

            // Each service block starts with SERVICE_NAME and ends with an empty line
            // Split stdout into blocks of services
            // Create object from each block, then add objects to array of services
            const serviceStatusAll = stdoutTmp
                .toString()
                .split('\r\n\r\n')
                // Filter out any empty blocks or blocks lacking required markers
                .filter((block) => block && block.indexOf('SERVICE_NAME') !== -1)
                .map((block) => {
                    const lines = block.split('\r\n');
                    // The state line has format "<statenum><one or more spaces><statetext>"
                    // Extract stateNum and stateText from state line, to separate properties
                    const service = {
                        name: lines.find((line) => line.indexOf('SERVICE_NAME') !== -1).replace('SERVICE_NAME: ', ''),
                        displayName: lines.find((line) => line.indexOf('DISPLAY_NAME') !== -1).replace(/\s*DISPLAY_NAME\s*: /, ''),
                        type: lines.find((line) => line.indexOf('TYPE') !== -1).replace(/\s*TYPE\s*: /, ''),
                        stateNum: lines
                            .find((line) => line.indexOf('STATE') !== -1)
                            .replace('STATE', '')
                            .replace(/\s*:\s*/, '')
                            .split(' ')[0],
                        stateText: lines
                            .find((line) => line.indexOf('STATE') !== -1)
                            .replace('STATE', '')
                            .replace(/\s*:\s*/, '')
                            .split(' ')[2],
                        win32ExitCode: lines.find((line) => line.indexOf('WIN32_EXIT_CODE') !== -1).replace(/\s*WIN32_EXIT_CODE\s*: /, ''),
                        serviceExitCode: lines
                            .find((line) => line.indexOf('SERVICE_EXIT_CODE') !== -1)
                            .replace(/\s*SERVICE_EXIT_CODE\s*: /, ''),
                    };

                    return service;
                });

            logger.verbose(`[QSEOW] WINSVC STATUSALL: Got status of all services on host ${host}`);
            logger.debug(serviceStatusAll);

            // Resolve with array of service objects
            resolve(serviceStatusAll);
        });
    });
}

/**
 * Get status of a specific service on a host
 * It is assumed that the service exists.
 * @param {object} logger Logger object
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 * @returns {Promise<string>} Promise resolving to the state name of the service
 */
export function status(logger, serviceName, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            logger.error('[QSEOW] WINSVC STATUS: Service name is invalid');

            reject(new Error('Service name is invalid'));
            return;
        }

        // // Check existence
        // exists(logger, serviceName, host).then(
        //     (alreadyExists) => {
        //         // serviceName exists on host
        //         logger.verbose(`[QSEOW] WINSVC STATUS: Service ${serviceName} exists on host ${host}`);

        //         // If exists, reject
        //         if (!alreadyExists) {
        //             logger.verbose(`[QSEOW] WINSVC STATUS: Service ${serviceName} does not exists on host ${host}`);

        //             reject(new Error(`Service with name '${serviceName}' does not exists`));
        //             return;
        //         }

        let command = '';
        if (host === null) {
            // Run command for get states of all services on local machine
            logger.debug(`[QSEOW] WINSVC STATUS: Getting status of service ${serviceName} on local machine`);
            command = `sc.exe query "${serviceName}"`;
        } else {
            // A host other that local machine is specfied
            logger.debug(`[QSEOW] WINSVC STATUS: Getting status of service ${serviceName} on host ${host}`);
            command = `sc.exe \\\\${host} query "${serviceName}"`;
        }

        // Run command for create service with provided data
        logger.debug(`[QSEOW] WINSVC STATUS: Running command ${command}`);
        exec(command, (err, stdout) => {
            // On error, reject and exit
            if (err) {
                logger.error(`[QSEOW] WINSVC STATUS: Error while getting status of service ${serviceName} on host ${host}`);
                if (err.code) {
                    logger.error(`[QSEOW] WINSVC STATUS: Error code: ${err.code}`);
                }

                reject(err);
                return;
            }

            // Get all lines on standard output, take only
            // lines with "STATE" and remove extra parts
            const lines = stdout
                .toString()
                .split('\r\n')
                .filter((line) => line.indexOf('STATE') !== -1);

            // Split "STOPPED" o "RUNNING"
            const stateName = lines[0].indexOf('STOPPED') !== -1 ? 'STOPPED' : 'RUNNING';

            // Return state name
            logger.verbose(`[QSEOW] WINSVC STATUS: Service ${serviceName} is ${stateName} on host ${host}`);
            resolve(stateName);
        });
        // },

        // // Reject on error
        // (err) => {
        //     logger.error(`[QSEOW] WINSVC STATUS: Error while getting status of service ${serviceName} on host ${host}`);
        //     if (err.code) {
        //         logger.error(`[QSEOW] WINSVC STATUS: Error code: ${err.code}`);
        //     }

        //     reject(err);
        // }
        // );
    });
}

/**
 * Get the details of provided service
 * It is assumed that the service exists.
 * @param {object} logger Logger object
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 * @returns {Promise<object>} Promise resolving to an object containing service details
 */
export function details(logger, serviceName, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            logger.error('[QSEOW] WINSVC DETAILS: Service name is invalid');

            reject(new Error('Service name is invalid'));
            return;
        }

        // Run check for service existance
        // logger.verbose(`[QSEOW] WINSVC DETAILS: Checking if service ${serviceName} exists on host ${host}`);
        // exists(logger, serviceName, host).then(
        //     // Existance check completed
        //     (alreadyExists) => {
        //         // Service exists
        //         logger.verbose(`[QSEOW] WINSVC DETAILS: Found! Service ${serviceName} exists on host ${host}`);

        //         // If exists, reject
        //         if (!alreadyExists) {
        //             logger.verbose(`[QSEOW] WINSVC DETAILS: Not found! Service ${serviceName} does not exists on host ${host}`);

        //             reject(new Error(`Service with name '${serviceName}' does not exists`));
        //             return;
        //         }

        let command = '';
        if (host === null) {
            // Run command for get states of all services on local machine
            logger.debug(`[QSEOW] WINSVC DETAILS: Getting details of service ${serviceName} on local machine`);

            command = `sc.exe qc "${serviceName}"`;
        } else {
            // A host other that local machine is specfied
            logger.debug(`[QSEOW] WINSVC DETAILS: Getting details of service ${serviceName} on host ${host}`);

            command = `sc.exe \\\\${host} qc "${serviceName}"`;
        }

        // Run command to get service details with provided data
        logger.debug(`[QSEOW] WINSVC DETAILS: Running command ${command}`);
        exec(command, (err, stdout) => {
            let i = 0;
            const startTypeRegex = /\d/;
            const dependenciesRegex = /(?<=\s*DEPENDENCIES)(\s*:.*\r\n)*/;

            const deps = dependenciesRegex.exec(stdout)[0].toString().split('\r\n');

            for (i = 0; i < deps.length; ) {
                deps[i] = deps[i].replace(/\s*: /, '');
                if (deps[i] === '') {
                    deps.splice(i, 1);
                }
                i += 1;
            }

            // On error, reject and exit
            if (err) {
                logger.error(`[QSEOW] WINSVC DETAILS: Error while getting details of service ${serviceName} on host ${host}`);
                if (err.code) {
                    logger.error(`[QSEOW] WINSVC DETAILS 1: Error code: ${err.code}`);
                }

                reject(err);
                return;
            }

            const lines = stdout.toString().split('\r\n');
            // Debug log lines
            logger.debug(`[QSEOW] WINSVC DETAILS: Lines: ${lines}`);

            let startTypeName = '';

            switch (startTypeRegex.exec(lines.find((line) => line.indexOf('START_TYPE') !== -1))[0]) {
                case '2':
                    startTypeName = 'Automatic';
                    break;
                case '3':
                    startTypeName = 'Manual';
                    break;
                case '4':
                    startTypeName = 'Disabled';
                    break;
                default:
                    return;
            }

            // Show all details that will be returned
            logger.verbose(`[QSEOW] WINSVC DETAILS: Service ${serviceName} is ${startTypeName} on host ${host}`);
            logger.verbose(`[QSEOW] WINSVC DETAILS: Service ${serviceName} has dependencies ${deps}`);
            logger.verbose(
                `[QSEOW] WINSVC DETAILS: Service ${serviceName} has exe path ${lines
                    .find((line) => line.indexOf('BINARY_PATH_NAME') !== -1)
                    .replace(/\s*BINARY_PATH_NAME\s*: /, '')}`,
            );
            logger.verbose(
                `[QSEOW] WINSVC DETAILS: Service ${serviceName} has display name ${lines
                    .find((line) => line.indexOf('DISPLAY_NAME') !== -1)
                    .replace(/\s*DISPLAY_NAME\s*: /, '')}`,
            );
            logger.verbose(
                `[QSEOW] WINSVC DETAILS: Service ${serviceName} has name ${lines
                    .find((line) => line.indexOf('SERVICE_NAME: ') !== -1)
                    .replace('SERVICE_NAME: ', '')}`,
            );

            resolve({
                name: lines.find((line) => line.indexOf('SERVICE_NAME: ') !== -1).replace('SERVICE_NAME: ', ''),
                displayName: lines.find((line) => line.indexOf('DISPLAY_NAME') !== -1).replace(/\s*DISPLAY_NAME\s*: /, ''),
                startType: startTypeName,
                exePath: lines.find((line) => line.indexOf('BINARY_PATH_NAME') !== -1).replace(/\s*BINARY_PATH_NAME\s*: /, ''),
                dependencies: deps,
            });
        });
        // },

        // // Reject on error
        // (err) => {
        //     logger.error(`[QSEOW] WINSVC DETAILS: Error while getting details of service ${serviceName} on host ${host}`);
        //     if (err.code) {
        //         logger.error(`[QSEOW] WINSVC DETAILS 2: Error code: ${err.code}`);
        //     }

        //     reject(err);
        // }
        // );
    });
}
