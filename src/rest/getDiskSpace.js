// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const errors = require('restify-errors');

var disk = require('diskusage');

/**
 * @swagger
 *
 * /v4/getdiskspace:
 *   get:
 *     description: |
 *       Get disk space info for specified path
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: path
 *         description: Path to disk whos disk space status should be queried.
 *         in: query
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Directory created.
 *       409:
 *         description: Missing parameter.
 *       500:
 *         description: Internal error (file system permissions etc).
 *
 */
module.exports.respondGET_getDiskSpace = async function (req, res, next) {
    logRESTCall(req);
    // TODO: Better handling of missing or incorrect parameters

    // Windows: get disk usage. Takes path as first parameter
    try {
        let info = await disk.check(req.query.path);
        // , function (err, info) {
        //     globals.logger.info(`DISKSPACE: Get disk space: ${info}`);

        //     req.query.available = info.available;
        //     req.query.free = info.free;
        //     req.query.total = info.total;
        // });

        res.send(200, info);
        next();
    } catch (err) {
        globals.logger.error(`DISKSPACE: Failed creating directory: ${req.body.directory}`);
        res.send(new errors.InternalError({}, 'Failed creating directory'));
        next();
    }
};

/*
   OSX/Linux: get disk usage. Takes mount point as first parameter
  disk.check(req.query.path, function(err, info) {
    req.query.available = info.available;
    req.query.free = info.free;
    req.query.total = info.total;
  });
*/
