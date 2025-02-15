import QrsInteract from 'qrs-interact';
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
 * Compares two task details based on their creation date.
 * @param {Object} a - The first task detail.
 * @param {Object} b - The second task detail.
 * @returns {number} - Returns -1 if a is less than b, 1 if a is greater than b, and 0 if they are equal.
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

// eslint-disable-next-line no-unused-vars
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
 * Gets reload task execution results.
 * @param {string} reloadTaskId - The ID of the reload task.
 * @returns {Object|boolean} - Returns an object with task execution details or false if an error occurs.
 */
export async function getReloadTaskExecutionResults(reloadTaskId) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: 4242,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        configQRS.headers = {
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsInteract(configQRS);

        // Step 1
        globals.logger.debug(`[QSEOW] GET SCRIPT LOG 1: reloadTaskId: ${reloadTaskId}`);

        const result1 = await qrsInstance.Get(`reloadtask/${reloadTaskId}`);

        globals.logger.debug(`[QSEOW] GET SCRIPT LOG 1: body: ${JSON.stringify(result1.body)}`);

        const taskInfo = {
            fileReferenceId: result1.body.operational.lastExecutionResult.fileReferenceID,
            executingNodeName: result1.body.operational.lastExecutionResult.executingNodeName,
            executionDetailsSorted: result1.body.operational.lastExecutionResult.details.sort(compareTaskDetails),
            executionDetailsConcatenated: '',
            executionStatusNum: result1.body.operational.lastExecutionResult.status,
            executionStatusText: taskStatusLookup[result1.body.operational.lastExecutionResult.status],
            // scriptLogAvailable = result1.body.operational.lastExecutionResult.scriptLogAvailable,
            scriptLogSize: result1.body.operational.lastExecutionResult.scriptLogSize,
        };

        // Get execution details as a single string ny concatenating the individual execution step details
        // eslint-disable-next-line no-restricted-syntax
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
        globals.logger.error(`[QSEOW] GET SCRIPT LOG: ${err}`);
        return false;
    }
}

/**
 * Gets reload task execution results and script log.
 * @param {string} reloadTaskId - The ID of the reload task.
 * @param {number} headLineCount - The number of lines to include from the start of the script log.
 * @param {number} tailLineCount - The number of lines to include from the end of the script log.
 * @returns {Object|boolean} - Returns an object with task execution details and script log or false if an error occurs.
 */
export async function getScriptLog(reloadTaskId, headLineCount, tailLineCount) {
    try {
        // Step 1
        const taskInfo = await getReloadTaskExecutionResults(reloadTaskId);

        // Step 2
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: 4242,
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        configQRS.headers = {
            'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
        };

        const qrsInstance = new QrsInteract(configQRS);

        // Only get script log if there is a valid fileReferenceId
        globals.logger.debug(`[QSEOW] GET SCRIPT LOG 2: taskInfo.fileReferenceId: ${taskInfo.fileReferenceId}`);
        if (taskInfo.fileReferenceId !== '00000000-0000-0000-0000-000000000000') {
            globals.logger.debug(
                `[QSEOW] GET SCRIPT LOG 3: reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${taskInfo.fileReferenceId}`,
            );

            const result2 = await qrsInstance.Get(`reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${taskInfo.fileReferenceId}`);

            // Step 3
            // Use Axios for final call to QRS, as QRS-Interact has a bug that prevents downloading of script logs
            const httpsAgent = new https.Agent({
                rejectUnauthorized: globals.config.get('Butler.configQRS.rejectUnauthorized'),
                cert: globals.configQRS.cert,
                key: globals.configQRS.key,
            });

            // Get http headers from Butler config file
            const httpHeaders = globals.getEngineHttpHeaders();

            // Add x-qlik-xrfkey to headers
            httpHeaders['x-qlik-xrfkey'] = 'abcdefghijklmnop';

            const axiosConfig = {
                url: `/qrs/download/reloadtask/${result2.body.value}/scriptlog.txt?xrfkey=abcdefghijklmnop`,
                method: 'get',
                baseURL: `https://${globals.configQRS.host}:${globals.configQRS.port}`,
                headers: httpHeaders,
                timeout: 10000,
                responseType: 'text',
                httpsAgent,
                //   passphrase: "YYY"
            };

            const result3 = await axios.request(axiosConfig);

            // Get complete script log as an array of lines
            const scriptLogFull = result3.data.split('\r\n');

            // Get total number of rows and characters in script log
            const scriptLogSizeCharacters = result3.data.length;
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

            globals.logger.verbose('[QSEOW] GET SCRIPT LOG: Done getting script log');

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
        // No script log is available
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
        globals.logger.error(`[QSEOW] GET SCRIPT LOG: ${err}`);
        return false;
    }
}

/**
 * Stores the script log of a failed task on disk.
 * @param {Object} reloadParams - The parameters of the reload task.
 * @returns {boolean} - Returns true if the log is successfully stored, false otherwise.
 */
export async function failedTaskStoreLogOnDisk(reloadParams) {
    try {
        // Get top level directory where logs should be stored
        const reloadLogDirRoot = globals.config.get('Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.logDirectory');

        // Get misc script log info
        const { scriptLog } = reloadParams;

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
        globals.logger.error(`[QSEOW] SCRIPTLOG STORE: ${err}`);
        return false;
    }
}
