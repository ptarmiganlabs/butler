var globals = require('../globals');
var qsocks = require('qsocks');
var serializeApp = require('serializeapp')


// Function for handling /senseAppDump REST endpoint
module.exports.respondSenseAppDump = function (req, res, next) {
    console.info('Dumping app: ' + req.params.appId);

    qsocks.Connect(globals.configEngine).then(function(global) {
        global.openDoc(req.params.appId, '' , '', '', true)
        .then(function(app) {
            return serializeApp(app);
        })
        .then(function(data) {
            var d = data;

            // Close connection to Sense server
            try {
                global.connection.ws.close();
            } catch(ex) {
                console.error(ex);
            }

            res.send(d);
        })
        .catch(function(error) {
            console.error(error);

            try {
                global.connection.ws.close();
            } catch(ex) {
                console.error(ex);
            }

            res.send(error);
            return next(error);
        });

        return next();
    });

};
