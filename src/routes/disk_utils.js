const httpErrors = require('http-errors');
const fs = require('fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { isDirectoryChildOf } = require('../lib/disk_utils');
const { apiFileCopy, apiFileMove, apiFileDelete, apiCreateDir, apiCreateDirQvd } = require('../api/disk_utils');

async function handlerFileCopy(request, reply) {
    try {
        logRESTCall(request);

        let overwrite = false;
        let preserveTimestamp = false;

        if (
            request.body.fromFile === undefined ||
            request.body.toFile === undefined ||
            request.body.fromFile === '' ||
            request.body.toFile === ''
        ) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            if (request.body.overwrite === 'true' || request.body.overwrite === true) {
                overwrite = true;
            }

            if (request.body.preserveTimestamp === 'true' || request.body.preserveTimestamp === true) {
                preserveTimestamp = true;
            }

            // Make sure that
            // 1. fromFile is in a valid source directory (or subdirectory thereof),
            // 2. toFile is in a valid associated destination directory (or subdirectory thereof)

            const fromFile = path.normalize(request.body.fromFile);
            const toFile = path.normalize(request.body.toFile);

            const fromDir = path.dirname(fromFile);
            const toDir = path.dirname(toFile);

            let copyIsOk = false; // Only allow copy if this flag is true

            // Ensure fromFile exists
            if (await fs.pathExists(fromFile)) {
                globals.fileCopyDirectories.forEach((element) => {
                    if (isDirectoryChildOf(fromDir, element.fromDir) && isDirectoryChildOf(toDir, element.toDir)) {
                        // The fromFile passed as parameter matches an approved fromDir specified in the config file
                        // AND
                        // toFile passed as parameter matches the associated approved toDir specified in the config file

                        copyIsOk = true;
                    }
                });

                if (copyIsOk) {
                    await fs.copySync(fromFile, toFile, {
                        overwrite,
                        preserveTimestamps: preserveTimestamp,
                    });

                    reply.code(201).send({
                        fromFile,
                        toFile,
                        overwrite,
                        preserveTimestamp,
                    });
                } else {
                    globals.logger.error(
                        `FILECOPY: No approved fromDir/toDir for file copy ${request.body.fromFile} to ${request.body.toFile}`
                    );
                    reply.send(httpErrors(403, 'No approved fromDir/toDir for file copy'));
                }
            } else {
                // fromFile does not exist
                globals.logger.error(`FILECOPY: From file ${request.body.fromFile} does not exist`);
                reply.send(400, 'fromFile does not exist');
            }
        }
    } catch (err) {
        globals.logger.error(
            `FILECOPY: Failed copying file ${request.body.fromFile} to ${
                request.body.toFile
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed copying file'));
    }
}

async function handlerFileMove(request, reply) {
    try {
        logRESTCall(request);

        let overwrite = false;

        if (
            request.body.fromFile === undefined ||
            request.body.toFile === undefined ||
            request.body.fromFile === '' ||
            request.body.toFile === ''
        ) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            if (request.body.overwrite === 'true' || request.body.overwrite === true) {
                overwrite = true;
            }

            // Make sure that
            // 1. fromFile is in a valid source directory (or subdirectory thereof),
            // 2. toFile is in a valid associated destination directory (or subdirectory thereof)

            const fromFile = path.normalize(request.body.fromFile);
            const toFile = path.normalize(request.body.toFile);

            const fromDir = path.dirname(fromFile);
            const toDir = path.dirname(toFile);

            let moveIsOk = false; // Only allow move if this flag is true

            // Ensure fromFile exists
            if (await fs.pathExists(fromFile)) {
                globals.fileMoveDirectories.forEach((element) => {
                    if (isDirectoryChildOf(fromDir, element.fromDir) && isDirectoryChildOf(toDir, element.toDir)) {
                        // The fromFile passed as parameter matches an approved fromDir specified in the config file
                        // AND
                        // toFile passed as parameter matches the associated approved toDir specified in the config file

                        moveIsOk = true;
                    }
                });

                if (moveIsOk) {
                    await fs.moveSync(fromFile, toFile, { overwrite });

                    reply.code(201).send({ fromFile, toFile, overwrite });
                } else {
                    globals.logger.error(
                        `FILEMOVE: No approved fromDir/toDir for file move ${request.body.fromFile} to ${request.body.toFile}`
                    );
                    reply.send(httpErrors(403, 'No approved fromDir/toDir for file move'));
                }
            } else {
                // fromFile does not exist
                globals.logger.error(`FILEMOVE: From file ${request.body.fromFile} does not exist`);
                reply.send(httpErrors(400, 'fromFile does not exist'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `FILEMOVE: Failed moving file ${request.body.fromFile} to ${
                request.body.toFile
            }, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed moving file'));
    }
}

async function handlerFileDelete(request, reply) {
    try {
        logRESTCall(request);

        if (request.body.deleteFile === undefined || request.body.deleteFile === '') {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            // Make sure that
            // 1. file exists
            // 2. file is in a valid directoryv (or subdirectory thereof),

            const deleteFile = path.normalize(request.body.deleteFile);
            const deleteDir = path.dirname(deleteFile);

            let deleteIsOk = false; // Only allow delete if this flag is true

            // Ensure the file to be deleted is in an approved directory hierarchy
            globals.fileDeleteDirectories.forEach((element) => {
                if (isDirectoryChildOf(deleteDir, element)) {
                    // The deleteFile passed as parameter matches an approved directory specified in the config file

                    deleteIsOk = true;
                }
            });

            if (deleteIsOk) {
                if (await fs.pathExists(deleteFile)) {
                    // Finally, make sure that file realy exists
                    await fs.removeSync(deleteFile);

                    reply.code(204).send();
                } else {
                    // deleteFile does not exist
                    globals.logger.error(`FILEDELETE: Delete failed, file ${request.body.deleteFile} does not exist`);
                    reply.send(httpErrors(400, 'Delete failed, file does not exist'));
                }
            } else {
                globals.logger.error(
                    `FILEDELETE: File delete request ${request.body.deleteFile} is not in any approved directories.`
                );
                reply.send(httpErrors(403, 'No approved fromDir/toDir for file move'));
            }
        }
    } catch (err) {
        globals.logger.error(
            `FILEDELETE: Failed deleting file ${request.body.deleteFile}, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed deleting file'));
    }
}

async function handlerCreateDirQvd(request, reply) {
    try {
        logRESTCall(request);

        // TODO: Add check to make sure the created dir is really a subpath of the QVD folder
        if (request.body.directory === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            mkdirp(`${globals.qvdFolder}/${request.body.directory}`)
                .then((dir) => globals.logger.verbose(`Created dir ${dir}`))

                .catch((error) => {
                    globals.logger.error(`CREATEDIRQVD: ${JSON.stringify(error, null, 2)}`);
                    reply.send(httpErrors(500, 'Failed to create directory'));
                });

            reply.code(201).send(request.body);
        }
    } catch (err) {
        globals.logger.error(
            `CREATEDIRQVD: Failed creating directory: ${request.body.directory}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed creating directory'));
    }
}

async function handlerCreateDir(request, reply) {
    try {
        logRESTCall(request);

        if (request.body.directory === undefined) {
            // Required parameter is missing
            reply.send(httpErrors(400, 'Required parameter missing'));
        } else {
            mkdirp(request.body.directory)
                .then((dir) => globals.logger.verbose(`Created dir ${dir}`))

                .catch((error) => {
                    globals.logger.error(`CREATEDIR: ${JSON.stringify(error, null, 2)}`);
                    reply.send(httpErrors(500, 'Failed to create directory'));
                });

            reply.code(201).send(request.body);
        }
    } catch (err) {
        globals.logger.error(
            `CREATEDIR: Failed creating directory: ${request.body.directory}, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed creating directory'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.fileCopy') &&
        globals.config.get('Butler.restServerEndpointsEnable.fileCopy')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/filecopy');
        fastify.put('/v4/filecopy', apiFileCopy, handlerFileCopy);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.fileMove') &&
        globals.config.get('Butler.restServerEndpointsEnable.fileMove')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/filemove');
        fastify.put('/v4/filemove', apiFileMove, handlerFileMove);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.fileDelete') &&
        globals.config.get('Butler.restServerEndpointsEnable.fileDelete')
    ) {
        globals.logger.debug('Registering REST endpoint DELETE /v4/filedelete');
        fastify.delete('/v4/filedelete', apiFileDelete, handlerFileDelete);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.createDirQVD') &&
        globals.config.get('Butler.restServerEndpointsEnable.createDirQVD')
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/createdirqvd');
        fastify.post('/v4/createdirqvd', apiCreateDirQvd, handlerCreateDirQvd);
    }

    if (
        globals.config.has('Butler.restServerEndpointsEnable.createDir') &&
        globals.config.get('Butler.restServerEndpointsEnable.createDir')
    ) {
        globals.logger.debug('Registering REST endpoint PUT /v4/createdir');
        fastify.post('/v4/createdir', apiCreateDir, handlerCreateDir);
    }
};
