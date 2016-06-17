var dgram = require('dgram');
var yargs = require('yargs').argv;


// parse command line arguments

var udpServerSessionConnection = dgram.createSocket({type:"udp4", reuseAddr:true});
