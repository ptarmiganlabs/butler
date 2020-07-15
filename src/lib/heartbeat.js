var later = require('later');
const axios = require('axios');


var callRemoteURL = function (remoteURL, logger) {
    axios.get(remoteURL)
        .then(function (response) {
            // handle success
            logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch(function (error) {
            // handle error
            logger.error(`HEARTBEAT: Error sending heartbeat: ${error}`);
            // })
            // .then(function () {
            //   // always executed
        });
};


function setupHeartbeatTimer(config, logger) {

    try {
        logger.debug(
            `HEARTBEAT: Setting up heartbeat to remote: ${config.get('Butler.heartbeat.remoteURL')}`,
        );


        var sched = later.parse.text(config.get('Butler.heartbeat.frequency'));
        var t = later.setInterval(function () {
            callRemoteURL(config.get('Butler.heartbeat.remoteURL'), logger);
        }, sched);

        // Do an initial ping to the remote URL
        callRemoteURL(config.get('Butler.heartbeat.remoteURL'), logger);
    } catch (err) {
        logger.error(`HEARTBEAT: ${err}`);
    }

}



module.exports = {
    setupHeartbeatTimer,
};