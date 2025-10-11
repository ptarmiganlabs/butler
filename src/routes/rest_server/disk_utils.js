import httpErrors from 'http-errors';
import fs from 'fs-extra';
import upath from 'upath';
import { mkdirp } from 'mkdirp';
import isUncPath from 'is-unc-path';

// Load global variables and functions
import globals from '../../globals.js';

import { logRESTCall } from '../../lib/log_rest_call.js';
import isDirectoryChildOf from '../../lib/disk_utils.js';
import { apiFileCopy, apiFileMove, apiFileDelete, apiCreateDir, apiCreateDirQvd } from '../../api/disk_utils.js';

/**
 * Handles the PUT request to copy a file.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerFileCopy(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures fromFile and toFile are present and non-empty
        const overwrite = request.body.overwrite ?? false;
        const preserveTimestamp = request.body.preserveTimestamp ?? false;

        // Check if Butler is running on Linux-ish host and UNC path(s) are specified
        // Warn if so, then return error
        if (globals.hostInfo.si.os.platform.toLowerCase() !== 'windows') {
            if (isUncPath(request.body.fromFile) === true) {
                globals.logger.warn(
                    `FILE COPY FROM: UNC paths not supported work on non-Windows OSs ("${request.body.fromFile}"). OS is "${globals.hostInfo.si.os.platform}".`,
                );
                reply.send(
                    httpErrors(
                        400,
                        `UNC paths not supported for file copy operations when running Butler on non-Windows OS. Path: ${request.body.fromFile}`,
                    ),
                );
            }
            if (isUncPath(request.body.toFile) === true) {
                globals.logger.warn(
                    `FILE COPY TO: UNC paths not supported on non-Windows OSs ("${request.body.toFile}"). OS is "${globals.hostInfo.si.os.platform}".`,
                );
                reply.send(
                    httpErrors(
                        400,
                        `UNC paths not supported for file copy operations when running Butler on non-Windows OS. Path: ${request.body.toFile}`,
                    ),
                );
            }
        }

        // Make sure that
        // 1. fromFile is in a valid source directory (or subdirectory thereof),
        // 2. toFile is in a valid associated destination directory (or subdirectory thereof)

        const fromFile = upath.normalizeSafe(request.body.fromFile);
        const toFile = upath.normalizeSafe(request.body.toFile);

        const fromDir = upath.dirname(fromFile);
        const toDir = upath.dirname(toFile);

        let copyIsOk = false; // Only allow copy if this flag is true

        // Ensure fromFile exists
        if (await fs.pathExists(fromFile)) {
            // eslint-disable-next-line no-restricted-syntax
            for (const approvedCopyDir of globals.fileCopyDirectories) {
                if (isDirectoryChildOf(fromDir, approvedCopyDir.fromDir) && isDirectoryChildOf(toDir, approvedCopyDir.toDir)) {
                    // The fromFile passed as parameter matches an approved fromDir specified in the config file
                    // AND
                    // toFile passed as parameter matches the associated approved toDir specified in the config file
                    copyIsOk = true;
                }
            }

            if (copyIsOk) {
                globals.logger.debug(
                    `FILECOPY: About to copy file from ${fromFile} to ${toFile}, overwrite=${overwrite}, preserve timestamp=${preserveTimestamp}`,
                );

                await fs.copySync(fromFile, toFile, {
                    overwrite,
                    preserveTimestamps: preserveTimestamp,
                });

                globals.logger.verbose(
                    `FILECOPY: Copied file from ${fromFile} to ${toFile}, overwrite=${overwrite}, preserve timestamp=${preserveTimestamp}`,
                );

                reply.code(201).send({
                    fromFile,
                    toFile,
                    overwrite,
                    preserveTimestamp,
                });
            } else {
                globals.logger.error(
                    `FILECOPY: No approved fromDir/toDir for file copy ${request.body.fromFile} to ${request.body.toFile}`,
                );
                reply.send(httpErrors(403, 'No approved fromDir/toDir for file copy'));
            }
        } else {
            // fromFile does not exist
            globals.logger.error(`FILECOPY: From file ${request.body.fromFile} does not exist`);
            reply.send(400, 'fromFile does not exist');
        }
    } catch (err) {
        globals.logger.error(
            `FILECOPY: Failed copying file ${request.body.fromFile} to ${request.body.toFile}, error is: ${JSON.stringify(err, null, 2)}`,
        );
        reply.send(httpErrors(500, 'Failed copying file'));
    }
}

/**
 * Handles the PUT request to move a file.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerFileMove(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures fromFile and toFile are present and non-empty
        const overwrite = request.body.overwrite ?? false;

        // Check if Butler is running on Linux-ish host and UNC path(s) are specified
        // Warn if so, then return error
        if (globals.hostInfo.si.os.platform.toLowerCase() !== 'windows') {
            if (isUncPath(request.body.fromFile) === true) {
                globals.logger.warn(
                    `FILE MOVE FROM: UNC paths not supported work on non-Windows OSs ("${request.body.fromFile}"). OS is "${globals.hostInfo.si.os.platform}".`,
                );
                reply.send(
                    httpErrors(
                        400,
                        `UNC paths not supported for file move operations when running Butler on non-Windows OS. Path: ${request.body.fromFile}`,
                    ),
                );
            }
            if (isUncPath(request.body.toFile) === true) {
                globals.logger.warn(
                    `FILE MOVE TO: UNC paths not supported on non-Windows OSs ("${request.body.toFile}"). OS is "${globals.hostInfo.si.os.platform}".`,
                );
                reply.send(
                    httpErrors(
                        400,
                        `UNC paths not supported for file move operations when running Butler on non-Windows OS. Path: ${request.body.toFile}`,
                    ),
                );
            }
        }

        // Make sure that
        // 1. fromFile is in a valid source directory (or subdirectory thereof),
        // 2. toFile is in a valid associated destination directory (or subdirectory thereof)

        const fromFile = upath.normalizeSafe(request.body.fromFile);
        const toFile = upath.normalizeSafe(request.body.toFile);

        const fromDir = upath.dirname(fromFile);
        const toDir = upath.dirname(toFile);

        let moveIsOk = false; // Only allow move if this flag is true

        // Ensure fromFile exists
        if (await fs.pathExists(fromFile)) {
            // eslint-disable-next-line no-restricted-syntax
            for (const approvedMoveDir of globals.fileMoveDirectories) {
                if (isDirectoryChildOf(fromDir, approvedMoveDir.fromDir) && isDirectoryChildOf(toDir, approvedMoveDir.toDir)) {
                    // The fromFile passed as parameter matches an approved fromDir specified in the config file
                    // AND
                    // toFile passed as parameter matches the associated approved toDir specified in the config file
                    moveIsOk = true;
                }
            }

            if (moveIsOk) {
                globals.logger.debug(`FILEMOVE: About to move file from ${fromFile} to ${toFile}, overwrite flag=${overwrite}`);
                await fs.moveSync(fromFile, toFile, { overwrite });
                globals.logger.verbose(`FILEMOVE: Moved file from ${fromFile} to ${toFile}, overwrite flag=${overwrite}`);

                reply.code(201).send({ fromFile, toFile, overwrite });
            } else {
                globals.logger.error(
                    `FILEMOVE: No approved fromDir/toDir for file move ${request.body.fromFile} to ${request.body.toFile}`,
                );
                reply.send(httpErrors(403, 'No approved fromDir/toDir for file move'));
            }
        } else {
            // fromFile does not exist
            globals.logger.error(`FILEMOVE: From file ${request.body.fromFile} does not exist`);
            reply.send(httpErrors(400, 'fromFile does not exist'));
        }
    } catch (err) {
        globals.logger.error(
            `FILEMOVE: Failed moving file ${request.body.fromFile} to ${request.body.toFile}: ${globals.getErrorMessage(err)}`,
        );
        reply.send(httpErrors(500, 'Failed moving file'));
    }
}

/**
 * Handles the DELETE request to delete a file.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerFileDelete(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures deleteFile is present and non-empty

        // Check if Butler is running on Linux-ish host and UNC path(s) are specified
        // Warn if so, then return error
        if (globals.hostInfo.si.os.platform.toLowerCase() !== 'windows') {
            if (isUncPath(request.body.deleteFile) === true) {
                globals.logger.warn(
                    `FILE DELETE: UNC paths not supported work on non-Windows OSs ("${request.body.deleteFile}"). OS is "${globals.hostInfo.si.os.platform}".`,
                );
                reply.send(
                    httpErrors(
                        400,
                        `UNC paths not supported for file copy operations when running Butler on non-Windows OS. Path: ${request.body.deleteFile}`,
                    ),
                );

                return;
            }
        }

        // Make sure that
        // 1. file exists
        // 2. file is in a valid directoryv (or subdirectory thereof),

        const deleteFile = upath.normalizeSafe(request.body.deleteFile);
        const deleteDir = upath.dirname(deleteFile);

        let deleteIsOk = false; // Only allow delete if this flag is true

        // Ensure the file to be deleted is in an approved directory hierarchy
        // eslint-disable-next-line no-restricted-syntax
        for (const approvedDeleteDir of globals.fileDeleteDirectories) {
            if (isDirectoryChildOf(deleteDir, approvedDeleteDir)) {
                // The deleteFile passed as parameter matches an approved directory specified in the config file
                deleteIsOk = true;
            }
        }

        if (deleteIsOk) {
            // Finally, make sure that file really exists
            if (await fs.pathExists(deleteFile)) {
                // Delete!
                globals.logger.debug(`FILEDELETE: About to delete file ${deleteFile}`);
                await fs.removeSync(deleteFile);
                globals.logger.verbose(`FILEDELETE: Deleted file ${deleteFile}`);

                reply.code(204).send();
            } else {
                // deleteFile does not exist
                globals.logger.error(`FILEDELETE: Delete failed, file ${request.body.deleteFile} does not exist`);
                reply.send(httpErrors(400, 'Delete failed, file does not exist'));
            }
        } else {
            globals.logger.error(`FILEDELETE: File delete request ${request.body.deleteFile} is not in any approved directories.`);
            reply.send(httpErrors(403, 'No approved directory for file delete'));
        }
    } catch (err) {
        globals.logger.error(`FILEDELETE: Failed deleting file ${request.body.deleteFile}: ${globals.getErrorMessage(err)}`);
        reply.send(httpErrors(500, 'Failed deleting file'));
    }
}

/**
 * Handles the POST request to create a QVD directory.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerCreateDirQvd(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures directory is present and non-empty
        // TODO: Add check to make sure the created dir is really a subpath of the QVD folder
        globals.logger.debug(`CREATEDIRQVD: About to create QVD directory ${globals.qvdFolder}/${request.body.directory}`);

        mkdirp(`${globals.qvdFolder}/${request.body.directory}`)
            .then((dir) => globals.logger.verbose(`CREATEDIRQVD: Created QVD directory ${dir}`))

            .catch((error) => {
                globals.logger.error(`CREATEDIRQVD: ${globals.getErrorMessage(err)}`);
                reply.send(httpErrors(500, 'Failed to create directory'));
            });

        reply.code(201).send(request.body);
    } catch (err) {
        globals.logger.error(`CREATEDIRQVD: Failed creating directory: ${request.body.directory}: ${globals.getErrorMessage(err)}`);
        reply.send(httpErrors(500, 'Failed creating directory'));
    }
}

/**
 * Handles the PUT request to create a directory.
 * @param {Object} request - The request object.
 * @param {Object} reply - The reply object.
 */
async function handlerCreateDir(request, reply) {
    try {
        logRESTCall(request);

        // Fastify schema validation ensures directory is present and non-empty
        globals.logger.debug(`CREATEDIR: About to create directory ${request.body.directory}`);

        mkdirp(request.body.directory)
            .then((dir) => globals.logger.verbose(`CREATEDIR: Created directory ${dir}`))

            .catch((error) => {
                globals.logger.error(`CREATEDIR: ${globals.getErrorMessage(err)}`);
                reply.send(httpErrors(500, 'Failed to create directory'));
            });

        reply.code(201).send(request.body);
    } catch (err) {
        globals.logger.error(`CREATEDIR: Failed creating directory: ${request.body.directory}: ${globals.getErrorMessage(err)}`);
        reply.send(httpErrors(500, 'Failed creating directory'));
    }
}

/**
 * Registers the REST endpoints for disk utility operations.
 * @param {Object} fastify - The Fastify instance.
 * @param {Object} options - The options object.
 */
// eslint-disable-next-line no-unused-vars
export default async (fastify, options) => {
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
