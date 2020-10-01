// Load global variables and functions
var globals = require('../globals');
var mkdirp = require('mkdirp');
const errors = require('restify-errors');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;

/**
 * @swagger
 *
 * /v4/createdirqvd:
 *   put:
 *     description: |
 *       Creates directory in directory defined in Butler's config file.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: directory
 *         description: Path to directory that should be created. The created directory will always be relative to the QVD folder defined in the Butler config file..
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
module.exports.respondPUT_createDirQVD = function (req, res, next) {
    logRESTCall(req);

    // TODO: Add check to make sure the created dir is really a subpath of the QVD folder

    try {
        if (req.body.directory == undefined) {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'No path/directory specified'));
        } else {
            mkdirp(globals.qvdFolder + '/' + req.body.directory)
                .then(dir => globals.logger.verbose(`Created dir ${dir}`))

                .catch(function (error) {
                    globals.logger.error(`CREATEDIRQVD: ${JSON.stringify(error, null, 2)}`);
                    return next(new errors.InternalServerError('Failed to create directory.'));
                });

            res.send(201, req.body);
        }
        next();
    } catch (err) {
        globals.logger.error(`CREATEDIRQVD: Failed creating directory: ${req.body.directory}`);
        res.send(new errors.InternalError({}, 'Failed creating directory'));
        next();
    }
};
