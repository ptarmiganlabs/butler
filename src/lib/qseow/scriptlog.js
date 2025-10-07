/**
 * Script log retrieval module for Qlik Sense Enterprise on Windows (QSEOW).
 * 
 * This module provides functions to retrieve script logs from Qlik Sense reload tasks.
 * It implements a fallback mechanism to handle API changes:
 * 
 * 1. Primary method (deprecated in May 2025): Uses fileReferenceId
 *    - GET /qrs/reloadtask/{taskid}/scriptlog?fileReferenceId={fileReferenceId}
 *    - GET /qrs/download/reloadtask/{resultFromPreviousCall}/scriptlog.txt
 * 
 * 2. Fallback method (new in May 2025): Uses executionResultId
 *    - GET /qrs/ReloadTask/{taskid}/scriptlogfile?executionResultId={executionResultId}
 *    - GET /qrs/download/reloadtask/{resultFromPreviousCall}/{taskName}.log
 * 
 * The implementation tries the primary method first, and if it fails, automatically
 * falls back to the new method. This ensures compatibility with both old and new
 * versions of Qlik Sense.
 */

import QrsClient from '../qrs_client.js';
import axios from 'axios';
import https from 'https';
import { Duration, DateTime } from 'luxon';
import path from 'path';
import fs from 'fs';
import globals from '../../globals.js';

const taskStatusLookup = {
    0: 'NeverStarted',
    1: 'Triggered',
    2: 'Started',
    3: 'Queued',
    4: 'AbortInitiated',
    5: 'Aborting',
    6: 'Aborted',
    7: 'FinishedSuccess',
    8: 'FinishedFail',
    9: 'Skipped',
    10: 'Retry',
    11: 'Error',
    12: 'Reset',
};

/**
 * Compares two task detail objects based on their creation date.
 * Used for sorting task execution details in chronological order.
 * @param {Object} a - The first task detail object.
 * @param {string} a.detailCreatedDate - The creation date of the first task detail.
 * @param {Object} b - The second task detail object.
 * @param {string} b.detailCreatedDate - The creation date of the second task detail.
 * @returns {number} - Returns -1 if a is earlier than b, 1 if a is later than b, and 0 if they are equal.
 */
function compareTaskDetails(a, b) {
    if (a.detailCreatedDate < b.detailCreatedDate) {
        return -1;
    }
    if (a.detailCreatedDate > b.detailCreatedDate) {
        return 1;
    }
    return 0;
}

/**
 * Delays execution for a specified number of milliseconds.
 * @param {number} milliseconds - The number of milliseconds to delay.
 * @returns {Promise} - A promise that resolves after the specified delay.
 */
function delay(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

/**
 * Gets reload task execution results from the Qlik Sense QRS API.
 * Retrieves detailed information about the last execution of a reload task, including status, duration, and execution details.
 * @param {string} reloadTaskId - The GUID of the reload task.
 * @returns {Promise<Object|boolean>} - Returns an object containing task execution details (fileReferenceId, executionResultId, taskName, executingNodeName, executionDetailsSorted, executionDetailsConcatenated, executionStatusNum, executionStatusText, scriptLogSize, executionDuration, executionStartTime, executionStopTime), or false if an error occurs.
 */
export async function getReloadTaskExecutionResults(reloadTaskId) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: globals.config.get('Butler.configQRS.port'),
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        // Merge YAML-configured headers with hardcoded headers
        configQRS.headers = {
            ...globals.getQRSHttpHeaders(),
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsClient(configQRS);

        // Step 1
        globals.logger.debug(`[QSEOW] GET SCRIPT LOG 1: reloadTaskId: ${reloadTaskId}`);

        const result1 = await qrsInstance.Get(`reloadtask/${reloadTaskId}`);

        globals.logger.debug(`[QSEOW] GET SCRIPT LOG 1: body: ${JSON.stringify(result1.body)}`);

        const taskInfo = {
            fileReferenceId: result1.body.operational.lastExecutionResult.fileReferenceID,
            executionResultId: result1.body.operational.lastExecutionResult.id,
            taskName: result1.body.name,
            executingNodeName: result1.body.operational.lastExecutionResult.executingNodeName,
            executionDetailsSorted: result1.body.operational.lastExecutionResult.details.sort(compareTaskDetails),
            executionDetailsConcatenated: '',
            executionStatusNum: result1.body.operational.lastExecutionResult.status,
            executionStatusText: taskStatusLookup[result1.body.operational.lastExecutionResult.status],
            // scriptLogAvailable = result1.body.operational.lastExecutionResult.scriptLogAvailable,
            scriptLogSize: result1.body.operational.lastExecutionResult.scriptLogSize,
        };

        // Get execution details as a single string ny concatenating the individual execution step details
        for (const execDetail of taskInfo.executionDetailsSorted) {
            taskInfo.executionDetailsConcatenated = `${taskInfo.executionDetailsConcatenated + execDetail.detailCreatedDate}\t${
                execDetail.message
            }\n`;
        }

        // Add duration as JSON
        const taskDuration = Duration.fromMillis(result1.body.operational.lastExecutionResult.duration);
        taskInfo.executionDuration = taskDuration.shiftTo('hours', 'minutes', 'seconds').toObject();
        taskInfo.executionDuration.seconds = Math.floor(taskInfo.executionDuration.seconds);

        // Add start datetime in various formats
        if (result1.body.operational.lastExecutionResult.startTime.substring(0, 4) === '1753') {
            taskInfo.executionStartTime = {
                startTimeUTC: '-',
                startTimeLocal1: '-',
                startTimeLocal2: '-',
                startTimeLocal3: '-',
                startTimeLocal4: '-',
                startTimeLocal5: '-',
            };
        } else {
            const luxonDT = DateTime.fromISO(result1.body.operational.lastExecutionResult.startTime);
            taskInfo.executionStartTime = {
                startTimeUTC: result1.body.operational.lastExecutionResult.startTime,
                startTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                startTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
                startTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                startTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                startTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            };
        }

        // Add stop datetime in various formats
        if (result1.body.operational.lastExecutionResult.stopTime.substring(0, 4) === '1753') {
            taskInfo.executionStopTime = {
                stopTimeUTC: '-',
                stopTimeLocal1: '-',
                stopTimeLocal2: '-',
                stopTimeLocal3: '-',
                stopTimeLocal4: '-',
                stopTimeLocal5: '-',
            };
        } else {
            const luxonDT = DateTime.fromISO(result1.body.operational.lastExecutionResult.stopTime);
            taskInfo.executionStopTime = {
                stopTimeUTC: result1.body.operational.lastExecutionResult.stopTime,
                stopTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                stopTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
                stopTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                stopTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                stopTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            };
        }

        // Add various datetime formats to task history entries
        taskInfo.executionDetailsSorted = taskInfo.executionDetailsSorted.map((item) => {
            if (item.detailCreatedDate.substring(0, 4) === '1753') {
                return {
                    timestampUTC: '-',
                    timestampLocal1: '-',
                    timestampLocal2: '-',
                    timestampLocal3: '-',
                    timestampLocal4: '-',
                    timestampLocal5: '-',
                    message: item.message,
                    detailsType: item.detailsType,
                };
            }

            const luxonDT = DateTime.fromISO(item.detailCreatedDate);
            return {
                timestampUTC: item.detailCreatedDate,
                timestampLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                timestampLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
                timestampLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                timestampLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                timestampLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                message: item.message,
                detailsType: item.detailsType,
            };
        });

        return taskInfo;
    } catch (err) {
        globals.logger.error(`[QSEOW] GET SCRIPT LOG: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Downloads script log using the new API approach (2025-May QMC method).
 * Uses executionResultId instead of fileReferenceId.
 * @param {string} reloadTaskId - The GUID of the reload task.
 * @param {string} executionResultId - The execution result ID.
 * @param {string} taskName - The name of the task (used in download filename).
 * @param {Object} qrsInstance - QRS client instance.
 * @param {Object} httpsAgent - HTTPS agent for axios.
 * @returns {Promise<string|boolean>} - Returns script log text or false on error.
 */
async function getScriptLogWithExecutionResultId(reloadTaskId, executionResultId, taskName, qrsInstance, httpsAgent) {
    try {
        globals.logger.debug(
            `[QSEOW] GET SCRIPT LOG (NEW API): ReloadTask/${reloadTaskId}/scriptlogfile?executionResultId=${executionResultId}`,
        );

        // Step 1: Get script log file reference using new API
        const result2 = await qrsInstance.Get(`ReloadTask/${reloadTaskId}/scriptlogfile?executionResultId=${executionResultId}`);

        // Step 2: Download the script log file
        const httpHeaders = globals.getEngineHttpHeaders();
        httpHeaders['x-qlik-xrfkey'] = 'abcdefghijklmnop';

        const protocol = globals.configQRS.useSSL ? 'https' : 'http';

        // Encode task name for use in URL
        const taskNameEncoded = encodeURIComponent(taskName);

        const axiosConfig = {
            url: `/qrs/download/reloadtask/${result2.body.value}/${taskNameEncoded}.log?xrfkey=abcdefghijklmnop`,
            method: 'get',
            baseURL: `${protocol}://${globals.configQRS.host}:${globals.configQRS.port}`,
            headers: httpHeaders,
            timeout: 10000,
            responseType: 'text',
            httpsAgent,
        };

        const result3 = await axios.request(axiosConfig);
        return result3.data;
    } catch (err) {
        globals.logger.debug(`[QSEOW] GET SCRIPT LOG (NEW API): Failed - ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Gets reload task execution results and downloads the associated script log from the Qlik Sense QRS API.
 * Retrieves task execution details and the full script log, including head and tail portions based on specified line counts.
 * Implements retry logic with configurable attempts and delays to handle API timing issues.
 * First tries the deprecated API (fileReferenceId method), then falls back to the new API (executionResultId method) if that fails.
 * @param {string} reloadTaskId - The GUID of the reload task.
 * @param {number} headLineCount - The number of lines to include from the start of the script log. Set to 0 to exclude head.
 * @param {number} tailLineCount - The number of lines to include from the end of the script log. Set to 0 to exclude tail.
 * @param {number} [maxRetries=3] - Maximum number of retry attempts if script log retrieval fails.
 * @param {number} [retryDelayMs=2000] - Delay in milliseconds between retry attempts.
 * @returns {Promise<Object|boolean>} - Returns an object containing executingNodeName, executionDetails, executionDetailsConcatenated, executionDuration, executionStartTime, executionStopTime, executionStatusNum, executionStatusText, scriptLogFull (array), scriptLogSize, scriptLogSizeRows, scriptLogSizeCharacters, scriptLogHead, scriptLogHeadCount, scriptLogTail, scriptLogTailCount. Returns false if an error occurs.
 */
export async function getScriptLog(reloadTaskId, headLineCount, tailLineCount, maxRetries = 3, retryDelayMs = 2000) {
    let lastError;

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 1) {
                globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Retry attempt ${attempt} of ${maxRetries} for task ${reloadTaskId}`);
                await delay(retryDelayMs);
            } else {
                globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Initial attempt (${attempt} of ${maxRetries}) for task ${reloadTaskId}`);
            }

            // Step 1
            const taskInfo = await getReloadTaskExecutionResults(reloadTaskId);

            // Check if taskInfo retrieval failed
            if (!taskInfo) {
                throw new Error('Failed to get task execution results from QRS');
            }

            // Check if taskInfo retrieval failed
            if (!taskInfo) {
                throw new Error('Failed to get task execution results from QRS');
            }

            // Step 2
            // Set up Sense repository service configuration
            const configQRS = {
                hostname: globals.config.get('Butler.configQRS.host'),
                portNumber: globals.config.get('Butler.configQRS.port'),
                certificates: {
                    certFile: globals.configQRS.certPaths.certPath,
                    keyFile: globals.configQRS.certPaths.keyPath,
                },
            };

            // Merge YAML-configured headers with hardcoded headers
            configQRS.headers = {
                ...globals.getQRSHttpHeaders(),
                'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
            };

            const qrsInstance = new QrsClient(configQRS);

            // Set up HTTPS agent for axios calls
            const httpsAgent = new https.Agent({
                rejectUnauthorized: globals.config.get('Butler.configQRS.rejectUnauthorized'),
                cert: globals.configQRS.cert,
                key: globals.configQRS.key,
            });

            // Only get script log if there is a valid fileReferenceId or executionResultId
            globals.logger.debug(`[QSEOW] GET SCRIPT LOG 2: taskInfo.fileReferenceId: ${taskInfo.fileReferenceId}`);

            let scriptLogData = null;
            let apiMethod = null;

            if (taskInfo.fileReferenceId !== '00000000-0000-0000-0000-000000000000') {
                // Try the deprecated API first (fileReferenceId method)
                try {
                    globals.logger.debug(
                        `[QSEOW] GET SCRIPT LOG 3 (DEPRECATED API): reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${taskInfo.fileReferenceId}`,
                    );

                    const result2 = await qrsInstance.Get(
                        `reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${taskInfo.fileReferenceId}`,
                    );

                    // Use Axios for final call to QRS, as QRS-Interact has a bug that prevents downloading of script logs
                    const httpHeaders = globals.getEngineHttpHeaders();
                    httpHeaders['x-qlik-xrfkey'] = 'abcdefghijklmnop';

                    const protocol = globals.configQRS.useSSL ? 'https' : 'http';
                    const axiosConfig = {
                        url: `/qrs/download/reloadtask/${result2.body.value}/scriptlog.txt?xrfkey=abcdefghijklmnop`,
                        method: 'get',
                        baseURL: `${protocol}://${globals.configQRS.host}:${globals.configQRS.port}`,
                        headers: httpHeaders,
                        timeout: 10000,
                        responseType: 'text',
                        httpsAgent,
                    };

                    const result3 = await axios.request(axiosConfig);
                    scriptLogData = result3.data;
                    apiMethod = 'deprecated';
                    globals.logger.debug('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using deprecated API');
                } catch (err) {
                    globals.logger.warn(
                        `[QSEOW] GET SCRIPT LOG: Deprecated API failed - ${globals.getErrorMessage(err)}. Trying new API as fallback...`,
                    );

                    // Try the new API as fallback (executionResultId method)
                    if (taskInfo.executionResultId) {
                        // Get task name for the download URL
                        const taskName = taskInfo.taskName || `task_${reloadTaskId}`;

                        scriptLogData = await getScriptLogWithExecutionResultId(
                            reloadTaskId,
                            taskInfo.executionResultId,
                            taskName,
                            qrsInstance,
                            httpsAgent,
                        );

                        if (scriptLogData !== false) {
                            apiMethod = 'new';
                            globals.logger.debug('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using new API');
                        } else {
                            globals.logger.warn('[QSEOW] GET SCRIPT LOG: New API also failed');
                            // Both APIs failed, throw error to trigger retry or fail
                            throw new Error('Both deprecated and new API methods failed to retrieve script log');
                        }
                    } else {
                        globals.logger.warn('[QSEOW] GET SCRIPT LOG: No executionResultId available for fallback API');
                        // Rethrow the original error since we can't try fallback
                        throw err;
                    }
                }
            }

            // If we successfully retrieved the script log
            if (scriptLogData) {
                // Get complete script log as an array of lines
                const scriptLogFull = scriptLogData.split('\r\n');

                // Get total number of rows and characters in script log
                const scriptLogSizeCharacters = scriptLogData.length;
                const scriptLogSizeRows = scriptLogFull.length;

                // Get head and tail of script log
                let scriptLogHead = '';
                let scriptLogTail = '';

                if (headLineCount > 0) {
                    scriptLogHead = scriptLogFull.slice(0, headLineCount).join('\r\n');
                }

                if (tailLineCount > 0) {
                    scriptLogTail = scriptLogFull.slice(Math.max(scriptLogFull.length - tailLineCount, 0)).join('\r\n');
                }

                globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Script log head:\n${scriptLogHead}`);
                globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Script log tails:\n${scriptLogTail}`);

                globals.logger.verbose(`[QSEOW] GET SCRIPT LOG: Done getting script log (method: ${apiMethod})`);

                return {
                    executingNodeName: taskInfo.executingNodeName,
                    executionDetails: taskInfo.executionDetailsSorted,
                    executionDetailsConcatenated: taskInfo.executionDetailsConcatenated,
                    executionDuration: taskInfo.executionDuration,
                    executionStartTime: taskInfo.executionStartTime,
                    executionStopTime: taskInfo.executionStopTime,
                    executionStatusNum: taskInfo.executionStatusNum,
                    executionStatusText: taskInfo.executionStatusText,
                    scriptLogFull,
                    scriptLogSize: taskInfo.scriptLogSize,
                    scriptLogSizeRows: scriptLogSizeRows,
                    scriptLogSizeCharacters: scriptLogSizeCharacters,
                    scriptLogHead,
                    scriptLogHeadCount: headLineCount,
                    scriptLogTail,
                    scriptLogTailCount: tailLineCount,
                };
            }

            // No script log is available (fileReferenceId is all zeros or both APIs failed)
            // If this is not the last attempt, throw an error to trigger retry
            // (the script log might not be ready yet)
            if (attempt < maxRetries) {
                throw new Error('Script log not available yet or both API methods failed. Will retry...');
            }

            // On the last attempt, accept that no script log is available and return empty result
            globals.logger.verbose('[QSEOW] GET SCRIPT LOG: No script log available after all retry attempts');
            return {
                executingNodeName: taskInfo.executingNodeName,
                executionDetails: taskInfo.executionDetailsSorted,
                executionDetailsConcatenated: taskInfo.executionDetailsConcatenated,
                executionDuration: taskInfo.executionDuration,
                executionStartTime: taskInfo.executionStartTime,
                executionStopTime: taskInfo.executionStopTime,
                executionStatusNum: taskInfo.executionStatusNum,
                executionStatusText: taskInfo.executionStatusText,
                scriptLogFull: '',
                scriptLogSize: 0,
                scriptLogHead: '',
                scriptLogHeadCount: 0,
                scriptLogTail: '',
                scriptLogTailCount: 0,
            };
        } catch (err) {
            lastError = err;

            // Provide more context for HTTP errors
            if (err.response) {
                // The request was made and the server responded with a status code outside of 2xx
                globals.logger.warn(
                    `[QSEOW] GET SCRIPT LOG: Attempt ${attempt} failed with HTTP ${err.response.status}: ${globals.getErrorMessage(err)}`,
                );
            } else if (err.request) {
                // The request was made but no response was received
                globals.logger.warn(
                    `[QSEOW] GET SCRIPT LOG: Attempt ${attempt} failed - no response received: ${globals.getErrorMessage(err)}`,
                );
            } else {
                // Something happened in setting up the request that triggered an error
                globals.logger.warn(`[QSEOW] GET SCRIPT LOG: Attempt ${attempt} failed: ${globals.getErrorMessage(err)}`);
            }

            // If this was the last attempt, log as error and return false
            if (attempt === maxRetries) {
                globals.logger.error(
                    `[QSEOW] GET SCRIPT LOG: All ${maxRetries} attempts failed. Last error: ${globals.getErrorMessage(err)}`,
                );
                return false;
            }
        }
    }

    // This should never be reached, but just in case
    globals.logger.error(`[QSEOW] GET SCRIPT LOG: Unexpected end of retry loop. Last error: ${lastError}`);
    return false;
}

/**
 * Stores the script log of a failed reload task to disk.
 * Creates a directory structure based on the log date and saves the script log with a timestamped filename.
 * @param {Object} reloadParams - The parameters object containing reload task information.
 * @param {string} reloadParams.logTimeStamp - The timestamp for the log file.
 * @param {string} reloadParams.appId - The GUID of the Qlik Sense app.
 * @param {string} reloadParams.taskId - The GUID of the reload task.
 * @param {Object} reloadParams.scriptLog - The script log object from getScriptLog().
 * @param {Array<string>} reloadParams.scriptLog.scriptLogFull - Array of script log lines.
 * @returns {Promise<boolean>} - Returns true if the log is successfully stored on disk, false otherwise.
 */
export async function failedTaskStoreLogOnDisk(reloadParams) {
    try {
        // Get top level directory where logs should be stored
        const reloadLogDirRoot = globals.config.get('Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory');

        // Get misc script log info
        const { scriptLog } = reloadParams;

        // Handle case where scriptLog retrieval failed
        if (scriptLog === null || scriptLog === undefined) {
            globals.logger.warn(`[QSEOW] SCRIPTLOG STORE: Script log data is not available. Cannot store script log to disk.`);
            return false;
        }

        // Create directory for script log, if needed
        const logDate = reloadParams.logTimeStamp.slice(0, 10);
        const reloadLogDir = path.resolve(reloadLogDirRoot, logDate);

        globals.logger.debug(`[QSEOW] SCRIPTLOG STORE: Creating directory for failed task script log: ${reloadLogDir}`);
        fs.mkdirSync(reloadLogDir, { recursive: true });

        const fileName = path.resolve(
            reloadLogDir,
            `${reloadParams.logTimeStamp.slice(0, 19).replace(/ /g, '_').replace(/:/g, '-')}_appId=${reloadParams.appId}_taskId=${
                reloadParams.taskId
            }.log`,
        );

        globals.logger.info(`[QSEOW] SCRIPTLOG STORE: Writing failed task script log: ${fileName}`);

        // Do we have a script log to store?
        if (!scriptLog.scriptLogFull) {
            globals.logger.error(
                '[QSEOW] SCRIPTLOG STORE: A script log should be available, but it is not. Possibly because the QRS API did not return one.',
            );
            return false;
        } else if (scriptLog.scriptLogFull.length === 0) {
            globals.logger.error('[QSEOW] SCRIPTLOG STORE: A script log is available, but it is empty (zero rows in it).');
            return false;
        } else if (scriptLog.scriptLogFull.length < 10) {
            globals.logger.warn('[QSEOW] SCRIPTLOG STORE: A script log is available, but it is very short (less than 10 rows).');
        } else {
            globals.logger.verbose(`[QSEOW] SCRIPTLOG STORE: Script log is available and has ${scriptLog.scriptLogFull.length} rows.`);
        }

        fs.writeFileSync(fileName, scriptLog.scriptLogFull.join('\n'));
        return true;
    } catch (err) {
        globals.logger.error(`[QSEOW] SCRIPTLOG STORE: ${globals.getErrorMessage(err)}`);
        return false;
    }
}
