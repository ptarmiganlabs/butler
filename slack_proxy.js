var restify = require('restify');
var Slack = require('node-slack');
var mkdirp = require('mkdirp');


var slackWebhookURL = '<fill in your web hook URL from Slack>';
var slack = new Slack(slackWebhookURL);


function respondSlack(req, res, next) {
  console.log(req.params);

  slack.send({
      text: req.params.msg,
      channel: req.params.channel,
      username: req.params.from_user,
      icon_emoji: req.params.emoji
  });

  res.send(req.params);
  next();
}

function respondCreateDir(req, res, next) {
  console.log(req.params);

  mkdirp(req.params.directory, function(err) {
    // path was created unless there was error
    console.log('created dir ' + req.params.directory);
  });

  res.send(req.params);
  next();
}



var server = restify.createServer({
  name: 'SlackProxy'
});

server.use(restify.queryParser());    // Enable parsing of http parameters

server.get('/slack', respondSlack);
server.get('/createDir', respondCreateDir);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
