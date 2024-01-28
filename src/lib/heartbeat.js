import later from '@breejs/later';
import axios from 'axios';

const callRemoteURL = (remoteURL, logger) => {
    axios
        .get(remoteURL)
        // eslint-disable-next-line no-unused-vars
        .then((response) => {
            // handle success
            logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch((error) => {
            // handle error
            logger.error(`HEARTBEAT: Error sending heartbeat: ${error}`);
        });
};

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
        logger.error(`HEARTBEAT: ${err}`);
    }
}

export default setupHeartbeatTimer;
