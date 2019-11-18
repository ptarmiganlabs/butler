var dgram = require('dgram');
var yargs = require('yargs');

// Parse command line parameters
var argv = yargs
  .usage(
    'Usage: node $0 [options]\n\nThis app sends messages to the UDP server(s) built into Butler (or any other UDP server)',
  )

  .alias('a', 'about')
  .alias('i', 'ip')
  .alias('p', 'port')
  .alias('m', 'msg')
  .default({
    m: 'Test message',
  })
  .describe('i', 'IP address of UDP server message will be sent to')
  .describe('p', 'Port on UDP server')
  .describe('m', 'Message to send')
  .demandOption(['i', 'p'])
  .help('h')
  .alias('h', 'help').argv;

var client = dgram.createSocket({
  type: 'udp4',
  reuseAddr: true,
});
var msg = new Buffer(argv.msg.toString());

client.send(msg, 0, msg.length, argv.port, argv.ip, function(err, bytes) {
  if (err) throw err;
  console.info('UDP message sent to ' + argv.ip + ':' + argv.port + ', ' + bytes + ' bytes.');
  client.close();
});
