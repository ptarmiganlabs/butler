const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const slackApi = require('../lib/slack_api');
const { apiPutSlackPostMessage } = require('../api/slackPostMessage');

async function handlerPutSlackPostMessage(request, reply) {
    try {
        logRESTCall(request);

        if (
            request.body.channel === undefined ||
            request.body.from_user === undefined ||
            request.body.msg === undefined
        ) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter(s) missing'));
        } else {
            const slackConfig = {
                text: {
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'plain_text',
                                text: request.body.msg,
                            },
                        },
                    ],
                },
                fromUser: request.body.from_user,
                channel: request.body.channel,
                iconEmoji: request.body.emoji,
                messageType: 'restmsg',
                webhookUrl: globals.config.get('Butler.slackNotification.restMessage.webhookURL'),
            };

            slackApi.slackSend(slackConfig, globals.logger);

            reply.code(201).send(request.body);
        }
    } catch (err) {
        globals.logger.error(
            `SLACK: Failed sending Slack message: ${JSON.stringify(
                request.body,
                null,
                2
            )}, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed sending Slack message'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.slackPostMessage') &&
        globals.config.get('Butler.restServerEndpointsEnable.slackPostMessage')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/slackpostmessage');
        fastify.put('/v4/slackpostmessage', apiPutSlackPostMessage, handlerPutSlackPostMessage);
    }
};
