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
    ca: fs.readFileSync(config.get('Butler.cert.clientCertCA')),
    rejectUnauthorized: false
};


// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports.senseStartTask = function (taskId) {

    var globals = require('../globals');

    // QRS config
    options.path = '/qrs/task/' + taskId + '/start?xrfkey=abcdefghijklmnop';

    https.get(options, function (res) {
        globals.logger.verbose(`Got response: ${res.statusCode}`);

        res.on('data', function (chunk) {
            globals.logger.debug(`BODY: ${chunk}`);
        });

        return res.statusCode;

    }).on('error', function (error) {
        globals.logger.error(`Error while starting Sense task: ${JSON.stringify(error, null, 2)}`);

        return 400;
    });
};
