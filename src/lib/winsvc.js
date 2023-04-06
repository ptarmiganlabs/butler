const { exec } = require('child_process');


/**
 * Check if provided service name exists
 * @param {string} serviceName Name of service
 */
function exists(serviceName) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Get all services
        all().then(
            // On success, check
            (allServices) => {
                // Find provided name
                for (let i = 0; i < allServices.length; i++) {
                    if (allServices[i] == serviceName) {
                        resolve(true);
                    }
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
 * Get status of provided service on local machine
 * @param {string} serviceName Name of service
 */
function status(serviceName) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(serviceName).then(
            // Existence check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(`Service with name '${serviceName}' does not exists`);
                }

                // Run command for create service with provided data
                exec(`sc.exe query "${serviceName}"`, (err, stdout) => {
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
 * Get the details of provided service on local machine
 * @param {string} serviceName Name of service
 */
function details(serviceName) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Run check for service existance
        exists(serviceName).then(
            // Existance check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(`Service with name '${serviceName}' does not exists`);
                }

                // Run command to get service details with provided data
                exec(`sc.exe qc "${serviceName}"`, (err, stdout) => {
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

/**
 * Set start type of service provided to value provided
 * @param {string} serviceName Name of service
 * @param {string} startType Name of start up type
 */
function startup(serviceName, startType) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(serviceName).then(
            // Existence check completed
            (alreadyExists) => {
                let st = '';

                switch (startType) {
                    case 'Automatic':
                        st = 'auto';
                        break;
                    case 'Disabled':
                        st = 'disabled';
                        break;
                    case 'Manual':
                        st = 'demand';
                        break;
                    default:
                        st = 'demand';
                        break;
                }

                // If exists, reject
                if (!alreadyExists) {
                    return reject(`Service with name '${serviceName}' does not exists`);
                }

                // Run command for create service with provided data
                exec(`sc.exe config "${serviceName}" start= ${st}`, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        return reject(err);
                    }

                    if (stdout.indexOf('SUCCESS') !== -1) {
                        return resolve(true);
                    }
                    return resolve(false);
                });
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}

/**
 * Stops provided service on local machine
 * @param {string} serviceName Name of service
 */
function stop(serviceName) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(serviceName).then(
            // Existence check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(`Service with name '${serviceName}' does not exists`);
                }

                // Run command for create service with provided data
                exec(`sc.exe stop "${serviceName}"`, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        return reject(new Error(stdout));
                    }

                    // Get all lines on standard output, take only
                    // lines with "SUCCESS" and remove extra parts
                    const lines = stdout
                        .toString()
                        .split('\r\n')
                        .filter((line) => line.indexOf('SUCCESS') !== -1);

                    // With at least one line with success, true, otherwise, false
                    return resolve(!!lines);
                });
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}

/**
 * Starts provided service on local machine
 * @param {string} serviceName Name of service
 */
function start(serviceName) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(serviceName).then(
            // Existence check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(`Service with name '${serviceName}' does not exists`);
                }

                // Run command for create service with provided data
                exec(`sc.exe start "${serviceName}"`, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        return reject(new Error(stdout));
                    }

                    // Get all lines on standard output, take only
                    // lines with "SUCCESS" and remove extra parts
                    const lines = stdout
                        .toString()
                        .split('\r\n')
                        .filter((line) => line.indexOf('SUCCESS') !== -1);

                    // With at least one line with success, true, otherwise, false
                    return resolve(!!lines);
                });
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}

/**
 * Uninstalls provided service from local machine
 * @param {string} serviceName Name of service
 */
function uninstall(serviceName) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // Check existence
        exists(serviceName).then(
            // Existence check completed
            (alreadyExists) => {
                // If exists, reject
                if (!alreadyExists) {
                    return reject(`Service with name '${serviceName}' does not exists`);
                }

                // Run command for create service with provided data
                exec(`sc.exe delete "${serviceName}"`, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        return reject(new Error(stdout));
                    }

                    // Get all lines on standard output, take only
                    // lines with "SUCCESS" and remove extra parts
                    const lines = stdout
                        .toString()
                        .split('\r\n')
                        .filter((line) => line.indexOf('SUCCESS') !== -1);

                    // With at least one line with success, true, otherwise, false
                    return resolve(!!lines);
                });
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}

/**
 * Install provided service on local machine
 * @param {string} serviceName Name of service
 * @param {string} displayName Name of service displayed on service manager
 * @param {string} exeFilePath Executable file full path
 */
function install(serviceName, displayName, exeFilePath) {
    // Create promise
    return new Promise((resolve, reject) => {
        // With invalid service name, reject
        if (!serviceName) {
            reject(new Error('Service name is invalid'));
            return;
        }

        // With invalid exeFilePath, reject
        if (!exeFilePath) {
            reject(new Error('Executable file path is invalid'));
            return;
        }

        // With missing display name, set service name
        if (!displayName) {
            displayName = `Service '${serviceName}'`;
        }

        // Check existence
        exists(serviceName).then(
            // Existence check completed
            (alreadyExists) => {
                // If exists, reject
                if (alreadyExists) {
                    return reject(`Service with name '${serviceName}' already exists`);
                }

                // Run command for create service with provided data
                exec(`sc.exe create "${serviceName}" ` + `displayname="${displayName}" ` + `binpath="${exeFilePath}"`, (err, stdout) => {
                    // On error, reject and exit
                    if (err) {
                        return reject(new Error(stdout));
                    }

                    // Get all lines on standard output, take only
                    // lines with "SUCCESS" and remove extra parts
                    const lines = stdout
                        .toString()
                        .split('\r\n')
                        .filter((line) => line.indexOf('SUCCESS') !== -1);

                    // With at least one line with success, true, otherwise, false
                    return resolve(!!lines);
                });
            },

            // Reject on error
            (err) => reject(err)
        );
    });
}



/**
 * Get all names of services installed on local machine
 */
function all() {
    // Create promise
    return new Promise((resolve, reject) => {
        // Run command for get states of all services on local machine
        exec('sc.exe query state= all', (err, stdout) => {
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

// Module schema
module.exports = {
    all,
    details,
    exists,
    install,
    uninstall,
    stop,
    start,
    startup,
    status,
};
