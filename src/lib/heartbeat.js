import later from '@breejs/later';
import axios from 'axios';
import globals from '../globals.js';

/**
 * Sends a heartbeat to the specified remote URL.
 * @param {string} remoteURL - The URL to send the heartbeat to.
 * @param {Object} logger - The logger object for logging messages.
 */
const callRemoteURL = (remoteURL, logger) => {
    axios
        .get(remoteURL)
        .then(() => {
            // handle success
            logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch((error) => {
            // handle error
            logger.error(`HEARTBEAT: Error sending heartbeat: ${globals.getErrorMessage(error)}`);
        });
};

/**
 * Sets up a timer to send heartbeats to a remote URL at a specified frequency.
 * @param {Object} config - The configuration object.
 * @param {Object} logger - The logger object for logging messages.
 */
function setupHeartbeatTimer(config, logger) {
    try {
        logger.debug(`HEARTBEAT: Setting up heartbeat to remote: ${config.get('Butler.heartbeat.remoteURL')}`);

        const sched = later.parse.text(config.get('Butler.heartbeat.frequency'));
        later.setInterval(() => {
            callRemoteURL(config.get('Butler.heartbeat.remoteURL'), logger);
        }, sched);

        // Do an initial ping to the remote URL
        callRemoteURL(config.get('Butler.heartbeat.remoteURL'), logger);
    } catch (err) {
        logger.error(`HEARTBEAT: ${globals.getErrorMessage(err)}`);
    }
}

export default setupHeartbeatTimer;
