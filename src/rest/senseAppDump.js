var globals = require('../globals');
var qsocks = require('qsocks');
var serializeApp = require('serializeapp');

// Function for handling /senseAppDump REST endpoint
module.exports.respondSenseAppDump = function (req, res, next) {
    globals.logger.log('info', 'Dumping app: ' + req.params.appId);

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
                globals.logger.log('error', ex);
            }

            res.send(d);
        })
        .catch(function(error) {
            globals.logger.log('error', error);

            try {
                global.connection.ws.close();
            } catch(ex) {
                globals.logger.log('error', ex);
            }

            res.send(error);
            return next(error);
        });

        return next();
    });

};
