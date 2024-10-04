import axios from 'axios';

/**
 *
 * @param {*} slackConfig
 * slackConfig = {
 *   webhookUrl: 'https://hooks.slack.com/services/...',
 *   messageType: 'basic', // basic, formatted, restmsg
 *   templateFile: 'slack_template.json',
 *   headScriptLogLines: 'Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit. Nullam nec purus.',
 *   tailScriptLogLines: 'Lorem ipsum dolor sit amet,\nconsectetur adipiscing elit. Nullam nec purus.',
 *   fromUser: 'MyBot',
 *   iconEmoji: ':ghost:',
 *   rateLimit: 30,
 *   basicMsgTemplate: 'abc123...',
 *   channel: '#general',
 *   text: 'Hello, world!'
 * }
 * @param {*} logger
 * @returns
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
