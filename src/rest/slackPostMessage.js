// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

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
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error.
 *
 */
module.exports.respondPUT_slackPostMessage = function (req, res, next) {
    logRESTCall(req);

    try {
        if ((req.body.channel == undefined) || (req.body.from_user == undefined) || (req.body.msg == undefined)) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
    
            globals.slackObj.send({
                text: req.body.msg,
                channel: req.body.channel,
                username: req.body.from_user,
                icon_emoji: req.body.emoji,
            });
        
            res.send(201, req.body);
        }
    
        next();    
    } catch (err) {
        globals.logger.error(`SLACK: Failed sending Slack message: ${JSON.stringify(req.body, null, 2)}`);
        res.send(new errors.InternalError({}, 'Failed sending Slack message'));
        next();
    }
};
