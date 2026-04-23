import axios from 'axios';
import globals from '../globals.js';

/**
 * Sends a message to a Slack channel using the provided configuration.
 *
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
    // Validate that text is provided - it's mandatory for all message types
    if (slackConfig.text === undefined) {
        logger.error('SLACK SEND: Text missing - mandatory when sending Slack messages');
        return;
    }

    // Build the Slack message payload
    let body = {};
    try {
        // Set common payload fields with fallbacks to empty strings
        body = {
            username: slackConfig.fromUser === '' ? '' : slackConfig.fromUser,
            channel: slackConfig.channel === '' ? '' : slackConfig.channel,
            icon_emoji: slackConfig.iconEmoji === '' ? '' : slackConfig.iconEmoji,
        };

        // Parse message based on type
        if (slackConfig.messageType === 'basic') {
            // Basic message - use text as-is
            Object.assign(body, slackConfig.text);
        } else if (slackConfig.messageType === 'formatted') {
            // Formatted message - parse JSON text into Slack blocks
            Object.assign(body, JSON.parse(slackConfig.text));
        } else if (slackConfig.messageType === 'restmsg') {
            // REST message format
            Object.assign(body, slackConfig.text);
        }

        // Send the POST request to Slack webhook
        const res = await axios.post(slackConfig.webhookUrl, JSON.stringify(body));
        logger.debug(`SLACK SEND: Result from POST to Slack webhook: ${res.statusText} (${res.status}): ${res.data}`);
    } catch (err) {
        logger.error(`SLACK SEND: ${globals.getErrorMessage(err)}"`);
    }
}

export default slackSend;
