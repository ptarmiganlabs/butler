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
import https from 'https';
import path from 'path';
import fs from 'fs';
import globals from '../../globals.js';
import { getReloadTaskExecutionResults } from '../../qrs_util/reload_task_execution_results.js';
import { MAX_RETRY_ATTEMPTS, RETRY_DELAY_MS, DOWNLOAD_DELAY_MS } from '../../constants.js';

/**
 * Force API method for testing purposes.
 * Set to 'deprecated' to force use of the old fileReferenceId API.
 * Set to 'new' to force use of the new executionResultId API.
 * Set to null (default) to use automatic fallback logic.
 * @type {'deprecated'|'new'|null}
 */
// const FORCE_API_METHOD = 'new';
const FORCE_API_METHOD = null;

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
 * Downloads script log using the deprecated API approach (pre-May 2025 method).
 * Uses fileReferenceId for retrieval.
 * @param {string} reloadTaskId - The GUID of the reload task.
 * @param {string} fileReferenceId - The file reference ID.
 * @param {Object} qrsInstance - QRS client instance.
 * @param {number} [downloadDelayMs=DOWNLOAD_DELAY_MS] - Delay in milliseconds before downloading the script log.
 * @returns {Promise<string|boolean>} - Returns script log text or false on error.
 */
async function getScriptLogWithFileReferenceId(reloadTaskId, fileReferenceId, qrsInstance, downloadDelayMs = DOWNLOAD_DELAY_MS) {
    try {
        globals.logger.debug(
            `[QSEOW] GET SCRIPT LOG (DEPRECATED API): reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${fileReferenceId}`,
        );

        // Step 1: Get script log file reference using deprecated API
        const endpoint = `reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${fileReferenceId}`;
        globals.logger.verbose(`[QSEOW] GET SCRIPT LOG (DEPRECATED API): Calling QRS endpoint: GET /qrs/${endpoint}`);
        const result2 = await qrsInstance.Get(endpoint);

        // Wait before downloading the script log to avoid 404 errors
        if (downloadDelayMs > 0) {
            await delay(downloadDelayMs);
        }

        // Step 2: Download the script log file
        const endpoint3 = `download/reloadtask/${result2.body.value}/scriptlog.txt`;
        const result3 = await qrsInstance.Get(endpoint3);

        // If result3.statusCode is 200, the script log is available in result3.body with \r\n line endings
        // If result3.statusCode is 404, the script log is not available

        if (result3.statusCode !== 200) {
            result3.body = false;
        }

        return result3.body;
    } catch (err) {
        globals.logger.warn(`[QSEOW] GET SCRIPT LOG (DEPRECATED API): Failed - ${globals.getErrorMessage(err)}`);
        return false;
    }
}

/**
 * Downloads script log using the new API approach (2025-May QMC method).
 * Uses executionResultId instead of fileReferenceId.
 * @param {string} reloadTaskId - The GUID of the reload task.
 * @param {string} executionResultId - The execution result ID.
 * @param {Object} qrsInstance - QRS client instance.
 * @param {number} [downloadDelayMs=500] - Delay in milliseconds before downloading the script log.
 * @returns {Promise<string|boolean>} - Returns script log text or false on error.
 */
async function getScriptLogWithExecutionResultId(reloadTaskId, executionResultId, qrsInstance, downloadDelayMs = DOWNLOAD_DELAY_MS) {
    try {
        globals.logger.debug(
            `[QSEOW] GET SCRIPT LOG (NEW API): ReloadTask/${reloadTaskId}/scriptlogfile?executionResultId=${executionResultId}`,
        );

        // Step 1: Get script log file reference using new API
        const endpoint = `reloadtask/${reloadTaskId}/scriptlogfile?executionResultId=${executionResultId}`;
        globals.logger.verbose(`[QSEOW] GET SCRIPT LOG (NEW API): Calling QRS endpoint: GET /qrs/${endpoint}`);
        const result2 = await qrsInstance.Get(endpoint);

        // Wait before downloading the script log to avoid 404 errors
        if (downloadDelayMs > 0) {
            await delay(downloadDelayMs);
        }

        // Step 2: Download the script log file
        const endpoint3 = `download/reloadtask/${result2.body.value}/scriptlog.txt`;
        const result3 = await qrsInstance.Get(endpoint3);

        // If result3.statusCode is 200, the script log is available in result3.body with \r\n line endings
        // If result3.statusCode is 404, the script log is not available

        if (result3.statusCode !== 200) {
            result3.body = false;
        }

        return result3.body;
    } catch (err) {
        globals.logger.warn(`[QSEOW] GET SCRIPT LOG (NEW API): Failed - ${globals.getErrorMessage(err)}`);
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
 * @param {number} [maxRetries=MAX_RETRY_ATTEMPTS] - Maximum number of retry attempts if script log retrieval fails.
 * @param {number} [retryDelayMs=RETRY_DELAY_MS] - Delay in milliseconds between retry attempts.
 * @param {number} [downloadDelayMs=DOWNLOAD_DELAY_MS] - Delay in milliseconds before downloading the script log (set to 0 to disable).
 * @returns {Promise<Object|boolean>} - Returns an object containing executingNodeName, executionDetails, executionDetailsConcatenated, executionDuration, executionStartTime, executionStopTime, executionStatusNum, executionStatusText, scriptLogFull (array), scriptLogSize, scriptLogSizeRows, scriptLogSizeCharacters, scriptLogHead, scriptLogHeadCount, scriptLogTail, scriptLogTailCount. Returns false if an error occurs.
 */
export async function getScriptLog(
    reloadTaskId,
    headLineCount,
    tailLineCount,
    maxRetries = MAX_RETRY_ATTEMPTS,
    retryDelayMs = RETRY_DELAY_MS,
    downloadDelayMs = DOWNLOAD_DELAY_MS,
) {
    let lastError;
    let preferredApiMethod = FORCE_API_METHOD; // Initialize with forced method if set

    // Retry loop
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 1) {
                globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Retry attempt ${attempt} of ${maxRetries} for task ${reloadTaskId}`);
                await delay(retryDelayMs);
            } else {
                globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Initial attempt (${attempt} of ${maxRetries}) for task ${reloadTaskId}`);
                if (FORCE_API_METHOD) {
                    globals.logger.debug(
                        `[QSEOW] GET SCRIPT LOG: FORCE_API_METHOD is set to '${FORCE_API_METHOD}' - overriding fallback logic`,
                    );
                }
            }

            // Step 1
            const taskInfo = await getReloadTaskExecutionResults(reloadTaskId);

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
                // If FORCE_API_METHOD is set, use it exclusively
                if (FORCE_API_METHOD === 'new') {
                    globals.logger.debug('[QSEOW] GET SCRIPT LOG: Forced to use new API method');
                    if (!taskInfo.executionResultId) {
                        throw new Error('Forced to use new API but executionResultId is not available');
                    }
                    scriptLogData = await getScriptLogWithExecutionResultId(
                        reloadTaskId,
                        taskInfo.executionResultId,
                        qrsInstance,
                        downloadDelayMs,
                    );
                    if (scriptLogData !== false) {
                        apiMethod = 'new';
                    } else {
                        throw new Error('Forced new API method failed');
                    }
                } else if (FORCE_API_METHOD === 'deprecated') {
                    globals.logger.debug('[QSEOW] GET SCRIPT LOG: Forced to use deprecated API method');
                    scriptLogData = await getScriptLogWithFileReferenceId(
                        reloadTaskId,
                        taskInfo.fileReferenceId,
                        qrsInstance,
                        downloadDelayMs,
                    );
                    if (scriptLogData !== false) {
                        apiMethod = 'deprecated';
                    } else {
                        throw new Error('Forced deprecated API method failed');
                    }
                } else if (preferredApiMethod === 'new' && taskInfo.executionResultId) {
                    globals.logger.debug('[QSEOW] GET SCRIPT LOG: Using previously successful new API method');
                    scriptLogData = await getScriptLogWithExecutionResultId(
                        reloadTaskId,
                        taskInfo.executionResultId,
                        qrsInstance,
                        downloadDelayMs,
                    );
                    if (scriptLogData !== false) {
                        apiMethod = 'new';
                    } else {
                        throw new Error('New API method failed on retry');
                    }
                } else {
                    // Try the deprecated API first (or if it's our preferred method)
                    scriptLogData = await getScriptLogWithFileReferenceId(
                        reloadTaskId,
                        taskInfo.fileReferenceId,
                        qrsInstance,
                        downloadDelayMs,
                    );

                    if (scriptLogData !== false) {
                        apiMethod = 'deprecated';
                        if (!FORCE_API_METHOD) {
                            preferredApiMethod = 'deprecated'; // Remember this worked (only if not forcing)
                        }
                        globals.logger.debug('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using deprecated API');
                    } else {
                        globals.logger.warn('[QSEOW] GET SCRIPT LOG: Deprecated API failed. Trying new API as fallback...');

                        // Try the new API as fallback (executionResultId method)
                        if (taskInfo.executionResultId) {
                            scriptLogData = await getScriptLogWithExecutionResultId(
                                reloadTaskId,
                                taskInfo.executionResultId,
                                qrsInstance,
                                downloadDelayMs,
                            );

                            if (scriptLogData !== false) {
                                apiMethod = 'new';
                                if (!FORCE_API_METHOD) {
                                    preferredApiMethod = 'new'; // Remember this worked (only if not forcing)
                                }
                                globals.logger.debug('[QSEOW] GET SCRIPT LOG: Successfully retrieved script log using new API');
                            } else {
                                globals.logger.warn('[QSEOW] GET SCRIPT LOG: New API also failed');
                                throw new Error('Both deprecated and new API methods failed to retrieve script log');
                            }
                        } else {
                            globals.logger.warn('[QSEOW] GET SCRIPT LOG: No executionResultId available for fallback API');
                            throw new Error('Deprecated API failed and no executionResultId available for fallback');
                        }
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
                    globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Script log head:\n${scriptLogHead}`);
                }

                if (tailLineCount > 0) {
                    scriptLogTail = scriptLogFull.slice(Math.max(scriptLogFull.length - tailLineCount, 0)).join('\r\n');
                    globals.logger.debug(`[QSEOW] GET SCRIPT LOG: Script log tail:\n${scriptLogTail}`);
                }

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

// Re-export getReloadTaskExecutionResults for backward compatibility
export { getReloadTaskExecutionResults };
