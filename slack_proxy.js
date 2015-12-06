var restify = require('restify');
var Slack = require('node-slack');



var slackWebhookURL = '<fill in your web hook URL from Slack>';
var slack = new Slack(slackWebhookURL);



function respondSlack(req, res, next) {
  console.log(req.params);
  console.log(req.params.channel);

  slack.send({
      text: req.params.msg,
      channel: '#general',
      username: 'Bot',
      icon_emoji: req.params.emoji
  });

  res.send(req.params);
  next();
}

var server = restify.createServer({
  name: 'SlackProxy'
});

server.use(restify.queryParser());    // Enable parsing of http parameters

server.get('/slack', respondSlack);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
