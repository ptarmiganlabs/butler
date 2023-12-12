const { exec } = require('child_process');

/**
 * Get all names of services installed
 * @param {object} logger Logger object
 * @param {string} host Host from which to get services
 */
function all(logger, host = null) {
    // If host is not specified, use services on localhost

    // Create promise
    return new Promise((resolveAll, rejectAll) => {
        let command = '';

        if (host === null) {
            // Run command for get states of all services on local machine
            logger.verbose('WINSVC ALL: Getting all services on local machine');
            command = 'sc.exe query state= all';
        } else {
            // A host other that local machine is specfied
            logger.verbose(`WINSVC ALL: Getting all services on host ${host}`);
            command = `sc.exe \\\\${host} query state= all`;
        }

        logger.debug(`WINSVC ALL: Running command ${command}`);
        exec(command, (err, stdout) => {
            // On error, reject and exit
            if (err) {
                logger.error(`WINSVC ALL: Error while getting all services on host ${host}`);

                if (err.code) {
                    logger.error(`WINSVC ALL: Error code: ${err.code}`);
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

            logger.verbose(`WINSVC ALL: Got all services on host ${host}`);
            logger.verbose(lines);

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
 */
function exists(logger, serviceName, host = null) {
    // If host is not specified, use services on localhost

    // Create promise
    return new Promise((resolveExists, rejectExists) => {
        // With invalid service name, reject
        if (!serviceName) {
            logger.error('WINSVC EXISTS: Service name is invalid');

            rejectExists(new Error('Service name is invalid'));
            return;
        }

        // Is host reachable?

        // Get all services
        logger.verbose(`WINSVC EXISTS: Getting all services on host ${host}`);
        all(logger, host).then(
            // On success, check
            (allServices) => {
                logger.verbose(`WINSVC EXISTS: Checking if service ${serviceName} exists on host ${host}`);
                // Find provided name
                for (let i = 0; i < allServices.length; ) {
                    logger.silly(`WINSVC EXISTS: Checking if service "${serviceName}" equals "${allServices[i]}"...`);

                    if (allServices[i] === serviceName) {
                        // Found, resolve true
                        logger.verbose(`WINSVC EXISTS: Found! Service ${serviceName} exists on host ${host}`);

                        resolveExists(true);
                        return;
                    }

                    i += 1;
                }

                // Not found, resolve false
                logger.verbose(`WINSVC EXISTS: Not found! Service ${serviceName} does not exists on host ${host}`);
                resolveExists(false);
            },

            // Reject on error
            (err) => {
                logger.error(`WINSVC EXISTS: Error while getting all services on host ${host}`);
                if (err.code) {
                    logger.error(`WINSVC EXISTS: Error code: ${err.code}`);
                }

                rejectExists(err);
            }
        );
    });
}

/**
 * Get status of provided service
 * @param {object} logger Logger object
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 */
function status(logger, serviceName, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            logger.error('WINSVC STATUS: Service name is invalid');

            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(logger, serviceName, host).then(
            (alreadyExists) => {
                // serviceName exists on host
                logger.verbose(`WINSVC STATUS: Service ${serviceName} exists on host ${host}`);

                // If exists, reject
                if (!alreadyExists) {
                    logger.verbose(`WINSVC STATUS: Service ${serviceName} does not exists on host ${host}`);

                    reject(new Error(`Service with name '${serviceName}' does not exists`));
                    return;
                }

                let command = '';
                if (host === null) {
                    // Run command for get states of all services on local machine
                    logger.verbose(`WINSVC STATUS: Getting status of service ${serviceName} on local machine`);
                    command = `sc.exe query "${serviceName}"`;
                } else {
                    // A host other that local machine is specfied
                    logger.verbose(`WINSVC STATUS: Getting status of service ${serviceName} on host ${host}`);
                    command = `sc.exe \\\\${host} query "${serviceName}"`;
                }

                // Run command for create service with provided data
                logger.debug(`WINSVC STATUS: Running command ${command}`);
                exec(command, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        logger.error(`WINSVC STATUS: Error while getting status of service ${serviceName} on host ${host}`);
                        if (err.code) {
                            logger.error(`WINSVC STATUS: Error code: ${err.code}`);
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
                    logger.verbose(`WINSVC STATUS: Service ${serviceName} is ${stateName} on host ${host}`);
                    resolve(stateName);
                });
            },

            // Reject on error
            (err) => {
                logger.error(`WINSVC STATUS: Error while getting status of service ${serviceName} on host ${host}`);
                if (err.code) {
                    logger.error(`WINSVC STATUS: Error code: ${err.code}`);
                }

                reject(err);
            }
        );
    });
}

/**
 * Get the details of provided service
 * @param {object} logger Logger object
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 */
function details(logger, serviceName, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            logger.error('WINSVC DETAILS: Service name is invalid');

            reject(new Error('Service name is invalid'));
            return;
        }

        // Run check for service existance
        logger.verbose(`WINSVC DETAILS: Checking if service ${serviceName} exists on host ${host}`);
        exists(logger, serviceName, host).then(
            // Existance check completed
            (alreadyExists) => {
                // Service exists
                logger.verbose(`WINSVC DETAILS: Found! Service ${serviceName} exists on host ${host}`);

                // If exists, reject
                if (!alreadyExists) {
                    logger.verbose(`WINSVC DETAILS: Not found! Service ${serviceName} does not exists on host ${host}`);

                    reject(new Error(`Service with name '${serviceName}' does not exists`));
                    return;
                }

                let command = '';
                if (host === null) {
                    // Run command for get states of all services on local machine
                    logger.verbose(`WINSVC DETAILS: Getting details of service ${serviceName} on local machine`);

                    command = `sc.exe qc "${serviceName}"`;
                } else {
                    // A host other that local machine is specfied
                    logger.verbose(`WINSVC DETAILS: Getting details of service ${serviceName} on host ${host}`);

                    command = `sc.exe \\\\${host} qc "${serviceName}"`;
                }

                // Run command to get service details with provided data
                logger.debug(`WINSVC DETAILS: Running command ${command}`);
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
                        logger.error(`WINSVC DETAILS: Error while getting details of service ${serviceName} on host ${host}`);
                        if (err.code) {
                            logger.error(`WINSVC DETAILS 1: Error code: ${err.code}`);
                        }

                        reject(err);
                        return;
                    }

                    const lines = stdout.toString().split('\r\n');
                    // Debug log lines
                    logger.debug(`WINSVC DETAILS: Lines: ${lines}`);

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
                    logger.verbose(`WINSVC DETAILS: Service ${serviceName} is ${startTypeName} on host ${host}`);
                    logger.verbose(`WINSVC DETAILS: Service ${serviceName} has dependencies ${deps}`);
                    logger.verbose(
                        `WINSVC DETAILS: Service ${serviceName} has exe path ${lines
                            .find((line) => line.indexOf('BINARY_PATH_NAME') !== -1)
                            .replace(/\s*BINARY_PATH_NAME\s*: /, '')}`
                    );
                    logger.verbose(
                        `WINSVC DETAILS: Service ${serviceName} has display name ${lines
                            .find((line) => line.indexOf('DISPLAY_NAME') !== -1)
                            .replace(/\s*DISPLAY_NAME\s*: /, '')}`
                    );
                    logger.verbose(
                        `WINSVC DETAILS: Service ${serviceName} has name ${lines
                            .find((line) => line.indexOf('SERVICE_NAME: ') !== -1)
                            .replace('SERVICE_NAME: ', '')}`
                    );

                    resolve({
                        name: lines.find((line) => line.indexOf('SERVICE_NAME: ') !== -1).replace('SERVICE_NAME: ', ''),
                        displayName: lines.find((line) => line.indexOf('DISPLAY_NAME') !== -1).replace(/\s*DISPLAY_NAME\s*: /, ''),
                        startType: startTypeName,
                        exePath: lines.find((line) => line.indexOf('BINARY_PATH_NAME') !== -1).replace(/\s*BINARY_PATH_NAME\s*: /, ''),
                        dependencies: deps,
                    });
                });
            },

            // Reject on error
            (err) => {
                logger.error(`WINSVC DETAILS: Error while getting details of service ${serviceName} on host ${host}`);
                if (err.code) {
                    logger.error(`WINSVC DETAILS 2: Error code: ${err.code}`);
                }

                reject(err);
            }
        );
    });
}

// Module schema
module.exports = {
    all,
    details,
    exists,
    status,
};
