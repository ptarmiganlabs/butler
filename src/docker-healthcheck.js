/* eslint-disable no-console */
// Set up REST endpoint for Docker healthchecks
/**
 * Docker Health Check Entry Point.
 *
 * This standalone script provides a health check endpoint for Docker container orchestration.
 * It makes an HTTP request to Butler's internal health check API and reports
 * the result as a process exit code:
 * - Exit code 0: Butler is healthy (HTTP 200)
 * - Exit code 1: Butler is unhealthy (non-200 response) or unreachable
 *
 * Usage: Run as `node docker-healthcheck.js` from the container
 * The health endpoint is typically served on localhost:12398/health
 */

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
