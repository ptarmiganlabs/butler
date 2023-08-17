const axios = require('axios');

async function slackSend(slackConfig, logger) {
    // TODO Sanity check Slack config
    if (slackConfig.text === undefined) {
        logger.error('SLACKSEND: Text missing - mandatory when sending Slack messages');
        return;
    }

    let body = {};
    try {
        body = {
            username: slackConfig.fromUser === '' ? '' : slackConfig.fromUser,
            channel: slackConfig.channel === '' ? '' : slackConfig.channel,
            icon_emoji: slackConfig.iconEmoji === '' ? '' : slackConfig.iconEmoji,
        };

        if (slackConfig.messageType === 'basic') {
            Object.assign(body, slackConfig.text);
        } else if (slackConfig.messageType === 'formatted') {
            // Parse the JSON string into an object
            Object.assign(body, JSON.parse(slackConfig.text));
        } else if (slackConfig.messageType === 'restmsg') {
            Object.assign(body, slackConfig.text);
        }

        const res = await axios.post(slackConfig.webhookUrl, JSON.stringify(body));
        logger.debug(`SLACKSEND: Result from POST to Slack webhook: ${res.statusText} (${res.status}): ${res.data}`);
        return res;
    } catch (err) {
        logger.error(`SLACKSEND: ${err}"`);
    }
}

module.exports = {
    slackSend,
};
