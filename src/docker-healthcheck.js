/* eslint-disable no-console */
// Set up REST endpoint for Docker healthchecks
import httpHealth from 'http';
import { DOCKER_HEALTHCHECK_TIMEOUT_MS } from './constants.js';

const optionsHealth = {
    host: 'localhost',
    port: '12398',
    path: '/health',
    timeout: DOCKER_HEALTHCHECK_TIMEOUT_MS,
};

/**
 * This code checks the health of the docker container using the docker API.
 * It checks the status code of the response and returns an exit code of 0 if the response is 200 and 1 otherwise.
 * @param {http.IncomingMessage} res - The response object from the HTTP request.
 */
const requestHealth = httpHealth.request(optionsHealth, (res) => {
    console.log(`STATUS Docker health: ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

/**
 * Handles errors that occur during the HTTP request.
 * @param {Error} err - The error object.
 */
requestHealth.on('error', (err) => {
    console.log('ERROR Docker health:');
    console.log(err);
    process.exit(1);
});

requestHealth.end();
