var config = require('config');
var https = require('https');
var fs = require('fs');

var options = {
    hostname: config.get('Butler.configQRS.host'),
    port: config.get('Butler.configQRS.port'),
    path: '/qrs/app?xrfkey=abcdefghijklmnop',
    method: 'POST',
    headers: {
        'x-qlik-xrfkey': 'abcdefghijklmnop',
        'X-Qlik-User': 'UserDirectory= Internal; UserId= sa_repository '
    },
    key: fs.readFileSync(config.get('Butler.cert.clientCertKey')),
    cert: fs.readFileSync(config.get('Butler.cert.clientCert')),
    ca: fs.readFileSync(config.get('Butler.cert.clientCertCA'))
};


// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports.senseStartTask = function (taskId) {

    var globals = require('../globals');

    // QRS config
    globals.logger.log('info', 'Starting task ' + taskId);
    // console.info('Starting task ' + taskId);
    options.path = '/qrs/task/' + taskId + '/start?xrfkey=abcdefghijklmnop';

    https.get(options, function (res) {
        globals.logger.log('info', 'Got response: ' + res.statusCode);
        // console.info('Got response: ' + res.statusCode);
        res.on('data', function (chunk) {
            globals.logger.log('info', 'BODY: ' + chunk);
            // console.info('BODY: ' + chunk);  
        });
    }).on('error', function (e) {
        globals.logger.log('error', 'Got error: ' + e.message);
        console.error('Got error: ' + e.message);
    });
};
