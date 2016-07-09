var globals = require('../globals');
var qsocks = require('qsocks');


// Function for handling /senseListApps REST endpoint
module.exports.respondSenseListApps = function (req, res, next) {
    console.info('Getting list of all apps');

    console.log(globals.configEngine);
    qsocks.Connect(globals.configEngine).then(function(global) {
        console.log('0');

        //We can now interact with the global class, for example fetch the document list.
        //qsocks mimics the Engine API, refer to the Engine API documentation for available methods.
        global.getDocList().then(function(docList) {
            console.log('1');
            var jsonArray = [];
            docList.forEach(function(doc) {
                jsonArray = jsonArray.concat( [ {'id': doc.qDocId.toString(), 'name': doc.qDocName.toString()} ]);
            });

            console.log('2');
            res.send(jsonArray);
            console.log('3');

            // Close connection to Sense server
            try {
                console.log('4');
                global.connection.ws.close();
            } catch(ex) {
                console.log('5');
                console.error(ex);
                next();
            }
        })
        .catch(function(error) {
            console.log('6');
            console.error();(error);
        });

        console.log('7');
        next();
    });
};
