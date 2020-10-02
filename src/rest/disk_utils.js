// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const isDirectoryChildOf = require('../lib/disk_utils').isDirectoryChildOf;

const errors = require('restify-errors');
var fs = require('fs-extra');
const path = require('path');

/**
 * @swagger
 *
 * /v4/filemove:
 *   put:
 *     description: |
 *       Move a file between well defined, approved locations.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: |
 *           Moving of files is only posttible between pre-approved directories.
 *           Defining approved source and destination directories is done in Butler's config file.
 *         in: body
 *         schema:
 *           type: object
 *           required:
 *             - fromFile
 *             - toFile
 *           properties:
 *             fromFile:
 *               type: string
 *               description: Name of source file
 *               example: subfolder/file1.qvd
 *             toFile:
 *               type: string
 *               description: Name of destination file. Can be different from source file name, if needed
 *               example: archive/file1_20200925.qvd
 *             overwrite:
 *               type: boolean
 *               description: Controls whether destination file should be overwritten if it already exists. Defaults to false.
 *               example: false
 *     responses:
 *       201:
 *         description: File moved.
 *       403:
 *         description: No approved fromDir/toDir for file move.
 *       404:
 *         description: fromFile not found.
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error, or file overwrite was not allowed.
 *
 */
module.exports.respondPUT_fileMove = async function (req, res, next) {
    logRESTCall(req);

    try {
        let overwrite = false;

        if (req.body.fromFile == undefined || req.body.toFile == undefined || req.body.fromFile == '' || req.body.toFile == '') {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            if (req.body.overwrite == 'true') {
                overwrite = true;
            }

            // Make sure that
            // 1. fromFile is in a valid source directory (or subdirectory thereof),
            // 2. toFile is in a valid associated destiation directory (or subdirectory thereof)

            let fromFile = path.normalize(req.body.fromFile),
                toFile = path.normalize(req.body.toFile);

            let fromDir = path.dirname(fromFile),
                toDir = path.dirname(toFile);

            let moveIsOk = false; // Only allow move if this flag is true

            // Ensure fromFile exists
            if (await fs.pathExists(fromFile)) {
                globals.fileMoveDirectories.forEach(element => {
                    if (isDirectoryChildOf(fromDir, element.fromDir) && isDirectoryChildOf(toDir, element.toDir)) {
                        // The fromFile passed as parameter matches an approved fromDir specified in the config file
                        // AND
                        // toFile passed as parameter matches the associated approved toDir specified in the config file

                        moveIsOk = true;
                    }
                });

                if (moveIsOk) {
                    await fs.moveFile(fromFile, toFile, { overwrite: overwrite });
                    res.send(201, { fromFile: fromFile, toFile: toFile, overwrite: overwrite });
                } else {
                    globals.logger.error(`FILEMOVE: No approved fromDir/toDir for file move ${req.body.fromFile} to ${req.body.toFile}`);
                    res.send(new errors.ForbiddenError({}, 'No approved fromDir/toDir for file move'));
                }
            } else {
                // fromFile does not exist
                globals.logger.error(`FILEMOVE: From file ${req.body.fromFile} does not exist`);
                res.send(new errors.ResourceNotFoundError({}, 'fromFile does not exist'));
            }
        }

        next();
    } catch (err) {
        globals.logger.error(`FILEMOVE: Failed moving file ${req.body.fromFile} to ${req.body.toFile}`);
        res.send(new errors.InternalError({}, 'Failed moving file'));
        next();
    }
};

/**
 * @swagger
 *
 * /v4/filedelete:
 *   delete:
 *     description: |
 *       Delete file(s) in well defined, approved locations.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: |
 *           It is only possible to delete files in pre-approved directories, or subdirectories thereof.
 *           Defining approved directories is done in Butler's config file.
 *         in: body
 *         schema:
 *           type: object
 *           required:
 *             - deleteFile
 *           properties:
 *             deleteFile:
 *               type: string
 *               description: Name of file to be deleted. Use forward/backward slashes in paths as needed, depending on whether Butler runs on Windows/non-Windows platform.
 *               example: /data/qvdstore/sales/file1.qvd
 *     responses:
 *       201:
 *         description: File deleted.
 *       403:
 *         description: No approved directory matches the delete request.
 *       404:
 *         description: File requested for delete not found.
 *       409:
 *         description: Required parameter missing.
 *       500:
 *         description: Internal error, or file delete was not allowed.
 *
 */
module.exports.respondPUT_fileDelete = async function (req, res, next) {
    logRESTCall(req);

    try {
        if (req.body.deleteFile == undefined || req.body.deleteFile == '') {
            // Required parameter is missing
            res.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            // Make sure that
            // 1. file exists
            // 2. file is in a valid directoryv (or subdirectory thereof),

            let deleteFile = path.normalize(req.body.deleteFile),
                deleteDir = path.dirname(deleteFile);

            let deleteIsOk = false; // Only allow delete if this flag is true

            // Ensure the file to be deleted is in an approved directory hierarchy
            globals.fileDeleteDirectories.forEach(element => {
                if (isDirectoryChildOf(deleteDir, element)) {
                    // The deleteFile passed as parameter matches an approved directory specified in the config file

                    deleteIsOk = true;
                }
            });

            if (deleteIsOk) {
                if (await fs.pathExists(deleteFile)) {
                    // Finally, make sure that file realy exists
                    await fs.remove(deleteFile);
                    res.send(201, { deleteFile: deleteFile });
                } else {
                    // deleteFile does not exist
                    globals.logger.error(`FILEDELETE: Delete failed, file ${req.body.deleteFile} does not exist`);
                    res.send(new errors.ResourceNotFoundError({}, 'Delete failed, file does not exist'));
                }
            } else {
                globals.logger.error(`FILEDELETE: File delete request ${req.body.deleteFile} is not in any approved directories.`);
                res.send(new errors.ForbiddenError({}, 'File delete request is not in any approved directories'));
            }
        }

        next();
    } catch (err) {
        globals.logger.error(`FILEDELETE: Failed deleting file ${req.body.deleteFile}`);
        res.send(new errors.InternalError({}, 'Failed deleting file'));
        next();
    }
};
