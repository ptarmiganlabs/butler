var globals = require('../globals');
var QRS = require('qrs');

// Function for starting Sense task, given its task ID (as it appears in the QMC task list)
module.exports.senseStartTask = function (taskId) {
//    console.log(globals.configQRS);

    var configQRS2 = {
        authentication: 'certificates',
        host: 'xxxx',
        useSSL: true,
        port: 4242,
        headerKey: 'X-Qlik-User',
        headerValue: 'UserDirectory=Internal;UserId=sa_repository',
        cert: 'client.pem',
        key: 'client_key.pem',
        ca: 'root.pem'
    };
    console.log(configQRS2);
    var qrs2 = new QRS( configQRS2 );
    

//    var qrs = new QRS(globals.configQRS);
    console.log('Starting task ' + taskId);
//    console.log(qrs);

    qrs2.post( '/qrs/task/' + taskId + '/start')
        .then( function ( data) {
            console.info('return value: ', data );

        }, function ( err ) {
            console.error( 'An error occurred: ', err);

        }
    );
};
