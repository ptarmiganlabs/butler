var dgram = require('dgram');
var yargs = require('yargs');



// Parse command line parameters
var argv = yargs.usage('Butler UDP client test app', {
    'about': {
        description: 'This app sends messages to the UDP server(s) built into Butler (or any other UDP server)',
        required: false,
        alias: 'a'
    },
    'ip': {
        description: 'IP address of UDP server message will be sent to',
        required: true,
        alias: 'i'
    },
    'port': {
        description: 'Port on UDP server',
        required: true,
        number: true,
        alias: 'p'
    },
    'msg': {
        description: 'Message to send',
        required: false,
        default: 'Test message',
        alias: 'm'
    }
}).argv;


var client = dgram.createSocket({type:'udp4', reuseAddr:true});
//sock.send(8000, "localhost", buf, 0, buf.length);
var msg = new Buffer (argv.msg.toString());

//udpServerSessionConnection.bind(9998);
client.send(msg, 0, msg.length, argv.port, argv.ip, function(err, bytes) {
    if (err) throw err;
    console.info('UDP message sent to ' + argv.ip +':'+ argv.port + ', ' +  bytes + ' bytes.');
    client.close();
});
