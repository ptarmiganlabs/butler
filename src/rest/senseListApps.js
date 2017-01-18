var globals = require('../globals');
var qsocks = require('qsocks');

// Function for handling /senseListApps REST endpoint
module.exports.respondSenseListApps = function (req, res, next) {
    globals.logger.log('info', 'Getting list of all apps');
    // console.info('Getting list of all apps');

    qsocks.Connect(globals.configEngine).then(function(global) {

        //We can now interact with the global class, for example fetch the document list.
        //qsocks mimics the Engine API, refer to the Engine API documentation for available methods.
        global.getDocList().then(function(docList) {
            var jsonArray = [];
            docList.forEach(function(doc) {
                jsonArray = jsonArray.concat( [ {'id': doc.qDocId.toString(), 'name': doc.qDocName.toString()} ]);
            });

            res.send(jsonArray);

            // Close connection to Sense server
            try {
                global.connection.ws.close();
            } catch(ex) {
                globals.logger.log('error', ex);
                // console.error(ex);
                next();
            }
        })
        .catch(function(error) {
            globals.logger.log('error', error);
            // console.error();(error);
        });

        next();
    });
};
