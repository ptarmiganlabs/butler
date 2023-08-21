const { exec } = require('child_process');

/**
 * Get all names of services installed
 * @param {string} host Host from which to get services
 */
function all(host = null) {
    // If host is not specified, use services on localhost

    // Create promise
    return new Promise((resolve, reject) => {
        let command = '';
        if (host === null) {
            // Run command for get states of all services on local machine
            command = 'sc.exe query state= all';
        } else {
            // A host other that local machine is specfied
            command = `sc.exe \\\\${host} query state= all`;
        }

        exec(command, (err, stdout) => {
            // On error, reject and exit
            if (err) {
                reject(err);
                return;
            }

            // Get all lines on standard output, take only
            // lines with "SERVICE_NAME" and remove extra parts
            const lines = stdout
                .toString()
                .split('\r\n')
                .filter((line) => line.indexOf('SERVICE_NAME') !== -1)
                .map((line) => line.replace('SERVICE_NAME: ', ''));

            // Resolve with array of service names
            resolve(lines);
        });
    });
}

/**
 * Check if provided service name exists
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 */
function exists(serviceName, host = null) {
    // If host is not specified, use services on localhost

    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Get all services
        all(host).then(
            // On success, check
            (allServices) => {
                // Find provided name
                for (let i = 0; i < allServices.length; ) {
                    if (allServices[i] === serviceName) {
                        resolve(true);
                    }

                    i += 1;
                }

                // Not found, resolve false
                resolve(false);
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}

/**
 * Get status of provided service
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 */
function status(serviceName, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(serviceName, host).then(
            // Existence check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(new Error(`Service with name '${serviceName}' does not exists`));
                }

                let command = '';
                if (host === null) {
                    // Run command for get states of all services on local machine
                    command = `sc.exe query "${serviceName}"`;
                } else {
                    // A host other that local machine is specfied
                    command = `sc.exe \\\\${host} query "${serviceName}"`;
                }

                // Run command for create service with provided data
                exec(command, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        return reject(err);
                    }

                    // Get all lines on standard output, take only
                    // lines with "STATE" and remove extra parts
                    const lines = stdout
                        .toString()
                        .split('\r\n')
                        .filter((line) => line.indexOf('STATE') !== -1);

                    // Split "STOPPED" o "RUNNING"
                    const stateName = lines[0].indexOf('STOPPED') !== -1 ? 'STOPPED' : 'RUNNING';

                    // Get state name
                    return resolve(stateName);
                });
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}

/**
 * Get the details of provided service
 * @param {string} serviceName Name of service
 * @param {string} host Host on which service is running
 */
function details(serviceName, host = null) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Run check for service existance
        exists(serviceName, host).then(
            // Existance check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(new Error(`Service with name '${serviceName}' does not exists`));
                }

                let command = '';
                if (host === null) {
                    // Run command for get states of all services on local machine
                    command = `sc.exe qc "${serviceName}"`;
                } else {
                    // A host other that local machine is specfied
                    command = `sc.exe \\\\${host} qc "${serviceName}"`;
                }

                // Run command to get service details with provided data
                exec(command, (err, stdout) => {
                    let i = 0;
                    const startTypeRegex = new RegExp(/\d/);
                    const dependenciesRegex = new RegExp(/(?<=\s*DEPENDENCIES)(\s*:.*\r\n)*/);

                    const deps = dependenciesRegex.exec(stdout)[0].toString().split('\r\n');

                    for (i = 0; i < deps.length; ++i) {
                        deps[i] = deps[i].replace(/\s*: /, '');
                        if (deps[i] === '') {
                            deps.splice(i, 1);
                        }
                    }

                    // On error, reject and exit
                    if (err) {
                        return reject(err);
                    }

                    const lines = stdout.toString().split('\r\n');

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
                            return 'Unknown';
                    }

                    return resolve({
                        name: lines.find((line) => line.indexOf('SERVICE_NAME: ') !== -1).replace('SERVICE_NAME: ', ''),

                        displayName: lines.find((line) => line.indexOf('DISPLAY_NAME') !== -1).replace(/\s*DISPLAY_NAME\s*: /, ''),

                        startType: startTypeName,

                        exePath: lines.find((line) => line.indexOf('BINARY_PATH_NAME') !== -1).replace(/\s*BINARY_PATH_NAME\s*: /, ''),

                        dependencies: deps,
                    });
                });
            },

            // Reject on error
            (err) => reject(err)
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
