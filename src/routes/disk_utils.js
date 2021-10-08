'use strict';

const httpErrors = require('http-errors');
var fs = require('fs-extra');
const path = require('path');
var mkdirp = require('mkdirp');

// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;
const isDirectoryChildOf = require('../lib/disk_utils').isDirectoryChildOf;



module.exports = async function (fastify, options) {
    if (globals.config.has('Butler.restServerEndpointsEnable.fileCopy') && globals.config.get('Butler.restServerEndpointsEnable.fileCopy')) {
        globals.logger.debug('Registering REST endpoint PUT /v4/filecopy');

        fastify.put('/v4/filecopy', handlerFileCopy);
    }
    
    if (globals.config.has('Butler.restServerEndpointsEnable.fileMove') && globals.config.get('Butler.restServerEndpointsEnable.fileMove')) {
        globals.logger.debug('Registering REST endpoint PUT /v4/filemove');
    
        fastify.put('/v4/filemove', handlerFileMove);
    }

    if (globals.config.has('Butler.restServerEndpointsEnable.fileDelete') && globals.config.get('Butler.restServerEndpointsEnable.fileDelete')) {
        globals.logger.debug('Registering REST endpoint DELETE /v4/filedelete');

        fastify.delete('/v4/filedelete', handlerFileDelete);
    }

    if (globals.config.has('Butler.restServerEndpointsEnable.createDirQVD') && globals.config.get('Butler.restServerEndpointsEnable.createDirQVD')) {
        globals.logger.debug('Registering REST endpoint POST /v4/createdirqvd');

        fastify.post('/v4/createdirqvd', handlerCreateDirQvd);
    }

    if (globals.config.has('Butler.restServerEndpointsEnable.createDir') && globals.config.get('Butler.restServerEndpointsEnable.createDir')) {
        globals.logger.debug('Registering REST endpoint PUT /v4/createdir');

        fastify.post('/v4/createdir', handlerCreateDir);
    }
}





/**
 * @swagger
 *
 * /v4/filecopy:
 *   put:
 *     description: |
 *       Copy a file between well defined, approved locations.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description: |
 *           Copying of files is only posttible between pre-approved directories.
 *           Defining approved source and destination directories is done in Butler's config file.
 *           If the source directory contains subdirectories, these will be copied too.
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
 *               example: "subfolder/file1.qvd"
 *             toFile:
 *               type: string
 *               description: Name of destination file. Can be different from source file name, if needed
 *               example: "archive/file1_20200925.qvd"
 *             overwrite:
 *               type: boolean
 *               description: Controls whether destination file should be overwritten if it already exists. Note that the copy operation will silently fail if you set this to false and the destination exists. Defaults to false.
 *               example: "false"
 *             preserveTimestamp:
 *               type: boolean
 *               description: When true, the timestamp of the source file(s) will be preserved on the destination file(s). When false, timestamp behaviour is OS-dependent. Defaults to false.
 *               example: "false"
 *     responses:
 *       200:
 *         description: File copied.
 *         schema:
 *           type: object
 *           properties:
 *             fromFile:
 *               type: string
 *               description: Name of source file
 *               example: "subfolder/file1.qvd"
 *             toFile:
 *               type: string
 *               description: Name of destination file. Can be different from source file name, if needed
 *               example: "archive/file1_20200925.qvd"
 *             overwrite:
 *               type: boolean
 *               description: Controls whether destination file should be overwritten if it already exists. Note that the copy operation will silently fail if you set this to false and the destination exists. Defaults to false.
 *               example: "false"
 *             preserveTimestamp:
 *               type: boolean
 *               description: When true, the timestamp of the source file(s) will be preserved on the destination file(s). When false, timestamp behaviour is OS-dependent. Defaults to false.
 *               example: "false"
 *       400:
 *         description: fromFile not found.
 *       400:
 *         description: Required parameter missing.
 *       403:
 *         description: No approved fromDir/toDir for file move.
 *       500:
 *         description: Internal error, or file overwrite was not allowed.
 *
 */
async function handlerFileCopy(request, reply) {
    try {
        logRESTCall(request);

        let overwrite = false;
        let preserveTimestamp = false;

        if (request.body.fromFile == undefined || request.body.toFile == undefined || request.body.fromFile == '' || request.body.toFile == '') {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            if (request.body.overwrite == 'true') {
                overwrite = true;
            }

            if (request.body.preserveTimestamp == 'true') {
                preserveTimestamp = true;
            }

            // Make sure that
            // 1. fromFile is in a valid source directory (or subdirectory thereof),
            // 2. toFile is in a valid associated destination directory (or subdirectory thereof)

            let fromFile = path.normalize(request.body.fromFile),
                toFile = path.normalize(request.body.toFile);

            let fromDir = path.dirname(fromFile),
                toDir = path.dirname(toFile);

            let copyIsOk = false; // Only allow copy if this flag is true

            // Ensure fromFile exists
            if (await fs.pathExists(fromFile)) {
                globals.fileCopyDirectories.forEach(element => {
                    if (isDirectoryChildOf(fromDir, element.fromDir) && isDirectoryChildOf(toDir, element.toDir)) {
                        // The fromFile passed as parameter matches an approved fromDir specified in the config file
                        // AND
                        // toFile passed as parameter matches the associated approved toDir specified in the config file

                        copyIsOk = true;
                    }
                });

                if (copyIsOk) {
                    await fs.copySync(fromFile, toFile, { overwrite: overwrite, preserveTimestamps: preserveTimestamp });

                    reply
                        .code(200)
                        .send({ fromFile: fromFile, toFile: toFile, overwrite: overwrite, preserveTimestamp: preserveTimestamp });
                } else {
                    globals.logger.error(`FILECOPY: No approved fromDir/toDir for file copy ${request.body.fromFile} to ${request.body.toFile}`);
                    reply.send(httpErrors(403, 'No approved fromDir/toDir for file copy'));
                }
            } else {
                // fromFile does not exist
                globals.logger.error(`FILECOPY: From file ${request.body.fromFile} does not exist`);
                reply.send(400, 'fromFile does not exist');
            }
        }
    } catch (err) {
        globals.logger.error(`FILECOPY: Failed copying file ${request.body.fromFile} to ${request.body.toFile}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed copying file'));
    }
}



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
 *               example: "subfolder/file1.qvd"
 *             toFile:
 *               type: string
 *               description: Name of destination file. Can be different from source file name, if needed
 *               example: "archive/file1_20200925.qvd"
 *             overwrite:
 *               type: boolean
 *               description: Controls whether destination file should be overwritten if it already exists. Defaults to false.
 *               example: "false"
 *     responses:
 *       200:
 *         description: File moved.
 *         schema:
 *           type: object
 *           properties:
 *             fromFile:
 *               type: string
 *               description: Name of source file
 *               example: "subfolder/file1.qvd"
 *             toFile:
 *               type: string
 *               description: Name of destination file. Can be different from source file name, if needed
 *               example: "archive/file1_20200925.qvd"
 *             overwrite:
 *               type: boolean
 *               description: Controls whether destination file should be overwritten if it already exists. Defaults to false.
 *               example: "false"
 *       400:
 *         description: fromFile not found.
 *       400:
 *         description: Required parameter missing.
 *       403:
 *         description: No approved fromDir/toDir for file move.
 *       500:
 *         description: Internal error, or file overwrite was not allowed.
 *
 */
async function handlerFileMove(request, reply) {
    try {
        logRESTCall(request);

        let overwrite = false;

        if (request.body.fromFile == undefined || request.body.toFile == undefined || request.body.fromFile == '' || request.body.toFile == '') {
            // Required parameter is missing
            reply.send(new errors.MissingParameterError({}, 'Required parameter missing'));
        } else {
            if (request.body.overwrite == 'true') {
                overwrite = true;
            }

            // Make sure that
            // 1. fromFile is in a valid source directory (or subdirectory thereof),
            // 2. toFile is in a valid associated destination directory (or subdirectory thereof)

            let fromFile = path.normalize(request.body.fromFile),
                toFile = path.normalize(request.body.toFile);

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
                    await fs.moveSync(fromFile, toFile, { overwrite: overwrite });

                    reply
                        .code(200)
                        .send({ fromFile: fromFile, toFile: toFile, overwrite: overwrite });
                } else {
                    globals.logger.error(`FILEMOVE: No approved fromDir/toDir for file move ${request.body.fromFile} to ${request.body.toFile}`);
                    reply.send(httpErrors(403, 'No approved fromDir/toDir for file move'));
                }
            } else {
                // fromFile does not exist
                globals.logger.error(`FILEMOVE: From file ${request.body.fromFile} does not exist`);
                reply.send(httpErrors(400, 'fromFile does not exist'));
            }
        }
    } catch (err) {
        globals.logger.error(`FILEMOVE: Failed moving file ${request.body.fromFile} to ${request.body.toFile}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed moving file'));
    }
}


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
 *               example: "/data/qvdstore/sales/file1.qvd"
 *     responses:
 *       204:
 *         description: File deleted.
 *       400:
 *         description: File requested for delete not found.
 *       400:
 *         description: Required parameter missing.
 *       403:
 *         description: No approved directory matches the delete request.
 *       500:
 *         description: Internal error, or file delete was not allowed.
 *
 */
async function handlerFileDelete(request, reply) {
    try {
        logRESTCall(request);

        if (request.body.deleteFile == undefined || request.body.deleteFile == '') {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            // Make sure that
            // 1. file exists
            // 2. file is in a valid directoryv (or subdirectory thereof),

            let deleteFile = path.normalize(request.body.deleteFile),
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
                    await fs.removeSync(deleteFile);

                    reply
                        .code(204)
                        .send();
                } else {
                    // deleteFile does not exist
                    globals.logger.error(`FILEDELETE: Delete failed, file ${request.body.deleteFile} does not exist`);
                    reply.send(httpErrors(400, 'Delete failed, file does not exist'));
                }
            } else {
                globals.logger.error(`FILEDELETE: File delete request ${request.body.deleteFile} is not in any approved directories.`);
                reply.send(new errors.ForbiddenError({}, 'File delete request is not in any approved directories'));
            }
        }
    } catch (err) {
        globals.logger.error(`FILEDELETE: Failed deleting file ${request.body.deleteFile}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed deleting file'));
    }
}


/**
 * @swagger
 *
 * /v4/createdirqvd:
 *   post:
 *     description: |
 *       Creates a directory in QVD directory (which is defined in Butler's config file).
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: directory
 *         description: Path to directory that should be created. The created directory will always be relative to the QVD folder defined in the Butler config file..
 *         in: body
 *         schema:
 *           type: object
 *           properties:
 *             directory:
 *               type: string
 *               required: true
 *               description: Path to created directory.
 *               example: "subfolder/2020-10"
 *     responses:
 *       201:
 *         description: Directory created.
 *         schema:
 *           type: object
 *           properties:
 *             directory:
 *               type: string
 *               description: Path to created directory.
 *               example: "subfolder/2020-10"
 *
 *       400:
 *         description: Missing parameter.
 *       500:
 *         description: Internal error (file system permissions etc).
 *
 */
async function handlerCreateDirQvd(request, reply) {
    try {
        logRESTCall(request);

        // TODO: Add check to make sure the created dir is really a subpath of the QVD folder
        if (request.body.directory == undefined) {
            // Required parameter is missing
            reply.send(new errors.MissingParameterError({}, 'No path/directory specified'));
        } else {
            mkdirp(globals.qvdFolder + '/' + request.body.directory)
                .then(dir => globals.logger.verbose(`Created dir ${dir}`))

                .catch(function (error) {
                    globals.logger.error(`CREATEDIRQVD: ${JSON.stringify(error, null, 2)}`);
                    reply.send(httpErrors(500, 'Failed to create directory'));
                });

            reply
                .code(201)
                .send(request.body);
        }

    } catch (err) {
        globals.logger.error(`CREATEDIRQVD: Failed creating directory: ${request.body.directory}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed creating directory'));
    }
}


/**
 * @swagger
 *
 * /v4/createdir:
 *   post:
 *     description: |
 *       Creates a directory in file system.
 *       If the directory already exists nothing will happen.
 *       If permissions don't allow a directory to be created, or if the path is invalid, an error will be returned.
 *
 *       __WARNING: This method can create folders anywhere (where the account running Butler has permissions) in the filesystem.__
 *       Use with caution.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: body
 *         description:
 *         in: body
 *         schema:
 *           type: object
 *           required:
 *             - directory
 *           properties:
 *             directory:
 *               type: string
 *               description: Path to directory that should be created. Can be a relative or absolute path.
 *               example: "/Users/joe/data/qvds/2020"
 *     responses:
 *       201:
 *         description: Directory created.
 *         schema:
 *           type: object
 *           properties:
 *             directory:
 *               type: string
 *               description: Path to created directory.
 *               example: "/Users/joe/data/qvds/2020"
 *       400:
 *         description: Missing parameter.
 *       500:
 *         description: Internal error (file system permissions etc).
 *
 */
async function handlerCreateDir(request, reply) {
    try {
        logRESTCall(request);

        if (request.body.directory == undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            mkdirp(request.body.directory)
                .then(dir => globals.logger.verbose(`Created dir ${dir}`))

                .catch(function (error) {
                    globals.logger.error(`CREATEDIR: ${JSON.stringify(error, null, 2)}`);
                    reply.send(httpErrors(500, 'Failed to create directory'));
                });

            reply
                .code(201)
                .send(request.body);
        }
    } catch (err) {
        globals.logger.error(`CREATEDIR: Failed creating directory: ${request.body.directory}, error is: ${JSON.stringify(err, null, 2)}`);
        reply.send(httpErrors(500, 'Failed creating directory'));
    }
}
