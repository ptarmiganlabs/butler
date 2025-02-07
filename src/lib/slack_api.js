import axios from 'axios';

/**
 * Sends a message to a Slack channel using the provided configuration.
 * @param {Object} slackConfig - Configuration for the Slack message.
 * @param {string} slackConfig.webhookUrl - The Slack webhook URL.
 * @param {string} slackConfig.messageType - The type of message (basic, formatted, restmsg).
 * @param {string} slackConfig.templateFile - The template file for the message.
 * @param {string} slackConfig.headScriptLogLines - The head script log lines.
 * @param {string} slackConfig.tailScriptLogLines - The tail script log lines.
 * @param {string} slackConfig.fromUser - The username to send the message from.
 * @param {string} slackConfig.iconEmoji - The emoji icon to use.
 * @param {number} slackConfig.rateLimit - The rate limit for sending messages.
 * @param {string} slackConfig.basicMsgTemplate - The basic message template.
 * @param {string} slackConfig.channel - The Slack channel to send the message to.
 * @param {string} slackConfig.text - The text of the message.
 * @param {Object} logger - The logger object for logging messages.
 * @returns {Promise<void>}
 */
async function slackSend(slackConfig, logger) {
    // TODO Sanity check Slack config
    if (slackConfig.text === undefined) {
        logger.error('SLACK SEND: Text missing - mandatory when sending Slack messages');
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
        logger.debug(`SLACK SEND: Result from POST to Slack webhook: ${res.statusText} (${res.status}): ${res.data}`);
    } catch (err) {
        logger.error(`SLACK SEND: ${err}"`);
    }
}

export default slackSend;
