/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');
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
 *       403:
 *         description: Posting messages to Slack is not enabled.
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_slackPostMessage = function (req, res, next) {
    logRESTCall(req);

    try {
        if (
            globals.config.has('Butler.slackNotification.enable') &&
            globals.config.has('Butler.slackNotification.restMessage.enable') &&
            globals.config.get('Butler.slackNotification.enable') == true &&
            globals.config.get('Butler.slackNotification.restMessage.enable') == true
        ) {
            if (req.body.channel == undefined || req.body.from_user == undefined || req.body.msg == undefined) {
                // Required parameter is missing
                res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
            } else {
                let slackConfig = {
                    text: {
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'plain_text',
                                    text: req.body.msg,
                                },
                            },
                        ],
                    },
                    fromUser: req.body.from_user,
                    channel: req.body.channel,
                    iconEmoji: req.body.emoji,
                    messageType: 'restmsg',
                    webhookUrl: globals.config.get('Butler.slackNotification.restMessage.webhookURL'),
                };

                let result = slackApi.slackSend(slackConfig, globals.logger);
                res.send(201, req.body);
            }
        } else {
            res.send(new errors.ForbiddenError({}, 'Posting messages to Slack is not enabled.'));
        }

        next();
    } catch (err) {
        globals.logger.error(`SLACK: Failed sending Slack message: ${JSON.stringify(req.body, null, 2)}, error is: ${JSON.stringify(err, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed sending Slack message'));
        next();
    }
};
