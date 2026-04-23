/**
 * Heartbeat module for remote health monitoring.
 *
 * This module sends periodic HTTP GET requests to a remote URL to signal
 * that Butler is alive and functioning. This can be used by monitoring
 * systems to detect Butler failures.
 */

import later from '@breejs/later';
import axios from 'axios';
import globals from '../globals.js';

/**
 * Sends a single heartbeat request to the remote URL.
 *
 * Makes an HTTP GET request to the configured remote URL.
 * Success/failure is logged at debug/error levels respectively.
 *
 * @param {string} remoteURL - The URL to send the heartbeat to.
 * @param {Object} logger - The logger object for logging messages.
 */
const callRemoteURL = (remoteURL, logger) => {
    // Send the heartbeat HTTP GET request
    axios
        .get(remoteURL)
        .then(() => {
            // Handle successful response
            logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch((error) => {
            // Handle error (network failure or non-2xx response)
            logger.error(`HEARTBEAT: Error sending heartbeat: ${globals.getErrorMessage(error)}`);
        });
};

/**
 * Sets up a timer to send heartbeats to a remote URL at a specified frequency.
 *
 * Parses the frequency from the config file and schedules recurring
 * heartbeat calls using the later.js library. Also performs an
 * immediate initial heartbeat.
 *
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object for logging messages.
 */
function setupHeartbeatTimer(config, logger) {
    try {
        logger.debug(`HEARTBEAT: Setting up heartbeat to remote: ${config.get('Butler.heartbeat.remoteURL')}`);

        // Parse the cron-style frequency expression from config
        const sched = later.parse.text(config.get('Butler.heartbeat.frequency'));

        // Schedule recurring heartbeat calls using later.js
        later.setInterval(() => {
            callRemoteURL(config.get('Butler.heartbeat.remoteURL'), logger);
        }, sched);

        // Do an initial ping to the remote URL immediately
        callRemoteURL(config.get('Butler.heartbeat.remoteURL'), logger);
    } catch (err) {
        logger.error(`HEARTBEAT: ${globals.getErrorMessage(err)}`);
    }
}

export default setupHeartbeatTimer;
