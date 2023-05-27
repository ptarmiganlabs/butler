/* eslint-disable no-console */
// Set up REST endpoint for Docker healthchecks
const httpHealth = require('http');

const optionsHealth = {
    host: 'localhost',
    port: '12398',
    path: '/health',
    timeout: 2000,
};

// This code checks the health of the docker container using the docker api
// It checks the status code of the response and returns an exit code of 0 if the response is 200 and 1 otherwise
const requestHealth = httpHealth.request(optionsHealth, (res) => {
    console.log(`STATUS Docker health: ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

requestHealth.on('error', (err) => {
    console.log('ERROR Docker health:');
    console.log(err);
    process.exit(1);
});

requestHealth.end();
