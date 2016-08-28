//var globals = require('../globals');
var QRS = require('qrs');
var config = require('config');

// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports.senseStartTask = function (taskId) {
    // QRS config
    var configQRS = {
        authentication: config.get('Butler.configQRS.authentication'),
        host: config.get('Butler.configQRS.host'),
        port: config.get('Butler.configQRS.port'),
        useSSL: config.get('Butler.configQRS.useSSL'),
        headerKey: config.get('Butler.configQRS.headerKey'),
        headerValue: config.get('Butler.configQRS.headerValue'),
        cert: config.get('Butler.configQRS.cert'),
        key: config.get('Butler.configQRS.key'),
        ca: config.get('Butler.configQRS.ca')
    };

    var qrs = new QRS(configQRS );
    console.info('Starting task ' + taskId);

    qrs.post( '/qrs/task/' + taskId + '/start')
        .then( function ( data) {
            console.info('return value: ', data );

        }, function ( err ) {
            console.error( 'An error occurred: ', err);

        }
    );
};
