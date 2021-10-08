'use strict';

const httpErrors = require('http-errors');

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
var slackApi = require('../lib/slack_api.js');

/**
 * @swagger
 *
 * /v4/slackpostmessage:
 *   put:
 *     description: |
 *       Send message to Slack
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: message
 *         description: Message to Slack channel (ex \#reload-notification)
 *         in: body
 *         schema:
 *           type: object
 *           required:
 *             - channel
 *             - from_user
 *             - msg
 *           properties:
 *             channel:
 *               type: string
 *               example: "#reload-notification"
 *             from_user:
 *               type: string
 *               example: "Butler the Bot"
 *             msg:
 *               type: string
 *               example: "This is a message from Qlik Sense"
 *             emoji:
 *               type: string
 *               example: "thumbsup"
 *     responses:
 *       201:
 *         description: Message successfully sent to Slack.
 *         schema:
 *           type: object
 *           properties:
 *             channel:
 *               type: string
 *             from_user:
 *               type: string
 *             msg:
 *               type: string
 *             emoji:
 *               type: string
 *
 *       400:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports = async function (fastify, options) {
    if (globals.config.has('Butler.restServerEndpointsEnable.slackPostMessage') && globals.config.get('Butler.restServerEndpointsEnable.slackPostMessage')) {
        globals.logger.debug('Registering REST endpoint PUT /v4/slackpostmessage');

        fastify.put('/v4/slackpostmessage', handler);
    }
}

/**
 * 
 * @param {*} request 
 * @param {*} reply 
 */
 async function handler(request, reply) {
    try {
        logRESTCall(request);

        if (request.body.channel == undefined || request.body.from_user == undefined || request.body.msg == undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter(s) missing'));
        } else {
            let slackConfig = {
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

            let result = slackApi.slackSend(slackConfig, globals.logger);
            
            reply
            .code(201)
            .send(request.body);
       }

    } catch (err) {
        globals.logger.error(`SLACK: Failed sending Slack message: ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed sending Slack message'));
    }
}

