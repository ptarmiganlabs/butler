// Load global variables and functions
var globals = require('../globals');
var mkdirp = require('mkdirp');
const errors = require('restify-errors');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

/**
 * @swagger
 *
 * /v4/createdir:
 *   put:
 *     description: |
 *       Creates directory in file system.
 *
 *       __WARNING: This method can create folders anywhere (where the account running Butler has permissions) in the filesystem.__
 *       Use with caution.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: directory
 *         description: Path to directory that should be created. Can be a relative or absolute path.
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       201:
 *         description: Directory created.
 *       409:
 *         description: Missing parameter.
 *       500:
 *         description: Internal error (file system permissions etc).
 *
 */
module.exports.respondPUT_createDir = function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.body.directory == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'No path/directory specified'));
        } else {
            mkdirp(req.body.directory)
                .then(dir => globals.logger.verbose(`Created dir ${dir}`))

                .catch(function (error) {
                    globals.logger.error(`CREATEDIR: ${JSON.stringify(error, null, 2)}`);
                    return next(new errors.InternalServerError('Failed to create directory.'));
                });

            res.send(201, req.body);
        }

        next();
    } catch (err) {
        globals.logger.error(`CREATEDIR: Failed creating directory: ${req.body.directory}`);
        res.send(new errors.InternalError({}, 'Failed creating directory'));
        next();
    }
};
